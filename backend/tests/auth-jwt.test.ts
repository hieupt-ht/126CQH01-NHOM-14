import assert from "node:assert/strict";
import { test } from "node:test";
import { SignJWT } from "jose";
import { issueAccessToken, verifyAccessToken } from "../src/modules/auth/auth.js";

const secret = "isolated-unit-test-secret-at-least-32-bytes-long";
const now = Date.now();

test("JWT signing and verification enforce HS256 claims and expiry", async () => {
  const expiresAt = new Date(now + 60_000);
  const token = await issueAccessToken(
    { jwtSecret: secret },
    "user-id-test",
    "random-jti-test",
    expiresAt,
  );
  assert.deepEqual(await verifyAccessToken({ jwtSecret: secret }, token), {
    userId: "user-id-test",
    tokenId: "random-jti-test",
  });
  await assert.rejects(verifyAccessToken({ jwtSecret: "wrong-key-at-least-32-bytes-long" }, token));
});

test("JWT verifier rejects expired, wrong-issuer, wrong-audience and missing-identity claims", async () => {
  const key = Buffer.from(secret);
  const signed = (builder: SignJWT) => builder
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setSubject("user-id-test")
    .setJti("random-jti-test");
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
    .setJti("random-jti-test")
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(key);
  const missingExpiry = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("flux-studio-api")
    .setAudience("flux-studio-web")
    .setSubject("user-id-test")
    .setJti("random-jti-test")
    .setIssuedAt()
    .sign(key);
  const wrongAlgorithm = await new SignJWT({})
    .setProtectedHeader({ alg: "HS384", typ: "JWT" })
    .setIssuer("flux-studio-api")
    .setAudience("flux-studio-web")
    .setSubject("user-id-test")
    .setJti("random-jti-test")
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(key);
  for (const token of [expired, wrongIssuer, wrongAudience, missingSubject, missingExpiry, wrongAlgorithm]) {
    await assert.rejects(verifyAccessToken({ jwtSecret: secret }, token));
  }
});
