import { AppError } from "../errors/app-error.js";
export interface ImageProvider {
  generate(prompt: string, referenceImage?: Buffer): Promise<Buffer>;
}
const TEXT_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const REFERENCE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
export class CloudflareProvider implements ImageProvider {
  constructor(
    private accountId: string,
    private token: string,
    private transport: typeof fetch = fetch,
  ) {}
  async generate(prompt: string, referenceImage?: Buffer): Promise<Buffer> {
    // No automatic retry: a network timeout may occur after provider accepted inference.
    const model = referenceImage ? REFERENCE_MODEL : TEXT_MODEL;
    let body: BodyInit;
    const headers: Record<string, string> = { Authorization: "Bearer " + this.token };
    if (referenceImage) {
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("input_image_0", new Blob([new Uint8Array(referenceImage)], { type: "image/png" }), "reference.png");
      body = form;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({ prompt, steps: 4 });
    }
    const response = await this.transport(
      "https://api.cloudflare.com/client/v4/accounts/" +
        this.accountId +
        "/ai/run/" + model,
      {
        method: "POST",
        headers,
        body,
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
