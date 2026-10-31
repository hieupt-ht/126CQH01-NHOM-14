import { createHash } from "node:crypto";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import type { Readable } from "node:stream";
import { AppError } from "../errors/app-error.js";
export type StoredObject = {
  provider: string;
  accountAlias?: string;
  container?: string;
  key: string;
  version?: string;
  deliveryMode: string;
};
export interface ImageStorage {
  put(key: string, bytes: Buffer, mime: string): Promise<StoredObject>;
  openRead(object: StoredObject): Promise<Readable>;
  delete(object: StoredObject): Promise<void>;
}
export const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
export class AzureBlobStorage implements ImageStorage {
  private client: BlobServiceClient;
  constructor(
    private accountUrl: string,
    private container: string,
    private alias: string,
    private namespace = "flux-studio/local",
  ) {
    this.client = new BlobServiceClient(
      accountUrl,
      new DefaultAzureCredential(),
      { retryOptions: { maxTries: 3, tryTimeoutInMs: 20000 } },
    );
  }
  private async target(object?: StoredObject) {
    if (
      object &&
      (object.provider !== "azure" ||
        object.accountAlias !== this.alias ||
        object.container !== this.container ||
        object.deliveryMode !== "private")
    )
      throw new AppError(
        503,
        "STORAGE_NOT_CONFIGURED",
        "Kho ảnh này chưa được cấu hình.",
      );
    const target = this.client.getContainerClient(this.container);
    const properties = await target.getProperties();
    if (properties.blobPublicAccess)
      throw new AppError(
        503,
        "STORAGE_NOT_PRIVATE",
        "Kho ảnh chưa bật chế độ riêng tư.",
      );
    return target;
  }
  async put(key: string, bytes: Buffer, mime: string): Promise<StoredObject> {
    key = this.namespace + "/" + key;
    const target = await this.target();
    const blob = target.getBlockBlobClient(key);
    try {
      await blob.uploadData(bytes, {
        conditions: { ifNoneMatch: "*" },
        blobHTTPHeaders: { blobContentType: mime },
        metadata: { sha256: digest(bytes) },
      });
    } catch (error) {
      if (!(
        error &&
        typeof error === "object" &&
        "statusCode" in error &&
        error.statusCode === 412
      ))
        throw error;
    }
    const existing = await blob.downloadToBuffer();
    if (!existing.equals(bytes))
      throw new AppError(
        409,
        "CONTENT_CONFLICT",
        "File đã tồn tại với nội dung khác.",
      );
    return {
      provider: "azure",
      accountAlias: this.alias,
      container: this.container,
      key,
      deliveryMode: "private",
    };
  }
  async openRead(object: StoredObject): Promise<Readable> {
    const target = await this.target(object);
    const response = await target.getBlobClient(object.key).download();
    if (!response.readableStreamBody)
      throw new AppError(404, "FILE_NOT_FOUND", "Không tìm thấy file ảnh.");
    return response.readableStreamBody as Readable;
  }
  async delete(object: StoredObject): Promise<void> {
    const target = await this.target(object);
    await target.getBlobClient(object.key).deleteIfExists();
  }
}
export class StorageRegistry {
  constructor(private adapters: Map<string, ImageStorage>) {}
  forObject(object: StoredObject): ImageStorage {
    const adapter = this.adapters.get(
      object.provider + ":" + (object.accountAlias ?? ""),
    );
    if (!adapter)
      throw new AppError(
        503,
        "STORAGE_NOT_CONFIGURED",
        "Kho lưu ảnh chưa được cấu hình.",
      );
    return adapter;
  }
}
