export const DEFAULT_MAX_IMAGE_UPLOAD_MB = 10;
export const MAX_IMAGE_UPLOAD_MB = 95;
export const IMAGE_UPLOAD_BYTES_PER_MB = 1024 * 1024;
export const MAX_IMAGE_UPLOAD_BYTES = MAX_IMAGE_UPLOAD_MB * IMAGE_UPLOAD_BYTES_PER_MB;

export function imageUploadLimitBytes(maxImageUploadMb: number): number {
  if (!Number.isSafeInteger(maxImageUploadMb) || maxImageUploadMb < 1 || maxImageUploadMb > MAX_IMAGE_UPLOAD_MB) {
    throw new RangeError(`MAX_IMAGE_UPLOAD_MB must be an integer between 1 and ${MAX_IMAGE_UPLOAD_MB}.`);
  }
  return maxImageUploadMb * IMAGE_UPLOAD_BYTES_PER_MB;
}
