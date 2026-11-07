import sharp from "sharp";
import { AppError } from "../../errors/app-error.js";
import { WATERCOLOR_DIRECTION } from "../../providers/prompt-translation.js";

export const ASPECT_RATIOS = ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"] as const;
export const IMAGE_STYLES = ["none", "watercolor", "cinematic", "photographic", "illustration", "anime", "oil-painting", "3d", "comic"] as const;
export type Presentation = { aspectRatio: typeof ASPECT_RATIOS[number]; style: typeof IMAGE_STYLES[number] };
export const DEFAULT_PRESENTATION: Presentation = { aspectRatio: "auto", style: "none" };
const directions: Record<Presentation["style"], string> = {
  none: "", watercolor: WATERCOLOR_DIRECTION,
  cinematic: "Cinematic visual style, film-like composition and dramatic lighting. ",
  photographic: "Photographic style, realistic textures and depth. ",
  illustration: "Hand-drawn storybook illustration, expressive lines and painted colors. ",
  anime: "Anime illustration, expressive line art and cel shading. ",
  "oil-painting": "Oil painting on canvas, rich layered pigments, visible impasto brush strokes and painterly edges throughout the scene. ",
  "3d": "Stylized 3D render, sculpted forms, dimensional materials, soft global illumination and ambient occlusion. ",
  comic: "Comic book illustration, bold ink outlines, expressive panels of color, halftone shading and dynamic composition, without added text or speech bubbles. ",
};
export function applyImageStyle(prompt: string, style: Presentation["style"]): string {
  const direction = directions[style];
  const submitted = direction && !prompt.startsWith(direction) ? direction + prompt : prompt;
  if (submitted.length > 2048) throw new AppError(400, "INVALID_PROMPT", "Mô tả và chủ đề vượt giới hạn. Vui lòng rút gọn mô tả.");
  return submitted;
}
// Always pad original pixels from the durable raw checkpoint; never crop or infer again.
export async function padImageToRatio(bytes: Buffer, ratio: Presentation["aspectRatio"]): Promise<Buffer> {
  if (ratio === "auto") return bytes;
  if (bytes.length > 10 * 1024 * 1024) throw new AppError(502, "INVALID_IMAGE", "Ảnh vượt dung lượng cho phép.");
  const image = sharp(bytes, { limitInputPixels: 4096 * 4096 });
  const meta = await image.metadata();
  if (!meta.width || !meta.height || !["png", "jpeg", "webp"].includes(meta.format ?? ""))
    throw new AppError(502, "INVALID_IMAGE", "Định dạng ảnh không hợp lệ.");
  const [a, b] = ratio.split(":").map(Number);
  const scale = Math.ceil(Math.max(meta.width / a, meta.height / b));
  const width = a * scale, height = b * scale;
  if (width > 4096 || height > 4096) throw new AppError(502, "INVALID_IMAGE", "Khung ảnh vượt kích thước cho phép.");
  const left = Math.floor((width - meta.width) / 2), top = Math.floor((height - meta.height) / 2);
  return image.extend({ left, top, right: width - meta.width - left, bottom: height - meta.height - top,
    background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toBuffer();
}
