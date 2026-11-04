import assert from "node:assert/strict";
import { test } from "node:test";
import { CloudflarePromptTranslator } from "../src/providers/prompt-translation.js";
import { protectPromptTerms } from "../src/providers/prompt-terms.js";
import { AppError } from "../src/errors/app-error.js";

const source = "tạo giúp tôi một cậu bé đang cưỡi trên con trâu Việt Nam và thổi sáo trên 1 cánh đồng lúa chín";
const tokens = (text: string) => text.match(/FLUXTERM[A-F0-9]{8}X\d+END/g) ?? [];

test("M2M100 receives protected meaning units and exactly one translation request", async () => {
  let calls = 0;
  const translator = new CloudflarePromptTranslator("account", "token", async (url, init) => {
    calls++; assert.match(String(url), /m2m100-1\.2b$/);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.source_lang, "vietnamese"); assert.equal(body.target_lang, "english");
    const parts = tokens(body.text); assert.equal(parts.length, 3);
    assert.doesNotMatch(body.text, /con trâu|thổi sáo|lúa chín/);
    return new Response(JSON.stringify({ success: true, result: {
      translated_text: `A boy is ${parts[0]} in Vietnam while ${parts[1]} in one ${parts[2]}.`,
    } }));
  });
  const translated = await translator.translateVietnameseToEnglish(source);
  assert.equal(translated, "A boy is riding a water buffalo in Vietnam while playing a flute in one field of ripe rice.");
  assert.doesNotMatch(translated, /FLUXTERM|beetle|blasting/);
  assert.equal(calls, 1);
});

test("glossary handles standalone subjects, multiple clauses, negation, night and mixed text", () => {
  for (const text of [
    "Một con trâu, không có người.",
    "Cô gái giữa những cánh bướm phát sáng tím hồng, nền đêm, anime portrait.",
    "Không thêm xe máy. Một cậu bé cưỡi trâu và thổi sáo.",
    "Một con trâu, một con trâu khác và một con trâu ở xa.",
    source.normalize("NFD"),
  ]) {
    const protectedPrompt = protectPromptTerms(text);
    const restored = protectedPrompt.restore(protectedPrompt.text);
    assert.doesNotMatch(restored, /FLUXTERM/);
    if (text.normalize("NFC").includes("trâu")) assert.match(restored, /water buffalo/);
    if (text.includes("không có")) assert.match(restored, /without/);
    if (text.includes("nền đêm")) assert.match(restored, /nighttime background/);
  }
  const unrelated = "Một con sáo đậu trên cành cây, nền trời trong xanh.";
  assert.equal(protectPromptTerms(unrelated).text, unrelated, "do not interpret every sáo as an instrument");
  assert.equal(protectPromptTerms("A buffalo-shaped toy").text, "A buffalo-shaped toy");
});

test("missing, duplicated, corrupted or invented protected tokens fail before image inference", async () => {
  for (const fault of ["omit", "duplicate", "unknown", "corrupt"]) {
    let calls = 0;
    const translator = new CloudflarePromptTranslator("account", "token", async (_url, init) => {
      calls++;
      const parts = tokens(JSON.parse(String(init?.body)).text);
      const output = fault === "omit" ? "A boy riding a beetle and blasting."
        : fault === "duplicate" ? [...parts, parts[0]].join(" ")
        : fault === "unknown" ? [...parts, parts[0].replace("X0END", "X999END")].join(" ")
        : parts.join(" ").replace("FLUXTERM", "FLUXBROKEN");
      return new Response(JSON.stringify({ result: { translated_text: output } }));
    });
    await assert.rejects(translator.translateVietnameseToEnglish(source),
      (error: unknown) => error instanceof AppError && error.code === "PROMPT_TRANSLATION_INCOMPLETE" && error.statusCode === 422);
    assert.equal(calls, 1);
  }
});

test("term locking is bounded and never matches inside unrelated Vietnamese words", () => {
  assert.equal(protectPromptTerms("Con trầu bà bên cửa sổ").text, "Con trầu bà bên cửa sổ");
  assert.throws(() => protectPromptTerms("con trâu, ".repeat(65)),
    (error: unknown) => error instanceof AppError && error.code === "INVALID_PROMPT");
});

test("cyclo subject and pedaling action survive translation without inventing a passenger", async () => {
  for (const phrase of ["đạp xích lô", "đạp xe xích lô", "đạp xích-lô", "ĐẠP XÍCH LÔ".normalize("NFD")]) {
    const original = `giúp tôi tạo 1 bức ảnh về 1 con khỉ đang ${phrase}`;
    let calls = 0;
    const translator = new CloudflarePromptTranslator("account", "token", async (_url, init) => {
      calls++;
      const masked = JSON.parse(String(init?.body)).text;
      const parts = tokens(masked);
      assert.equal(parts.length, 1, "longest action+vehicle phrase must be protected as one unit");
      assert.doesNotMatch(masked, /xích[ -]lô/iu);
      return new Response(JSON.stringify({ success: true, result: { translated_text: `One monkey is ${parts[0]}.` } }));
    });
    const translated = await translator.translateVietnameseToEnglish(original);
    assert.match(translated, /^One monkey is pedaling a Vietnamese cyclo/);
    assert.match(translated, /three-wheeled pedal rickshaw/);
    assert.match(translated, /passenger seat in front/);
    assert.match(translated, /pedaling position behind/);
    assert.doesNotMatch(translated, /walking on a chain|carrying a passenger|FLUXTERM/i);
    assert.equal(calls, 1);
  }
});

test("standalone cyclos and separate chains stay distinct", () => {
  const original = "Một chiếc xích lô đứng cạnh một sợi dây xích.";
  const guarded = protectPromptTerms(original);
  assert.equal(tokens(guarded.text).length, 1);
  assert.match(guarded.text, /sợi dây xích/);
  const restored = guarded.restore(guarded.text);
  assert.match(restored, /Vietnamese cyclo/);
  assert.match(restored, /sợi dây xích/);
  assert.doesNotMatch(restored, /pedaling a/);
  assert.equal(protectPromptTerms("Một con khỉ đi trên dây xích.").text, "Một con khỉ đi trên dây xích.");
});
