import assert from "node:assert/strict";
import { test } from "node:test";
import { CloudflareProvider } from "../src/providers/cloudflare.js";
import { AppError } from "../src/errors/app-error.js";
import { validateEnv, EnvironmentValidationError } from "../src/config/env.js";
test("Cloudflare boundary sends one prompt, default steps and decodes documented response", async () => {
  let count = 0;
  const provider = new CloudflareProvider(
    "test-account",
    "test-token",
    async (url, init) => {
      count++;
      assert.match(String(url), /flux-1-schnell$/);
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        prompt: "mèo cam",
        steps: 4,
      });
      assert.ok(init?.signal);
      return new Response(
        JSON.stringify({
          success: true,
          result: { image: Buffer.from("test-image-bytes").toString("base64") },
        }),
      );
    },
  );
  assert.equal(
    (await provider.generate("mèo cam")).toString(),
    "test-image-bytes",
  );
  assert.equal(count, 1);
});
test("Cloudflare quota, server errors and network uncertainty never retry inference", async () => {
  for (const status of [429, 503, 400]) {
    let calls = 0;
    const provider = new CloudflareProvider("a", "b", async () => {
      calls++;
      return new Response("provider error", { status });
    });
    await assert.rejects(
      provider.generate("prompt"),
      (error: unknown) =>
        error instanceof AppError &&
        error.code ===
          (status === 429
            ? "PROVIDER_QUOTA_EXCEEDED"
            : status === 503
              ? "RESULT_UNCERTAIN"
              : "GENERATION_FAILED"),
    );
    assert.equal(calls, 1);
  }
  let calls = 0;
  await assert.rejects(
    new CloudflareProvider("a", "b", async () => {
      calls++;
      throw new Error("timeout");
    }).generate("prompt"),
  );
  assert.equal(calls, 1);
});
test("generation disabled by default and config rejects insecure or incomplete setup", () => {
  const base = { MONGODB_URI: "mongodb://127.0.0.1:27027/flux_config_test" };
  assert.equal(validateEnv(base).generationEnabled, false);
  assert.throws(
    () => validateEnv({ ...base, GENERATION_ENABLED: "true" }),
    EnvironmentValidationError,
  );
  assert.throws(
    () => validateEnv({ ...base, SESSION_COOKIE_NAME: "unsafe; name" }),
    EnvironmentValidationError,
  );
  assert.throws(
    () =>
      validateEnv({
        ...base,
        NODE_ENV: "production",
        SESSION_COOKIE_SECURE: "false",
      }),
    EnvironmentValidationError,
  );
});
