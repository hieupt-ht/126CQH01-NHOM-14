import { api, ApiError } from "./api";
import { clearPending, persistPending, type PendingGeneration } from "./pendingGeneration";
import type { AspectRatio, ImageStyle } from "../domain/generationOptions";
import type { GenerationRecord } from "./resources";

export const REFERENCE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_REFERENCE_IMAGES = 4;

export function validateReferenceImage(file: File) {
  if (!REFERENCE_IMAGE_TYPES.includes(file.type))
    return "Chọn ảnh PNG, JPEG hoặc WebP.";
  if (file.size === 0 || file.size > MAX_REFERENCE_IMAGE_BYTES)
    return "Ảnh tham chiếu phải tối đa 10 MiB.";
  return "";
}

export async function referenceImageSha256(file: File) {
  const bytes = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function submitGeneration({
  userId,
  prompt,
  aspectRatio,
  style,
  referenceImage,
  pending,
  onPendingChange,
}: {
  userId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  style: ImageStyle;
  referenceImage: File[];
  pending: PendingGeneration | null;
  onPendingChange: (value: PendingGeneration | null) => void;
}) {
  const referenceHashes = referenceImage.length
    ? await Promise.all(referenceImage.map(referenceImageSha256))
    : pending?.referenceImageSha256;
  if (pending?.referenceImageSha256 && referenceImage.length &&
      JSON.stringify(pending.referenceImageSha256) !== JSON.stringify(referenceHashes))
    throw new Error("Ảnh tham chiếu không khớp yêu cầu đang khôi phục.");

  const request = pending ?? {
    key: crypto.randomUUID(),
    prompt,
    aspectRatio,
    style,
    ...(referenceHashes?.length ? { referenceImageSha256: referenceHashes } : {}),
  };
  onPendingChange(request);
  try {
    persistPending(userId, request);
  } catch {
    throw new Error("Chưa lưu được mã yêu cầu trên trình duyệt. Chưa gửi đến backend.");
  }

  let body: BodyInit;
  if (referenceImage.length && referenceHashes?.length) {
    const form = new FormData();
    form.set("prompt", request.prompt);
    form.set("aspectRatio", request.aspectRatio ?? "auto");
    form.set("style", request.style ?? "none");
    referenceImage.forEach((file, index) => {
      form.append("referenceImageSha256", referenceHashes[index]);
      form.append("referenceImage", file, file.name || `reference-image-${index + 1}`);
    });
    body = form;
  } else {
    body = JSON.stringify({
      prompt: request.prompt,
      aspectRatio: request.aspectRatio ?? "auto",
      style: request.style ?? "none",
      ...(referenceHashes?.length ? { referenceImageSha256: referenceHashes } : {}),
    });
  }

  try {
    const job = await api<GenerationRecord>("/generations", {
      method: "POST",
      headers: { "Idempotency-Key": request.key },
      body,
    });
    clearPending(userId);
    onPendingChange(null);
    return job;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code !== "REFERENCE_IMAGE_REQUIRED" &&
      ((error.status >= 400 && error.status < 500) || error.code === "GENERATION_NOT_CONFIGURED")
    ) {
      clearPending(userId);
      onPendingChange(null);
    }
    throw error;
  }
}
