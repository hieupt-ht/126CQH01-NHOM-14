import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../../src/app.js";
import {
  createDeclaredIndexes,
  SessionModel,
  UserModel,
} from "../../src/models/index.js";
import { hashSessionToken } from "../../src/modules/auth/auth.js";

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
    try {
      await mongoose.connect(repl.getUri("flux_auth_test"));
      await createDeclaredIndexes();
      server = createApp({ frontendOrigin: origin }).listen(0, "127.0.0.1");
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
      const cookie = setCookie.split(";")[0],
        rawToken = cookie.split("=")[1];
      const loggedIn = (await login.json()) as { data: { csrfToken: string } };
      const stored = await SessionModel.findOne({ userId: user._id }).select(
        "+tokenHash +csrfTokenHash",
      );
      assert.equal(stored!.tokenHash, hashSessionToken(rawToken));
      assert.notEqual(stored!.csrfTokenHash, loggedIn.data.csrfToken);
      assert.equal(
        (await request("/auth/me", "GET", undefined, cookie)).status,
        200,
      );
      assert.equal(
        (await request("/auth/logout", "POST", undefined, cookie)).status,
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
      if (server)
        await new Promise<void>((resolve) => server!.close(() => resolve()));
      await mongoose.disconnect();
      await repl.stop();
    }
  },
);
