import sharp, { type Metadata } from "sharp";
import { AppError } from "../../errors/app-error.js";

export const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_REFERENCE_IMAGE_DIMENSION = 4096;
export const MODEL_REFERENCE_IMAGE_DIMENSION = 511;

const MIME_FORMATS = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
} as const;

export type NormalizedReferenceImage = {
  bytes: Buffer;
  sha256: string;
  width: number;
  height: number;
  format: "png";
};

export async function normalizeReferenceImage(
  bytes: Buffer,
  mime: string,
  sha256: string,
): Promise<NormalizedReferenceImage> {
  if (!bytes.length || bytes.length > MAX_REFERENCE_IMAGE_BYTES)
    throw new AppError(413, "INVALID_REFERENCE_IMAGE", "Ảnh tham chiếu phải tối đa 10 MiB.");
  const expectedFormat = MIME_FORMATS[mime as keyof typeof MIME_FORMATS];
  if (!expectedFormat)
    throw new AppError(415, "INVALID_REFERENCE_IMAGE", "Chọn ảnh PNG, JPEG hoặc WebP.");

  let metadata: Metadata;
  try {
    metadata = await sharp(bytes, { limitInputPixels: MAX_REFERENCE_IMAGE_DIMENSION ** 2 }).metadata();
    if (
      metadata.format !== expectedFormat ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_REFERENCE_IMAGE_DIMENSION ||
      metadata.height > MAX_REFERENCE_IMAGE_DIMENSION ||
      (metadata.pages ?? 1) !== 1
    ) throw new Error("Image type or dimensions are not supported");
    await sharp(bytes, { limitInputPixels: MAX_REFERENCE_IMAGE_DIMENSION ** 2 }).stats();
  } catch {
    throw new AppError(400, "INVALID_REFERENCE_IMAGE", "Ảnh không hợp lệ hoặc vượt 4096 px mỗi cạnh.");
  }

  try {
    const result = await sharp(bytes, { limitInputPixels: MAX_REFERENCE_IMAGE_DIMENSION ** 2 })
      .rotate()
      .resize(MODEL_REFERENCE_IMAGE_DIMENSION, MODEL_REFERENCE_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer({ resolveWithObject: true });
    return {
      bytes: result.data,
      sha256,
      width: result.info.width,
      height: result.info.height,
      format: "png",
    };
  } catch {
    throw new AppError(400, "INVALID_REFERENCE_IMAGE", "Không thể chuẩn bị ảnh tham chiếu.");
  }
}

