import { AppError } from "../errors/app-error.js";
export interface ImageProvider {
  generate(prompt: string): Promise<Buffer>;
}
export class CloudflareProvider implements ImageProvider {
  constructor(
    private accountId: string,
    private token: string,
    private transport: typeof fetch = fetch,
  ) {}
  async generate(prompt: string): Promise<Buffer> {
    // No automatic retry: a network timeout may occur after provider accepted inference.
    const response = await this.transport(
      "https://api.cloudflare.com/client/v4/accounts/" +
        this.accountId +
        "/ai/run/@cf/black-forest-labs/flux-1-schnell",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + this.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, steps: 4 }),
        signal: AbortSignal.timeout(90000),
      },
    );
    if (!response.ok) {
      if (response.status === 429)
        throw new AppError(
          429,
          "PROVIDER_QUOTA_EXCEEDED",
          "Dịch vụ tạo ảnh đã hết hạn mức.",
        );
      if (response.status >= 500)
        throw new AppError(
          503,
          "RESULT_UNCERTAIN",
          "Chưa xác định được kết quả từ dịch vụ AI.",
        );
      throw new AppError(
        502,
        "GENERATION_FAILED",
        "Dịch vụ không chấp nhận yêu cầu tạo ảnh.",
      );
    }
    if (Number(response.headers.get("content-length") ?? 0) > 15 * 1024 * 1024)
      throw new AppError(
        502,
        "GENERATION_FAILED",
        "Kết quả vượt giới hạn kích thước.",
      );
    const reader = response.body?.getReader();
    if (!reader)
      throw new AppError(
        502,
        "RESULT_UNCERTAIN",
        "Không nhận được kết quả AI.",
      );
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.length;
        if (length > 15 * 1024 * 1024)
          throw new AppError(
            502,
            "GENERATION_FAILED",
            "Kết quả vượt giới hạn kích thước.",
          );
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!payload.success || typeof payload.result?.image !== "string")
      throw new AppError(502, "RESULT_UNCERTAIN", "Kết quả ảnh không hợp lệ.");
    return Buffer.from(payload.result.image, "base64");
  }
}
