import sharp from "sharp";
import { AppError } from "../../errors/app-error.js";
import { WATERCOLOR_DIRECTION } from "../../providers/prompt-translation.js";

export const ASPECT_RATIOS = ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"] as const;
export const IMAGE_STYLES = ["none", "watercolor", "cinematic", "photographic", "illustration", "anime", "oil-painting", "3d", "comic"] as const;
export type Presentation = { aspectRatio: typeof ASPECT_RATIOS[number]; style: typeof IMAGE_STYLES[number] };
export const DEFAULT_PRESENTATION: Presentation = { aspectRatio: "auto", style: "none" };
const OIL_PAINTING_DIRECTION = "Oil painting on textured canvas, heavy impasto oil paint with a tactile physical surface. Broad impasto brush strokes and raised palette-knife ridges sculpt the figures and background. Broken color, thick layered pigments, swirling directional strokes and coarse woven canvas grain. Paint relief catches the light. The entire scene is hand-painted, with distinct paint marks even in fine details. Preserve the subjects, actions, composition and requested lettering. Scene description: ";
const OIL_PAINTING_FINISH = " Rendering medium: thick impasto oil painting with large visible brush marks, ridged pigment and tactile canvas texture across every subject and the entire background.";

// Only standalone rendering directives are replaced. Subject descriptions,
// negated requests, and quoted lettering are not an instruction to change medium.
const OIL_MEDIUM_CLAUSES = new Map([
  ["anime portrait", "oil-painted portrait"], ["anime portraits", "oil-painted portraits"],
  ["anime-style portrait", "oil-painted portrait"], ["anime-style portraits", "oil-painted portraits"],
  ["portrait in anime style", "oil-painted portrait"], ["portrait in an anime style", "oil-painted portrait"],
  ["anime illustration", "oil-painted illustration"], ["anime illustrations", "oil-painted illustrations"],
  ["anime drawing", "oil painting"], ["anime drawings", "oil paintings"],
  ["anime style", "oil painting style"], ["anime-style", "oil painting style"],
  ["in anime style", "in oil painting style"], ["in an anime style", "in oil painting style"],
  ["chân dung anime", "chân dung vẽ sơn dầu"], ["phong cách anime", "phong cách sơn dầu"],
  ["theo phong cách anime", "theo phong cách sơn dầu"], ["với phong cách anime", "với phong cách sơn dầu"],
]);
function oilMediumScene(prompt: string): string {
  const replaceClauses = (text: string) => text.replace(/[^,;.!?\r\n]+/gu, clause => {
    const core = clause.trim();
    const replacement = OIL_MEDIUM_CLAUSES.get(core.toLowerCase());
    if (!replacement) return clause;
    const leading = clause.match(/^\s*/u)![0];
    const trailing = clause.match(/\s*$/u)![0];
    return leading + replacement + trailing;
  });
  const pairs: Record<string, string> = { '"': '"', "'": "'", "“": "”", "‘": "’", "«": "»" };
  let result = "", start = 0, closing: string | null = null;
  for (let index = 0; index < prompt.length; index++) {
    const char = prompt[index];
    let escapes = 0;
    for (let previous = index - 1; previous >= 0 && prompt[previous] === "\\"; previous--) escapes++;
    if (escapes % 2) continue;
    // A possessive/contraction apostrophe does not open or close a quote.
    if ((char === "'" || char === "’") && /[\p{L}\p{N}]/u.test(prompt[index - 1] ?? "") && /[\p{L}\p{N}]/u.test(prompt[index + 1] ?? "")) continue;
    if (closing) {
      if (char === closing) { result += prompt.slice(start, index + 1); start = index + 1; closing = null; }
    } else if (pairs[char]) {
      result += replaceClauses(prompt.slice(start, index));
      start = index; closing = pairs[char];
    }
  }
  // Keep an unclosed quoted tail verbatim rather than guessing its meaning.
  return result + (closing ? prompt.slice(start) : replaceClauses(prompt.slice(start)));
}
const directions: Record<Presentation["style"], string> = {
  none: "", watercolor: WATERCOLOR_DIRECTION,
  cinematic: "Cinematic visual style, film-like composition and dramatic lighting. ",
  photographic: "Photographic style, realistic textures and depth. ",
  illustration: "Hand-drawn storybook illustration, expressive lines and painted colors. ",
  anime: "Anime illustration, expressive line art and cel shading. ",
  "oil-painting": OIL_PAINTING_DIRECTION,
  "3d": "Stylized 3D rendered illustration, with clearly modeled three-dimensional forms, dimensional materials, soft global illumination and contact shadows. Apply this 3D treatment to the entire scene, preserving the subjects, actions, composition and any requested lettering. ",
  comic: "Comic book illustration, with bold ink outlines, flat color blocks, halftone shading and expressive drawn forms. Apply this comic-book treatment to the entire scene, preserving the subjects, actions, composition and any requested lettering or dialogue. ",
};
export function applyImageStyle(prompt: string, style: Presentation["style"]): string {
  const direction = directions[style];
  const scene = style === "oil-painting" ? oilMediumScene(prompt) : prompt;
  const prefixed = direction && !scene.startsWith(direction) ? direction + scene : scene;
  // Repeat the visual medium after the scene without reintroducing conflicting labels.
  const submitted = style === "oil-painting" && !prefixed.endsWith(OIL_PAINTING_FINISH)
    ? prefixed + OIL_PAINTING_FINISH : prefixed;
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
