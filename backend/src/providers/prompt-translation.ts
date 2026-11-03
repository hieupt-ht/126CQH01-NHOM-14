import { AppError } from "../errors/app-error.js";

export const MAX_TRANSLATED_PROMPT_LENGTH = 2048;
const TRANSLATION_MODEL = "@cf/meta/m2m100-1.2b";

export interface PromptTranslator {
  translateVietnameseToEnglish(prompt: string): Promise<string>;
}

export function containsVietnameseText(prompt: string): boolean {
  return /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(
    prompt,
  );
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

    const normalizedPrompt = translatedPrompt.trim();
    if (normalizedPrompt.length > MAX_TRANSLATED_PROMPT_LENGTH)
      throw new AppError(
        400,
        "INVALID_PROMPT",
        "Bản dịch vượt giới hạn mô tả. Yêu cầu chưa được tạo; vui lòng rút gọn mô tả.",
      );

    return normalizedPrompt;
  }
}
