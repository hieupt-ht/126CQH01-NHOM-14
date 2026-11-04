export function getProfileInitials(displayName: string | null) {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!words.length) return "";
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join("").toLocaleUpperCase("vi-VN");
  return `${Array.from(words[0])[0] ?? ""}${Array.from(words[words.length - 1])[0] ?? ""}`.toLocaleUpperCase("vi-VN");
}
