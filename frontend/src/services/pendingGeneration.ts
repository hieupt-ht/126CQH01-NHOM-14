export type PendingGeneration = { key: string; prompt: string };
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
      return { key: value.key, prompt: value.prompt };
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
