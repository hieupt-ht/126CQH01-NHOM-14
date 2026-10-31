import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { AppError } from "../errors/app-error.js";
import { createCloudinaryService, type CloudinaryClient } from "../services/cloudinary.service.js";

export type StoredObject = {
  provider: string;
  accountAlias?: string;
  container?: string;
  key: string;
  version?: string;
  deliveryMode: string;
};
export interface ImageStorage {
  put(key: string, bytes: Buffer, mime: string, ownerId?: string): Promise<StoredObject>;
  openRead(object: StoredObject): Promise<Readable>;
  delete(object: StoredObject): Promise<void>;
}
export const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

// SDK URLs are generated here; never fetch a URL supplied by a user or stored in MongoDB.
export class CloudinaryImageStorage implements ImageStorage {
  constructor(
    private client: CloudinaryClient,
    private alias: string,
    private namespace = "flux-studio/local",
    private maxImageMb = 10,
    private timeoutMs = 30000,
    private transport: typeof fetch = fetch,
  ) {}
  private validate(object: StoredObject) {
    if (object.provider !== "cloudinary" || object.accountAlias !== this.alias ||
        object.container !== this.namespace || object.deliveryMode !== "private" ||
        !object.key.startsWith(this.namespace + "/") ||
        !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(object.key) ||
        (object.version !== undefined && !/^\d+$/.test(object.version)))
      throw new AppError(503, "STORAGE_NOT_CONFIGURED", "Kho ảnh này chưa được cấu hình.");
  }
  private async download(object: StoredObject): Promise<Response> {
    this.validate(object);
    const url = this.client.url(object.key, {
      resource_type: "image", type: "authenticated", secure: true, sign_url: true,
      ...(object.version ? { version: object.version } : {}),
    });
    const response = await this.transport(url, { signal: AbortSignal.timeout(this.timeoutMs), redirect: "error" });
    if (!response.ok || !response.body)
      throw new AppError(503, "STORAGE_UNAVAILABLE", "Không đọc được file ảnh.");
    return response;
  }
  private async verifiedBytes(object: StoredObject): Promise<Buffer> {
    const response = await this.download(object);
    const reader = response.body!.getReader();
    const parts: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.length;
        if (length > this.maxImageMb * 1024 * 1024)
          throw new AppError(503, "STORAGE_UNAVAILABLE", "File ảnh vượt giới hạn xác minh.");
        parts.push(part.value);
      }
    } finally { await reader.cancel().catch(() => undefined); }
    return Buffer.concat(parts);
  }
  async put(key: string, bytes: Buffer, mime: string, ownerId?: string): Promise<StoredObject> {
    if (!ownerId || !/^[a-f0-9]{24}$/i.test(ownerId) ||
        !/^generations\/[a-f0-9]{24}\/original\.(png|jpeg|webp)$/.test(key) ||
        mime !== "image/" + key.split(".").pop())
      throw new AppError(400, "INVALID_STORAGE_INPUT", "Thông tin lưu ảnh không hợp lệ.");
    const publicId = this.namespace + "/" + key.replace(/\.(png|jpeg|webp)$/, "");
    // Reusing the same public_id with overwrite:false recovers an uncertain upload.
    // Verify downloaded bytes before trusting a reused object; never overwrite a conflict.
    const service = createCloudinaryService(this.client, this.maxImageMb * 1024 * 1024, () => publicId);
    const uploaded = await service.uploadGeneratedImage({ userId: ownerId, bytes });
    const object: StoredObject = {
      provider: "cloudinary", accountAlias: this.alias, container: this.namespace,
      key: publicId, version: uploaded.version, deliveryMode: "private",
    };
    const existing = await this.verifiedBytes(object);
    if (!existing.equals(bytes))
      throw new AppError(409, "CONTENT_CONFLICT", "File đã tồn tại với nội dung khác.");
    return object;
  }
  async openRead(object: StoredObject): Promise<Readable> {
    const response = await this.download(object);
    return Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
  }
  async delete(object: StoredObject): Promise<void> {
    this.validate(object);
    const service = createCloudinaryService(this.client, this.maxImageMb * 1024 * 1024);
    await service.deleteImage(object.key);
  }
}
export class StorageRegistry {
  constructor(private adapters: Map<string, ImageStorage>) {}
  forObject(object: StoredObject): ImageStorage {
    const adapter = this.adapters.get(object.provider + ":" + (object.accountAlias ?? ""));
    if (!adapter) throw new AppError(503, "STORAGE_NOT_CONFIGURED", "Kho lưu ảnh chưa được cấu hình.");
    return adapter;
  }
}
