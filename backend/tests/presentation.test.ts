import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
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
    assert.ok(submitted.endsWith(scene));
    assert.equal(applyImageStyle(submitted, style), submitted);
    assert.throws(() => applyImageStyle("x".repeat(2048), style));
  }
  assert.match(applyImageStyle(scene, "oil-painting"), /impasto brush strokes/);
  assert.match(applyImageStyle(scene, "3d"), /3D render/);
  assert.match(applyImageStyle(scene, "comic"), /bold ink outlines/);
});
