import assert from "node:assert/strict";
import { test } from "node:test";
import { CloudflareProvider } from "../src/providers/cloudflare.js";
import { AppError } from "../src/errors/app-error.js";
import {
  CloudflarePromptTranslator,
  containsVietnameseText,
} from "../src/providers/prompt-translation.js";
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
  const base = { MONGODB_URI: "mongodb://127.0.0.1:27027/flux_config_test", JWT_SECRET: "test-only-secret-do-not-use-outside-tests-0123456789" };
  assert.equal(validateEnv(base).generationEnabled, false);
  assert.equal(validateEnv(base).promptTranslationEnabled, false);
  assert.throws(
    () => validateEnv({ ...base, NODE_ENV: "production", PROMPT_TRANSLATION_ENABLED: "true" }),
    EnvironmentValidationError,
  );
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

test("prompt translation preserves Vietnamese text at the adapter boundary and returns English", async () => {
  const source = "Một con mèo cam ngồi cạnh cửa sổ, không có người.";
  const translated = "An orange cat sits beside a window, with no people.";
  let count = 0;
  const translator = new CloudflarePromptTranslator(
    "test-account",
    "test-token",
    async (url, init) => {
      count++;
      assert.match(String(url), /@cf\/meta\/m2m100-1\.2b$/);
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        text: source,
        source_lang: "vietnamese",
        target_lang: "english",
      });
      assert.ok(init?.signal);
      return new Response(JSON.stringify({ success: true, result: { translated_text: translated } }));
    },
  );
  assert.equal(await translator.translateVietnameseToEnglish(source), translated);
  assert.equal(count, 1);
  assert.equal(containsVietnameseText(source), true);
  assert.equal(containsVietnameseText("A quiet English landscape"), false);
  assert.equal(containsVietnameseText("A cat ngồi beside a window"), true);
  // Input methods can send decomposed Unicode; detection must not mutate input.
  assert.equal(containsVietnameseText("cây táo".normalize("NFD")), true);
});

test("translation rejects unsuccessful, empty and malformed provider results", async () => {
  for (const payload of [
    { success: false, result: { translated_text: "Unrelated output" } },
    { success: true, result: { translated_text: "   " } },
    { success: true, result: { translated_text: 123 } },
    { success: true, result: null },
  ]) {
    let calls = 0;
    const translator = new CloudflarePromptTranslator("a", "b", async () => {
      calls++;
      return new Response(JSON.stringify(payload));
    });
    await assert.rejects(translator.translateVietnameseToEnglish("cây táo"),
      (error: unknown) => error instanceof AppError && error.code === "GENERATION_FAILED");
    assert.equal(calls, 1);
  }
});

test("explicit watercolor request gets reference-approved medium details without another provider call", async () => {
  const original = "Tạo cho tôi hình ảnh ngôi nhà , có cái cây táo bên cạnh, và con người dắt chú chó đi dạo biết hình ảnh tạo ra với phong cách màu nước";
  const droppedStyle = "Create me a picture of the house, there is an apple tree next to it, and man leads the dog for a walk.";
  for (const source of [original, original.normalize("NFD"), "Tranh màu nước về ngôi nhà."]) {
    let calls = 0;
    const translator = new CloudflarePromptTranslator("a", "b", async (_url, init) => {
      calls++;
      assert.equal(JSON.parse(String(init?.body)).text, source);
      return new Response(JSON.stringify({ success: true, result: { translated_text: droppedStyle } }));
    });
    const result = await translator.translateVietnameseToEnglish(source);
    assert.match(result, /^Hand-painted watercolor illustration on textured watercolor paper/);
    assert.match(result, /translucent washes of pigment, soft bleeding edges, visible brush strokes/);
    assert.ok(result.endsWith(droppedStyle));
    assert.equal(calls, 1);
  }
});

test("watercolor guard does not invent styles from negatives, quotations or ordinary water", async () => {
  for (const source of [
    "Ngôi nhà, không dùng phong cách màu nước.",
    "Đừng vẽ tranh màu nước. Vẽ bằng sơn dầu.",
    "Ngôi nhà với phong cách màu nước hoặc sơn dầu.",
    'Một tấm bảng ghi chữ "phong cách màu nước".',
    "Người đọc sách về phong cách màu nước.",
    "Một cốc nước màu xanh đặt cạnh ngôi nhà.",
    "Một ngôi nhà chụp chân thực.",
  ]) {
    const translator = new CloudflarePromptTranslator("a", "b", async () =>
      new Response(JSON.stringify({ result: { translated_text: "Mock faithful translation." } })));
    assert.equal(await translator.translateVietnameseToEnglish(source), "Mock faithful translation.");
  }
  for (const translation of ["A watercolor house.", "A watercolour house.", "A water-color house."]) {
    const translator = new CloudflarePromptTranslator("a", "b", async () =>
      new Response(JSON.stringify({ result: { translated_text: translation } })));
    const result = await translator.translateVietnameseToEnglish("Tranh màu nước về ngôi nhà.");
    assert.match(result, /^Hand-painted watercolor illustration/);
    assert.ok(result.endsWith(translation));
  }
});

test("restoring omitted style still enforces the submitted prompt length limit", async () => {
  const translator = new CloudflarePromptTranslator("a", "b", async () =>
    new Response(JSON.stringify({ result: { translated_text: "x".repeat(2040) } })));
  await assert.rejects(translator.translateVietnameseToEnglish("Tranh màu nước về ngôi nhà."),
    (error: unknown) => error instanceof AppError && error.code === "INVALID_PROMPT");
});

test("translation adapter forwards English, mixed, multiline, long and constraint-heavy prompt inputs exactly", async () => {
  const prompts = [
    "A quiet English landscape at sunrise.",
    "Một cô gái in a yellow coat đứng bên trái cây cầu.",
    "Câu một: hai con chim xanh bay sang phải.\nCâu hai: không có người hoặc chữ.",
    "Một ngôi làng nhỏ dưới chân núi, " + "mái nhà đỏ và cửa sổ xanh, ".repeat(55),
    "Không thêm người. Chính xác ba bông hoa tím ở bên phải chiếc bình trắng.",
  ];
  for (const prompt of prompts) {
    let calls = 0;
    const translator = new CloudflarePromptTranslator("test-account", "test-token", async (_url, init) => {
      calls++;
      assert.equal(JSON.parse(String(init?.body)).text, prompt);
      return new Response(JSON.stringify({ result: { translated_text: "Mock English translation." } }));
    });
    assert.equal(await translator.translateVietnameseToEnglish(prompt), "Mock English translation.");
    assert.equal(calls, 1);
  }
});

test("translation errors, timeouts and oversized output fail closed without retries", async () => {
  let calls = 0;
  const failed = new CloudflarePromptTranslator("a", "b", async () => {
    calls++;
    return new Response("provider error", { status: 503 });
  });
  await assert.rejects(
    failed.translateVietnameseToEnglish("một con mèo"),
    (error: unknown) => error instanceof AppError && error.code === "GENERATION_FAILED",
  );
  assert.equal(calls, 1);

  calls = 0;
  const timeout = new CloudflarePromptTranslator("a", "b", async (_url, init) => {
    calls++;
    assert.ok(init?.signal);
    throw new DOMException("aborted", "TimeoutError");
  });
  await assert.rejects(
    timeout.translateVietnameseToEnglish("một con mèo"),
    (error: unknown) => error instanceof AppError && error.code === "GENERATION_FAILED",
  );
  assert.equal(calls, 1);

  const oversized = new CloudflarePromptTranslator(
    "a",
    "b",
    async () => new Response(JSON.stringify({ result: { translated_text: "x".repeat(2049) } })),
  );
  await assert.rejects(
    oversized.translateVietnameseToEnglish("một con mèo"),
    (error: unknown) => error instanceof AppError && error.code === "INVALID_PROMPT",
  );
});
