import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { AppError } from "../src/errors/app-error.js";
import { padImageToRatio, applyImageStyle, ASPECT_RATIOS, IMAGE_STYLES } from "../src/modules/generations/presentation.js";

test("selected ratios preserve every original pixel and add centered white borders", async () => {
  // A varied pattern catches resampling/cropping that a solid-color fixture cannot.
  const pixels = Buffer.from(Array.from({ length: 32 * 24 * 3 }, (_, index) => (index * 37) % 251));
  const source = await sharp(pixels, { raw: { width: 32, height: 24, channels: 3 } }).png().toBuffer();
  for (const ratio of ASPECT_RATIOS) {
    const output = await padImageToRatio(source, ratio);
    if (ratio === "auto") { assert.equal(output, source); continue; }
    const { width, height } = await sharp(output).metadata();
    assert.ok(width && height);
    const [a, b] = ratio.split(":").map(Number);
    assert.equal(width * b, height * a);
    assert.ok(width >= 32 && height >= 24);
    const center = await sharp(output).extract({ left: Math.floor((width - 32) / 2), top: Math.floor((height - 24) / 2), width: 32, height: 24 }).removeAlpha().raw().toBuffer();
    const original = await sharp(source).removeAlpha().raw().toBuffer();
    assert.deepEqual(center, original);
    if (width !== 32 || height !== 24) {
      const corner = await sharp(output).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
      assert.deepEqual([...corner], [255, 255, 255]);
    }
  }
});

for (const style of ["oil-painting", "3d", "comic"] as const) {
  test(`${style}: preserves explicit subjects, framing, lettering and UTF-16 limit`, () => {
    const scene = 'One person walking one dog beside a house, full-body view. A speech bubble reads "Xin chào!".';
    const submitted = applyImageStyle(scene, style);
    assert.ok(submitted.includes(scene));
    const direction = submitted.slice(0, submitted.indexOf(scene));
    assert.match(direction, /entire scene/);
    assert.match(direction, /requested lettering/);
    if (style !== "oil-painting") assert.ok(submitted.endsWith(scene));
    assert.doesNotMatch(submitted, /without added text|without.*speech bubbles/);
    assert.equal(applyImageStyle(submitted, style), submitted);

    const overhead = submitted.length - scene.length;
    const remaining = 2048 - overhead;
    const boundary = "😀".repeat(Math.floor(remaining / 2)) + "x".repeat(remaining % 2);
    assert.equal(applyImageStyle(boundary, style).length, 2048);
    assert.throws(() => applyImageStyle(boundary + "x", style),
      (error: unknown) => error instanceof AppError && error.statusCode === 400 && error.code === "INVALID_PROMPT");
  });
}
test("style presets retain scene text and enforce the final prompt limit", () => {
  assert.equal(applyImageStyle("A house", "none"), "A house");
  assert.match(applyImageStyle("A house", "watercolor"), /^Hand-painted watercolor illustration/);
  assert.ok(applyImageStyle("A house", "cinematic").endsWith("A house"));
  assert.throws(() => applyImageStyle("x".repeat(2048), "anime"));
});

test("every selectable preset preserves scene, applies once and enforces provider limit", () => {
  const scene = "A boy riding a water buffalo while playing a flute in a rice field.";
  assert.equal(IMAGE_STYLES.length, 9); // Eight visual styles plus no preset.
  for (const style of IMAGE_STYLES.filter(value => value !== "none")) {
    const submitted = applyImageStyle(scene, style);
    assert.ok(submitted.length > scene.length);
    assert.ok(submitted.includes(scene));
    if (style !== "oil-painting") assert.ok(submitted.endsWith(scene));
    assert.equal(applyImageStyle(submitted, style), submitted);
    assert.throws(() => applyImageStyle("x".repeat(2048), style));
  }
  assert.match(applyImageStyle(scene, "oil-painting"), /impasto brush strokes/);
  assert.match(applyImageStyle(scene, "3d"), /3D render/);
  assert.match(applyImageStyle(scene, "comic"), /bold ink outlines/);
});

test("oil replaces the reported medium directive while preserving subjects and quoted lettering", () => {
  const scene = 'Black hair girl between glowing butterflies pink and purple, anime portraits, virtual lighting and nighttime background. A sign reads "anime".';
  const paintedScene = scene.replace(", anime portraits,", ", oil-painted portraits,");
  const submitted = applyImageStyle(scene, "oil-painting");
  assert.ok(submitted.startsWith("Oil painting on textured canvas"));
  assert.match(submitted.slice(0, submitted.indexOf(paintedScene)), /Broad impasto brush strokes/);
  assert.doesNotMatch(submitted.slice(0, submitted.indexOf(paintedScene)), /\banime\b/i);
  assert.match(submitted.slice(submitted.indexOf(paintedScene) + paintedScene.length), /^ Rendering medium:.*large visible brush marks/);
  assert.equal(submitted.split(paintedScene).length, 2);
  assert.ok(submitted.includes('A sign reads "anime".'));
  assert.ok(!submitted.includes(", anime portraits,"));
  assert.equal(submitted.split("Rendering medium:").length, 2);
  assert.equal(applyImageStyle(submitted, "oil-painting"), submitted);
  assert.equal(applyImageStyle(scene, "none"), scene);
  assert.ok(applyImageStyle(scene, "anime").endsWith(scene));
});

test("oil normalizes only explicit standalone medium clauses in English and Vietnamese", () => {
  for (const [scene, painted] of [
    ["A girl, anime portraits, pink butterflies.", "A girl, oil-painted portraits, pink butterflies."],
    ["Cô gái tóc đen, chân dung anime, nền đêm.", "Cô gái tóc đen, chân dung vẽ sơn dầu, nền đêm."],
    ["A girl; in anime style; a night background.", "A girl; in oil painting style; a night background."],
    ["anime-style portrait\nof a girl", "oil-painted portrait\nof a girl"],
    ['A girl\'s sign reads "anime portraits", anime style, two butterflies.', 'A girl\'s sign reads "anime portraits", oil painting style, two butterflies.'],
  ]) {
    const submitted = applyImageStyle(scene, "oil-painting");
    assert.ok(submitted.includes(painted), scene);
    assert.equal(applyImageStyle(submitted, "oil-painting"), submitted);
    assert.equal(applyImageStyle(scene, "none"), scene);
    assert.ok(applyImageStyle(scene, "anime").endsWith(scene));
  }
});

test("oil medium normalization leaves quoted text, negations and subject references intact", () => {
  for (const scene of [
    'A sign reads "anime portraits".',
    'A sign reads “anime style”.',
    "A girl's sign reads 'anime portraits'.",
    'A sign reads "anime portraits, anime style',
    "not an anime portrait, one person holding a dog.",
    "A girl at an anime convention, two butterflies.",
    "An anime character holding a paint brush.",
    "Three anime portraits hanging on a wall.",
  ]) assert.ok(applyImageStyle(scene, "oil-painting").includes(scene), scene);
});
