import { AppError } from "../errors/app-error.js";

export const MAX_TRANSLATED_PROMPT_LENGTH = 2048;
const TRANSLATION_MODEL = "@cf/meta/m2m100-1.2b";
// Visual characteristics approved by the owner's watercolor reference image.
// Apply only to an explicit affirmative watercolor request, never every image.
const WATERCOLOR_DIRECTION = "Hand-painted watercolor illustration on textured watercolor paper, with translucent washes of pigment, soft bleeding edges, visible brush strokes and unpainted paper highlights. The entire scene is painted in watercolor. ";

export interface PromptTranslator {
  translateVietnameseToEnglish(prompt: string): Promise<string>;
}

export function containsVietnameseText(prompt: string): boolean {
  return /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(
    prompt.normalize("NFC"),
  );
}

// M2M100 can omit a trailing medium instruction while translating a long
// sentence. Restore only this explicit, affirmative instruction, never infer a
// style from a mention of water, a quoted caption, or a negated request.
function preserveWatercolorInstruction(original: string, translated: string): string {
  const clauses = original.normalize("NFC").toLocaleLowerCase("vi").split(/[,.!?;\n]+/u);
  const requested = clauses.some((part) => {
    const clause = part.trim();
    if (/["'“”‘’«»]/u.test(clause)) return false;
    if (/(?:^|\s)(?:không|đừng|tránh|chẳng|chưa|loại bỏ|nếu|hoặc|hay)(?:\s|$)/u.test(clause))
      return false;
    return /(?:^(?:vẽ\s+)?(?:tranh|phong cách)|(?:^|\s)(?:với|theo)\s+phong cách)\s+màu\s+nước(?:\s|$)/u.test(clause);
  });
  if (!requested || translated.startsWith(WATERCOLOR_DIRECTION)) return translated;
  return WATERCOLOR_DIRECTION + translated;
}

function translationError(): AppError {
  return new AppError(
    502,
    "GENERATION_FAILED",
    "Không thể dịch mô tả. Yêu cầu chưa được tạo; vui lòng thử lại sau.",
  );
}

export class CloudflarePromptTranslator implements PromptTranslator {
  constructor(
    private readonly accountId: string,
    private readonly token: string,
    private readonly transport: typeof fetch = fetch,
    private readonly timeoutMs = 10000,
  ) {}

  async translateVietnameseToEnglish(prompt: string): Promise<string> {
    let response: Response;
    try {
      response = await this.transport(
        "https://api.cloudflare.com/client/v4/accounts/" +
          this.accountId +
          "/ai/run/" +
          TRANSLATION_MODEL,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + this.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: prompt,
            source_lang: "vietnamese",
            target_lang: "english",
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        },
      );
    } catch {
      throw translationError();
    }

    if (!response.ok) throw translationError();

    let translatedPrompt: unknown;
    try {
      const payload: unknown = await response.json();
      if (
        typeof payload === "object" &&
        payload !== null &&
        !("success" in payload && payload.success === false) &&
        "result" in payload &&
        typeof payload.result === "object" &&
        payload.result !== null &&
        "translated_text" in payload.result
      ) {
        translatedPrompt = payload.result.translated_text;
      }
    } catch {
      throw translationError();
    }

    if (typeof translatedPrompt !== "string" || !translatedPrompt.trim())
      throw translationError();

    const normalizedPrompt = preserveWatercolorInstruction(prompt, translatedPrompt.trim());
    if (normalizedPrompt.length > MAX_TRANSLATED_PROMPT_LENGTH)
      throw new AppError(
        400,
        "INVALID_PROMPT",
        "Bản dịch vượt giới hạn mô tả. Yêu cầu chưa được tạo; vui lòng rút gọn mô tả.",
      );

    return normalizedPrompt;
  }
}
