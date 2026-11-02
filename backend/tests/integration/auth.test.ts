import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import mongoose from "mongoose";
import { jwtVerify } from "jose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../../src/app.js";
import {
  createDeclaredIndexes,
  SessionModel,
  UserModel,
} from "../../src/models/index.js";
import { hashJwtId } from "../../src/modules/auth/auth.js";

test(
  "real isolated MongoDB: auth, csrf, expiry, ownership boundary and logout",
  { timeout: 180000 },
  async () => {
    const repl = await MongoMemoryReplSet.create({
      binary: { version: "8.2.6" },
      replSet: { count: 1 },
      instanceOpts: [{ storageEngine: "wiredTiger" }],
    });
    const origin = "http://localhost:5173";
    let server: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined;
    let concurrentServer: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined;
    let limitsServer: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined;
    try {
      await mongoose.connect(repl.getUri("flux_auth_test"));
      await createDeclaredIndexes();
      const jwtSecret = "integration-test-secret-do-not-use-outside-tests-0123456789";
      server = createApp({ frontendOrigin: origin, jwtSecret, sessionCookieSecure: true }).listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const base = "http://127.0.0.1:" + address.port + "/api/v1";
      const request = (
        path: string,
        method = "GET",
        body?: unknown,
        cookie?: string,
        csrf?: string,
      ) =>
        fetch(base + path, {
          method,
          headers: {
            Origin: origin,
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
            ...(csrf ? { "X-CSRF-Token": csrf } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
      assert.equal((await request("/auth/me")).status, 401);
      assert.equal(
        (await fetch(base + "/auth/login", { method: "POST" })).status,
        403,
      );
      const account = {
        displayName: "User test",
        email: "Person@Example.test",
        password: "correct-password-123",
      };
      for (const invalidAccount of [
        { ...account, displayName: " " },
        { ...account, displayName: "x".repeat(81) },
        { ...account, email: "not-an-email" },
        { ...account, password: "short" },
      ]) {
        assert.equal((await request("/auth/register", "POST", invalidAccount)).status, 400);
      }
      assert.equal(
        (await fetch(base + "/auth/register", {
          method: "POST",
          headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" },
          body: JSON.stringify(account),
        })).status,
        403,
      );
      const registered = await request("/auth/register", "POST", account);
      assert.equal(registered.status, 201);
      assert.doesNotMatch(
        await registered.text(),
        /passwordHash|correct-password/,
      );
      const user = await UserModel.findOne({
        email: "person@example.test",
      }).select("+passwordHash");
      assert.ok(user);
      assert.match(user.passwordHash, /^\$argon2id\$/);
      assert.equal(
        (await request("/auth/register", "POST", account)).status,
        409,
      );
      concurrentServer = createApp({ frontendOrigin: origin, jwtSecret }).listen(0, "127.0.0.1");
      await once(concurrentServer, "listening");
      const concurrentAddress = concurrentServer.address();
      assert.ok(concurrentAddress && typeof concurrentAddress !== "string");
      const concurrentRegistration = () => fetch(
        `http://127.0.0.1:${concurrentAddress.port}/api/v1/auth/register`,
        {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: JSON.stringify({ ...account, email: "race@example.test" }),
        },
      );
      const concurrentResponses = await Promise.all([
        concurrentRegistration(),
        concurrentRegistration(),
      ]);
      assert.deepEqual(concurrentResponses.map((response) => response.status).sort(), [201, 409]);
      await new Promise<void>((resolve) => concurrentServer!.close(() => resolve()));
      concurrentServer = undefined;
      limitsServer = createApp({ frontendOrigin: origin, jwtSecret }).listen(0, "127.0.0.1");
      await once(limitsServer, "listening");
      const limitsAddress = limitsServer.address();
      assert.ok(limitsAddress && typeof limitsAddress !== "string");
      const limitsBase = `http://127.0.0.1:${limitsAddress.port}/api/v1/auth`;
      const genericFailure = await fetch(`${limitsBase}/login`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ email: "missing@example.test", password: account.password }),
      });
      assert.equal(genericFailure.status, 401);
      const genericFailureBody = await genericFailure.json() as { error: { code: string; message: string } };
      assert.equal(genericFailureBody.error.code, "INVALID_CREDENTIALS");
      const loginAttempts = await Promise.all(Array.from({ length: 9 }, () => fetch(`${limitsBase}/login`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ email: "missing@example.test", password: account.password }),
      })));
      assert.ok(loginAttempts.every((response) => response.status === 401));
      const limitedLogin = await fetch(`${limitsBase}/login`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ email: "missing@example.test", password: account.password }),
      });
      assert.equal(limitedLogin.status, 429);
      assert.ok(limitedLogin.headers.get("retry-after"));
      await new Promise<void>((resolve) => limitsServer!.close(() => resolve()));
      limitsServer = createApp({ frontendOrigin: origin, jwtSecret }).listen(0, "127.0.0.1");
      await once(limitsServer, "listening");
      const registerLimitAddress = limitsServer.address();
      assert.ok(registerLimitAddress && typeof registerLimitAddress !== "string");
      const registerLimitUrl = `http://127.0.0.1:${registerLimitAddress.port}/api/v1/auth/register`;
      const registerAttempts = await Promise.all(Array.from({ length: 10 }, () => fetch(registerLimitUrl, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: "{}",
      })));
      assert.ok(registerAttempts.every((response) => response.status === 400));
      assert.equal((await fetch(registerLimitUrl, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: "{}",
      })).status, 429);
      await new Promise<void>((resolve) => limitsServer!.close(() => resolve()));
      limitsServer = undefined;
      assert.equal(
        (
          await request("/auth/login", "POST", {
            email: account.email,
            password: "wrong-password-123",
          })
        ).status,
        401,
      );
      const login = await request("/auth/login", "POST", {
        email: account.email,
        password: account.password,
      });
      assert.equal(login.status, 200);
      const setCookie = login.headers.get("set-cookie")!;
      assert.match(setCookie, /HttpOnly/);
      assert.match(setCookie, /SameSite=Lax/);
      assert.match(setCookie, /Secure/);
      const cookie = setCookie.split(";")[0],
        rawToken = cookie.split("=")[1];
      const { payload, protectedHeader } = await jwtVerify(rawToken, Buffer.from(jwtSecret), {
        algorithms: ["HS256"],
        issuer: "flux-studio-api",
        audience: "flux-studio-web",
      });
      assert.equal(protectedHeader.typ, "JWT");
      assert.equal(typeof payload.sub, "string");
      assert.equal(typeof payload.jti, "string");
      const loggedIn = (await login.json()) as { data: { csrfToken: string } };
      assert.equal(JSON.stringify(loggedIn).includes(rawToken), false);
      const stored = await SessionModel.findOne({ userId: user._id }).select(
        "+tokenHash +csrfTokenHash",
      );
      assert.equal(stored!.tokenHash, hashJwtId(String(payload.jti)));
      assert.notEqual(stored!.csrfTokenHash, loggedIn.data.csrfToken);
      assert.equal(
        (await request("/auth/me", "GET", undefined, cookie)).status,
        200,
      );
      await UserModel.updateOne({ _id: user._id }, { $set: { status: "disabled" } });
      assert.equal((await request("/auth/me", "GET", undefined, cookie)).status, 401);
      assert.equal((await request("/auth/login", "POST", {
        email: account.email,
        password: account.password,
      })).status, 401);
      await UserModel.updateOne({ _id: user._id }, { $set: { status: "active" } });
      const [header, payloadSegment] = rawToken.split(".");
      const tamperedToken = header + "." + payloadSegment + "." + Buffer.alloc(32, 0).toString("base64url");
      assert.equal(
        (await request("/auth/me", "GET", undefined, "flux_session=" + tamperedToken)).status,
        401,
      );
      assert.equal(
        (await request("/auth/logout", "POST", undefined, cookie)).status,
        403,
      );
      assert.equal(
        (await request("/auth/logout", "POST", undefined, cookie, "invalid-csrf-token")).status,
        403,
      );
      const refreshed = (await (
        await request("/auth/csrf", "GET", undefined, cookie)
      ).json()) as { data: { csrfToken: string } };
      const refreshedAgain = (await (
        await request("/auth/csrf", "GET", undefined, cookie)
      ).json()) as { data: { csrfToken: string } };
      assert.equal(refreshed.data.csrfToken, loggedIn.data.csrfToken);
      assert.equal(refreshedAgain.data.csrfToken, loggedIn.data.csrfToken);
      const unconfigured = await request(
        "/generations",
        "POST",
        { prompt: "test" },
        cookie,
        loggedIn.data.csrfToken,
      );
      assert.equal(unconfigured.status, 400); // missing Idempotency-Key is rejected before configuration check

      assert.equal(
        (
          await request(
            "/auth/logout",
            "POST",
            undefined,
            cookie,
            loggedIn.data.csrfToken,
          )
        ).status,
        204,
      );
      assert.equal(
        (await request("/auth/me", "GET", undefined, cookie)).status,
        401,
      );
      const nextLogin = await request("/auth/login", "POST", {
        email: account.email,
        password: account.password,
      });
      const nextCookie = nextLogin.headers.get("set-cookie")!.split(";")[0];
      await SessionModel.updateMany(
        { userId: user._id },
        { $set: { expiresAt: new Date(0) } },
      );
      assert.equal(
        (await request("/auth/me", "GET", undefined, nextCookie)).status,
        401,
      );
    } finally {
      if (limitsServer)
        await new Promise<void>((resolve) => limitsServer!.close(() => resolve()));
      if (concurrentServer)
        await new Promise<void>((resolve) => concurrentServer!.close(() => resolve()));
      if (server)
        await new Promise<void>((resolve) => server!.close(() => resolve()));
      await mongoose.disconnect();
      await repl.stop();
    }
  },
);
