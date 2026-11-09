import { aspectOptions, styleOptions, type AspectRatio, type ImageStyle } from "../domain/generationOptions";
export type PendingGeneration = { key: string; prompt: string; aspectRatio?: AspectRatio; style?: ImageStyle; referenceImageSha256?: string[] };
const storageKey = (userId: string) => "flux.pending-generation." + userId;
export function restorePending(userId: string): PendingGeneration | null {
  const raw = sessionStorage.getItem(storageKey(userId));
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      value &&
      typeof value === "object" &&
      "key" in value &&
      "prompt" in value &&
      typeof value.key === "string" &&
      /^[a-zA-Z0-9_-]{16,100}$/.test(value.key) &&
      typeof value.prompt === "string" &&
      value.prompt.trim() &&
      value.prompt.length <= 2048
    )
      {
        const options = value as Record<string, unknown>;
        if (options.aspectRatio !== undefined && !aspectOptions.some(item => item.value === options.aspectRatio)) throw new Error("Invalid ratio");
        if (options.style !== undefined && !styleOptions.some(item => item.value === options.style)) throw new Error("Invalid style");
        const hashes = options.referenceImageSha256;
        if (hashes !== undefined && !(typeof hashes === "string" && /^[a-f0-9]{64}$/.test(hashes)) &&
            !(Array.isArray(hashes) && hashes.length > 0 && hashes.length <= 4 && hashes.every(hash => typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash)))) throw new Error("Invalid reference image fingerprint");
        return { key: value.key, prompt: value.prompt, aspectRatio: options.aspectRatio as AspectRatio | undefined, style: options.style as ImageStyle | undefined, referenceImageSha256: typeof hashes === "string" ? [hashes] : hashes as string[] | undefined };
      }
  } catch {
    /* Invalid browser draft is discarded; it cannot initiate a job. */
  }
  sessionStorage.removeItem(storageKey(userId));
  return null;
}
export function persistPending(userId: string, value: PendingGeneration) {
  sessionStorage.setItem(storageKey(userId), JSON.stringify(value));
}
export function clearPending(userId: string) {
  sessionStorage.removeItem(storageKey(userId));
}
