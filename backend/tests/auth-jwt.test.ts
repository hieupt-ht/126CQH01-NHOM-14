import assert from "node:assert/strict";
import { test } from "node:test";
import { SignJWT } from "jose";
import {
  issueAccessToken,
  parseInput,
  registrationSchema,
  verifyAccessToken,
} from "../src/modules/auth/auth.js";

const secret = "isolated-unit-test-secret-at-least-32-bytes-long";
const now = Date.now();

test("JWT signing and verification enforce HS256 claims and expiry", async () => {
  const expiresAt = new Date(now + 60_000);
  const token = await issueAccessToken(
    { jwtSecret: secret },
    "507f1f77bcf86cd799439011",
    "a".repeat(64),
    expiresAt,
  );
  assert.deepEqual(await verifyAccessToken({ jwtSecret: secret }, token), {
    userId: "507f1f77bcf86cd799439011",
    tokenId: "a".repeat(64),
  });
  await assert.rejects(verifyAccessToken({ jwtSecret: "wrong-key-at-least-32-bytes-long" }, token));
});

test("JWT verifier rejects expired, wrong-issuer, wrong-audience and missing-identity claims", async () => {
  const key = Buffer.from(secret);
  const signed = (builder: SignJWT) => builder
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setSubject("507f1f77bcf86cd799439011")
    .setJti("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  const make = (builder: SignJWT) => signed(builder);
  const expired = await make(new SignJWT({}))
    .setIssuer("flux-studio-api")
    .setAudience("flux-studio-web")
    .setExpirationTime(Math.floor(now / 1000) - 10)
    .sign(key);
  const wrongIssuer = await make(new SignJWT({}))
    .setIssuer("other-api")
    .setAudience("flux-studio-web")
    .setExpirationTime("1m")
    .sign(key);
  const wrongAudience = await make(new SignJWT({}))
    .setIssuer("flux-studio-api")
    .setAudience("other-web")
    .setExpirationTime("1m")
    .sign(key);
  const missingSubject = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("flux-studio-api")
    .setAudience("flux-studio-web")
    .setJti("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(key);
  const missingExpiry = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("flux-studio-api")
    .setAudience("flux-studio-web")
    .setSubject("507f1f77bcf86cd799439011")
    .setJti("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    .setIssuedAt()
    .sign(key);
  const wrongAlgorithm = await new SignJWT({})
    .setProtectedHeader({ alg: "HS384", typ: "JWT" })
    .setIssuer("flux-studio-api")
    .setAudience("flux-studio-web")
    .setSubject("507f1f77bcf86cd799439011")
    .setJti("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(key);
  for (const token of [expired, wrongIssuer, wrongAudience, missingSubject, missingExpiry, wrongAlgorithm]) {
    await assert.rejects(verifyAccessToken({ jwtSecret: secret }, token));
  }
});

test("JWT verifier rejects malformed identity and jti claims", async () => {
  const key = Buffer.from(secret);
  const make = (subject: string, tokenId: string) =>
    new SignJWT({})
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("flux-studio-api")
      .setAudience("flux-studio-web")
      .setSubject(subject)
      .setJti(tokenId)
      .setIssuedAt()
      .setExpirationTime("1m")
      .sign(key);

  await assert.rejects(
    verifyAccessToken({ jwtSecret: secret }, await make("user-id-test", "a".repeat(64))),
  );
  await assert.rejects(
    verifyAccessToken({ jwtSecret: secret }, await make("507f1f77bcf86cd799439011", "not-a-jti")),
  );
  const unsignedHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const unsignedPayload = Buffer.from(JSON.stringify({
    iss: "flux-studio-api",
    aud: "flux-studio-web",
    sub: "507f1f77bcf86cd799439011",
    jti: "a".repeat(64),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60,
  })).toString("base64url");
  await assert.rejects(
    verifyAccessToken({ jwtSecret: secret }, `${unsignedHeader}.${unsignedPayload}.`),
  );
});

test("registration boundary normalizes email and display name without trimming password", () => {
  const parsed = parseInput(registrationSchema, {
    displayName: "  Linh Nguyen  ",
    email: " Person@Example.test ",
    password: "  secret-pass  ",
  });
  assert.deepEqual(parsed, {
    displayName: "Linh Nguyen",
    email: "person@example.test",
    password: "  secret-pass  ",
  });
  assert.throws(() => parseInput(registrationSchema, {
    displayName: "Linh",
    email: "person@example.test",
    password: "short",
  }));
});
