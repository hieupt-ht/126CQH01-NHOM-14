import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { Types } from "mongoose";
import { UserModel } from "../../models/user.model.js";
import { AppError } from "../../errors/app-error.js";
import type { ImageStorage, StorageRegistry, StoredObject } from "../../storage/storage.js";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export class AvatarService {
  constructor(private storage: ImageStorage, private registry: StorageRegistry) {}
  private async cleanup(userId: Types.ObjectId, objects: StoredObject[]) {
    for (const object of objects.slice(0, 3)) {
      try {
        await this.registry.forObject(object).delete(object);
        await UserModel.updateOne({ _id: userId }, { $pull: { avatarPendingDeletion: { key: object.key, provider: object.provider } } });
      } catch { /* Retain the private object reference for the next upload's cleanup. */ }
    }
  }
  async replace(userId: Types.ObjectId, bytes: Buffer, mime: string) {
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_AVATAR_BYTES)
      throw new AppError(400, "INVALID_AVATAR", "Ảnh đại diện phải có dung lượng từ 1 byte đến 2 MB.");
    let normalized: Buffer;
    try {
      const image = sharp(bytes, { limitInputPixels: 4096 * 4096, animated: true });
      const meta = await image.metadata();
      const format = mime === "image/jpeg" ? "jpeg" : mime.split("/")[1];
      if (!["png", "jpeg", "webp"].includes(format) || meta.format !== format || !meta.width || !meta.height || meta.width > 4096 || meta.height > 4096 || (meta.pages ?? 1) !== 1) throw new Error("Invalid avatar");
      normalized = await image.rotate().resize(256, 256, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch { throw new AppError(400, "INVALID_AVATAR", "Chọn ảnh PNG, JPEG hoặc WebP tĩnh hợp lệ, tối đa 4096px."); }
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập lại.");
    await this.cleanup(userId, user.avatarPendingDeletion ?? []);
    const remaining = await UserModel.findById(userId);
    if ((remaining?.avatarPendingDeletion.length ?? 0) >= 20)
      throw new AppError(503, "STORAGE_UNAVAILABLE", "Kho ảnh đang bận dọn ảnh cũ. Vui lòng thử lại sau.");
    const revision = randomUUID().replace(/-/g, "");
    let stored: StoredObject;
    try { stored = await this.storage.put(`avatars/${userId}/${revision}/original.webp`, normalized, "image/webp", String(userId)); }
    catch { throw new AppError(503, "STORAGE_UNAVAILABLE", "Chưa lưu được ảnh đại diện. Hồ sơ vẫn giữ ảnh hiện tại."); }
    let saved;
    try {
      saved = await UserModel.findOneAndUpdate({ _id: userId, status: "active", "avatar.revision": user.avatar?.revision ?? null }, {
        $set: { avatar: { storage: stored, revision, bytes: normalized.length } },
        ...(user.avatar ? { $push: { avatarPendingDeletion: user.avatar.storage } } : {}),
      }, { returnDocument: "after", runValidators: true });
    } catch {
      // A database acknowledgement can be lost after commit. Never delete an
      // object until we know it is not the active avatar.
      saved = await UserModel.findOne({ _id: userId, "avatar.revision": revision }).catch(() => null);
      if (!saved) throw new AppError(503, "AVATAR_SAVE_UNCERTAIN", "Chưa xác nhận được việc lưu. Tải lại hồ sơ để kiểm tra trước khi gửi lại.");
    }
    if (!saved) {
      await UserModel.updateOne({ _id: userId }, { $push: { avatarPendingDeletion: stored } });
      await this.cleanup(userId, [stored]);
      throw new AppError(409, "PROFILE_CONFLICT", "Ảnh đại diện đã thay đổi ở yêu cầu khác. Tải lại hồ sơ trước khi thử lại.");
    }
    await this.cleanup(userId, saved.avatarPendingDeletion ?? []);
    return saved;
  }
  async open(userId: Types.ObjectId) {
    const user = await UserModel.findById(userId);
    if (!user?.avatar) throw new AppError(404, "NOT_FOUND", "Chưa có ảnh đại diện.");
    try { return { stream: await this.registry.forObject(user.avatar.storage).openRead(user.avatar.storage), bytes: user.avatar.bytes }; }
    catch { throw new AppError(503, "STORAGE_UNAVAILABLE", "Không tải được ảnh đại diện."); }
  }
}
