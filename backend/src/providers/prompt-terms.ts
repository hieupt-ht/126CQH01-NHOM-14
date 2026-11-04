import { randomUUID } from "node:crypto";
import { AppError } from "../errors/app-error.js";

export const PROMPT_TERM_REVISION = "visual-terms-v2";
const CYCLO = "Vietnamese cyclo (a three-wheeled pedal rickshaw with a passenger seat in front and the pedaling position behind)";
// A bounded terminology glossary, not a template for any complete user prompt.
// Longest phrases win; e.g. "sáo" alone is ambiguous (bird/instrument) and is not mapped.
const glossary: Record<string, string> = {
  "đạp xe xích lô": "pedaling a " + CYCLO,
  "đạp xích lô": "pedaling a " + CYCLO,
  "đạp xích-lô": "pedaling a " + CYCLO,
  "xe xích lô": CYCLO, "xích lô": CYCLO, "xích-lô": CYCLO,
  "con trâu": "water buffalo", "trâu nước": "water buffalo", "trâu": "water buffalo",
  "cưỡi trên lưng con trâu": "riding a water buffalo", "cưỡi trên lưng trâu": "riding a water buffalo",
  "cưỡi trên con trâu": "riding a water buffalo", "cưỡi trâu": "riding a water buffalo",
  "thổi sáo": "playing a flute", "thổi cây sáo": "playing a flute",
  "cánh đồng lúa chín": "field of ripe rice", "đồng lúa chín": "ripe rice field",
  "cánh đồng lúa": "rice field", "đồng lúa": "rice field",
  "những cánh bướm phát sáng": "glowing butterflies", "cánh bướm phát sáng": "glowing butterflies",
  "bướm phát sáng": "glowing butterflies", "phát sáng": "glowing",
  "nền đêm": "nighttime background", "ban đêm": "at night",
  "tím hồng": "pink and purple", "hồng tím": "pink and purple",
  "không có": "without", "không thêm": "do not add", "đừng thêm": "do not add",
};
const patterns = Object.keys(glossary).sort((a, b) => b.length - a.length).join("|");
const scenePatterns = Object.keys(glossary).filter(term => !["không có", "không thêm", "đừng thêm"].includes(term)).join("|");

function incompleteTranslation(): AppError {
  // A definitive pre-acceptance rejection: the existing frontend clears the
  // pending key on 4xx so the user can edit the preserved prompt, rather than
  // becoming locked into retrying a translation that dropped a required term.
  return new AppError(422, "PROMPT_TRANSLATION_INCOMPLETE", "Bản dịch chưa giữ đủ chi tiết mô tả. Chưa tạo job hoặc trừ lượt; vui lòng diễn đạt lại rõ hơn.");
}

export function protectPromptTerms(original: string) {
  const source = original.normalize("NFC");
  if (!new RegExp(`(?<![\\p{L}\\p{N}_])(${scenePatterns})(?![\\p{L}\\p{N}_])`, "iu").test(source))
    return { text: original, restore: (translated: string) => translated };
  const matcher = new RegExp(`(?<![\\p{L}\\p{N}_])(${patterns})(?![\\p{L}\\p{N}_])`, "giu");
  const terms: string[] = [];
  let nonce: string;
  do { nonce = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase(); }
  while (source.toUpperCase().includes("FLUXTERM" + nonce));
  const text = source.replace(matcher, phrase => {
    if (terms.length >= 64) throw new AppError(400, "INVALID_PROMPT", "Mô tả có quá nhiều cụm chi tiết cần bảo vệ. Vui lòng rút gọn mô tả.");
    const index = terms.push(glossary[phrase.toLocaleLowerCase("vi")]) - 1;
    return `FLUXTERM${nonce}X${index}END`;
  });
  return {
    // No normalization or other mutation at the provider boundary if no terms match.
    text: terms.length ? text : original,
    restore(translated: string): string {
      if (!terms.length) return translated;
      const seen = terms.map(() => 0);
      const token = new RegExp(`FLUX\\s*TERM\\s*${nonce}\\s*X\\s*(\\d+)\\s*END`, "gi");
      const restored = translated.replace(token, (_whole, rawIndex: string) => {
        const index = Number(rawIndex);
        if (!Number.isSafeInteger(index) || index >= terms.length || seen[index] !== 0) throw incompleteTranslation();
        seen[index]++;
        return terms[index];
      });
      if (seen.some(count => count !== 1) || restored.toUpperCase().includes(nonce)) throw incompleteTranslation();
      return restored;
    },
  };
}
