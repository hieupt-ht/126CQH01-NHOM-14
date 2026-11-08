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
  "oil-painting": "Oil painting on textured canvas, with rich layered pigments, visible impasto brush strokes and hand-painted edges. Apply this oil-painted medium to the entire scene, preserving the subjects, actions, composition and any requested lettering. ",
  "3d": "Stylized 3D rendered illustration, with clearly modeled three-dimensional forms, dimensional materials, soft global illumination and contact shadows. Apply this 3D treatment to the entire scene, preserving the subjects, actions, composition and any requested lettering. ",
  comic: "Comic book illustration, with bold ink outlines, flat color blocks, halftone shading and expressive drawn forms. Apply this comic-book treatment to the entire scene, preserving the subjects, actions, composition and any requested lettering or dialogue. ",
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
