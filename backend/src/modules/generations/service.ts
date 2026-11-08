import mongoose, { Types } from "mongoose";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, unlink, readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { DEFAULT_PRESENTATION, applyImageStyle, padImageToRatio, type Presentation } from "./presentation.js";
import {
  DailyUsageModel,
  GenerationModel,
  ImageModel,
  UserModel,
} from "../../models/index.js";
import { AppError } from "../../errors/app-error.js";
import type { GenerationDocument } from "../../models/generation.model.js";
import type { NormalizedReferenceImage } from "./reference-image.js";
import type { ImageProvider } from "../../providers/cloudflare.js";
import {
  containsVietnameseText,
  MAX_TRANSLATED_PROMPT_LENGTH,
  type PromptTranslator,
} from "../../providers/prompt-translation.js";
import {
  digest,
  type ImageStorage,
  type StorageRegistry,
} from "../../storage/storage.js";

export type GenerationOptions = {
  userLimit: number;
  appLimit: number;
  cooldownMs: number;
  checkpointDir: string;
};
const TEXT_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const REFERENCE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
export class GenerationService {
  private workerId = randomUUID();
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private provider: ImageProvider,
    private storage: ImageStorage,
    private options: GenerationOptions,
    private registry?: StorageRegistry,
    private inferenceEnabled = true,
    private promptTranslator?: PromptTranslator,
    private promptTranslationEnabled = false,
  ) {}
  private referencePath(id: Types.ObjectId) {
    return join(this.options.checkpointDir, String(id) + ".input.png");
  }
  private async removeReferenceImage(id: Types.ObjectId) {
    await unlink(this.referencePath(id)).catch(() => undefined);
  }
  private matchReplay(job: GenerationDocument, fingerprint: string, prompt: string, presentation: Presentation, referenceSha256: string | null) {
    if (job.requestFingerprint !== fingerprint || job.originalPrompt !== prompt ||
      (job.settings.aspectRatio ?? "auto") !== presentation.aspectRatio ||
      (job.settings.style ?? "none") !== presentation.style ||
      (job.referenceImage?.sha256 ?? null) !== referenceSha256)
      throw new AppError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "Mã yêu cầu đã được dùng cho mô tả khác.",
      );
    return job;
  }
  async accept(
    userId: Types.ObjectId,
    requestKey: string,
    prompt: string,
    presentation: Presentation = DEFAULT_PRESENTATION,
    referenceImage?: NormalizedReferenceImage,
    expectedReferenceSha256?: string,
  ) {
    const referenceSha256 = referenceImage?.sha256 ?? expectedReferenceSha256 ?? null;
    if (referenceImage && expectedReferenceSha256 && referenceImage.sha256 !== expectedReferenceSha256)
      throw new AppError(400, "INVALID_REFERENCE_IMAGE", "Ảnh tham chiếu không khớp yêu cầu.");
    if (referenceSha256 && !/^[a-f0-9]{64}$/.test(referenceSha256))
      throw new AppError(400, "INVALID_REFERENCE_IMAGE", "Ảnh tham chiếu không hợp lệ.");
    // Preserve fingerprints for legacy/default requests; explicit options are part of intent.
    const intent = presentation.aspectRatio === "auto" && presentation.style === "none"
      ? (referenceSha256 ? JSON.stringify([prompt, presentation.aspectRatio, presentation.style, referenceSha256]) : prompt)
      : JSON.stringify([prompt, presentation.aspectRatio, presentation.style, ...(referenceSha256 ? [referenceSha256] : [])]);
    const fingerprint = createHash("sha256").update(intent).digest("hex");
    const replay = await GenerationModel.findOne({ userId, requestKey });
    if (replay) return this.matchReplay(replay, fingerprint, prompt, presentation, referenceSha256);
    if (referenceSha256 && !referenceImage)
      throw new AppError(400, "REFERENCE_IMAGE_REQUIRED", "Hãy đính kèm lại ảnh để gửi yêu cầu này.");
    let submittedPrompt = prompt;
    if (this.promptTranslationEnabled && containsVietnameseText(prompt)) {
      if (!this.promptTranslator)
        throw new AppError(
          502,
          "GENERATION_FAILED",
          "Không thể dịch mô tả. Yêu cầu chưa được tạo; vui lòng thử lại sau.",
        );
      submittedPrompt = await this.promptTranslator.translateVietnameseToEnglish(prompt);
      if (!submittedPrompt.trim())
        throw new AppError(
          502,
          "GENERATION_FAILED",
          "Không thể dịch mô tả. Yêu cầu chưa được tạo; vui lòng thử lại sau.",
        );
      if (submittedPrompt.length > MAX_TRANSLATED_PROMPT_LENGTH)
        throw new AppError(
          400,
          "INVALID_PROMPT",
          "Bản dịch vượt giới hạn mô tả. Yêu cầu chưa được tạo; vui lòng rút gọn mô tả.",
        );
    }
    submittedPrompt = applyImageStyle(submittedPrompt, presentation.style);
    const id = new Types.ObjectId(),
      now = new Date(),
      dateKey = now.toISOString().slice(0, 10);
    try {
      if (referenceImage) {
        await mkdir(this.options.checkpointDir, { recursive: true });
        await writeFile(this.referencePath(id) + ".tmp", referenceImage.bytes, { mode: 0o600 });
        await rename(this.referencePath(id) + ".tmp", this.referencePath(id));
      }
      await mongoose.connection.transaction(async (session) => {
        const existing = await GenerationModel.findOne({
          userId,
          requestKey,
        }).session(session);
        if (existing) {
          this.matchReplay(existing, fingerprint, prompt, presentation, referenceSha256);
          return;
        }
        const user = await UserModel.findOneAndUpdate(
          {
            _id: userId,
            status: "active",
            activeGenerationId: null,
            $or: [
              { lastGenerationAt: null },
              {
                lastGenerationAt: {
                  $lte: new Date(Date.now() - this.options.cooldownMs),
                },
              },
            ],
          },
          { $set: { activeGenerationId: id, lastGenerationAt: now } },
          { session, returnDocument: "after" },
        );
        if (!user)
          throw new AppError(
            409,
            "GENERATION_IN_PROGRESS",
            "Đang có yêu cầu hoặc bạn đang tạo quá nhanh.",
          );
        for (const [scopeType, scopeId, limit] of [
          ["user", String(userId), this.options.userLimit],
          ["application", "app", this.options.appLimit],
        ] as const) {
          await DailyUsageModel.updateOne(
            { scopeType, scopeId, dateKey },
            { $setOnInsert: { reservedRequests: 0 } },
            { upsert: true, session },
          );
          const result = await DailyUsageModel.updateOne(
            { scopeType, scopeId, dateKey, reservedRequests: { $lt: limit } },
            { $inc: { reservedRequests: 1 } },
            { session },
          );
          if (!result.modifiedCount)
            throw new AppError(
              429,
              "DAILY_LIMIT_REACHED",
              "Đã hết lượt tạo hôm nay.",
            );
        }
        await GenerationModel.create(
          [
            {
              _id: id,
              userId,
              requestKey,
              requestFingerprint: fingerprint,
              originalPrompt: prompt,
              submittedPrompt,
              referenceImage: referenceImage
                ? {
                    sha256: referenceImage.sha256,
                    width: referenceImage.width,
                    height: referenceImage.height,
                    format: referenceImage.format,
                  }
                : null,
              provider: "cloudflare",
              model: referenceImage ? REFERENCE_MODEL : TEXT_MODEL,
              settings: { steps: 4, ...presentation,
                ...(this.promptTranslationEnabled && containsVietnameseText(prompt) && this.promptTranslator?.revision
                  ? { promptTranslation: { model: this.promptTranslator.model ?? "unknown", revision: this.promptTranslator.revision } } : {}),
              },
              quotaReservation: {
                dateKey,
                userReserved: true,
                appReserved: true,
                releasedAt: null,
              },
            },
          ],
          { session },
        );
      });
    } catch (error) {
      await this.removeReferenceImage(id);
      await unlink(this.referencePath(id) + ".tmp").catch(() => undefined);
      const existing = await GenerationModel.findOne({ userId, requestKey });
      if (existing) return this.matchReplay(existing, fingerprint, prompt, presentation, referenceSha256);
      throw error;
    }
    const savedJob = await GenerationModel.findOne({ userId, requestKey });
    if (savedJob && String(savedJob._id) !== String(id))
      await this.removeReferenceImage(id);
    return savedJob;
  }
  start() {
    if (this.timer || this.running) return;
    const tick = async () => {
      this.running = true;
      try {
        await this.runOnce();
        await this.cleanup();
      } catch {
        console.error(
          "Worker operation failed; persisted jobs will be reviewed on the next tick.",
        );
      } finally {
        this.running = false;
        if (this.timer) this.timer = setTimeout(tick, 2000);
      }
    };
    this.timer = setTimeout(tick, 0);
  }
  async stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    while (this.running)
      await new Promise((resolve) => setTimeout(resolve, 50));
  }
  private async terminal(
    id: Types.ObjectId,
    status: "failed" | "needs_review",
    code: string,
    message: string,
  ) {
    let transitioned = false;
    await mongoose.connection.transaction(async (session) => {
      const job = await GenerationModel.findOneAndUpdate(
        {
          _id: id,
          status: { $in: ["processing", "saving"] },
          "lease.owner": this.workerId,
        },
        {
          $set: {
            status,
            completedAt: new Date(),
            lease: null,
            error: {
              code,
              safeMessage: message,
              stage: status,
              occurredAt: new Date(),
            },
          },
        },
        { session, returnDocument: "after" },
      );
      if (job) {
        transitioned = true;
        await UserModel.updateOne(
          { _id: job.userId, activeGenerationId: id },
          { $set: { activeGenerationId: null } },
          { session },
        );
      }
    });
    if (transitioned) await this.removeReferenceImage(id);
  }
  async runOnce() {
    const now = new Date();
    // Never resend expired dispatched requests. Claim their lease before finalization.
    const stale = await GenerationModel.findOneAndUpdate(
      { status: "processing", "lease.expiresAt": { $lt: now } },
      {
        $set: {
          "lease.owner": this.workerId,
          "lease.expiresAt": new Date(Date.now() + 300000),
        },
      },
      { returnDocument: "after" },
    );
    if (stale) {
      await this.terminal(
        stale._id,
        "needs_review",
        "RESULT_UNCERTAIN",
        "Server bị gián đoạn khi đang gọi AI; không tự tạo lại.",
      );
      return;
    }
    const lease = {
      owner: this.workerId,
      expiresAt: new Date(Date.now() + 300000),
      heartbeatAt: now,
    };
    let job = await GenerationModel.findOneAndUpdate(
      { status: "saving", "lease.expiresAt": { $lt: now } },
      { $set: { lease } },
      { returnDocument: "after" },
    );
    if (!job && this.inferenceEnabled)
      job = await GenerationModel.findOneAndUpdate(
        { status: "queued" },
        {
          $set: {
            status: "processing",
            startedAt: now,
            lease,
            checkpoint: { stage: "dispatch_intent", storageKey: "" },
          },
        },
        { sort: { createdAt: 1 }, returnDocument: "after" },
      );
    if (!job) return;
    const path = join(this.options.checkpointDir, String(job._id) + ".bin");
    let dispatchStarted = job.status === "saving";
    const heartbeat = setInterval(() => {
      void GenerationModel.updateOne(
        {
          _id: job._id,
          "lease.owner": this.workerId,
          status: { $in: ["processing", "saving"] },
        },
        {
          $set: {
            "lease.expiresAt": new Date(Date.now() + 300000),
            "lease.heartbeatAt": new Date(),
          },
        },
      ).catch(() => undefined);
    }, 30000);
    try {
      await GenerationModel.updateOne(
        { _id: job._id, "lease.owner": this.workerId },
        { $inc: { savingAttempts: 1 } },
      );
      await mkdir(this.options.checkpointDir, { recursive: true });
      let bytes: Buffer;
      if (job.status === "saving") bytes = await readFile(path);
      else {
        const referenceImage = job.referenceImage
          ? await readFile(this.referencePath(job._id))
          : undefined;
        try {
          dispatchStarted = true;
          bytes = await this.provider.generate(job.submittedPrompt, referenceImage);
        } catch (error) {
          const known =
            error instanceof AppError && error.code !== "RESULT_UNCERTAIN";
          await this.terminal(
            job._id,
            known ? "failed" : "needs_review",
            known ? error.code : "RESULT_UNCERTAIN",
            known
              ? error.message
              : "Chưa xác định kết quả AI. Không tự tạo lại.",
          );
          return;
        }
        await writeFile(path + ".tmp", bytes, { mode: 0o600 });
        await rename(path + ".tmp", path);
        await GenerationModel.updateOne(
          { _id: job._id, "lease.owner": this.workerId },
          {
            $set: {
              status: "saving",
              checkpoint: {
                stage: "bytes_saved",
                storageKey: String(job._id) + ".bin",
              },
            },
          },
        );
        if (job.referenceImage) await this.removeReferenceImage(job._id);
      }
      bytes = await padImageToRatio(bytes, (job.settings.aspectRatio ?? "auto") as Presentation["aspectRatio"]);
      if (bytes.length > 10 * 1024 * 1024)
        throw new AppError(
          502,
          "INVALID_IMAGE",
          "Ảnh vượt dung lượng cho phép.",
        );
      const meta = await sharp(bytes, { limitInputPixels: 4096 * 4096 })
        .metadata()
        .catch(() => {
          throw new AppError(
            502,
            "INVALID_IMAGE",
            "Không đọc được định dạng ảnh.",
          );
        });
      if (
        !meta.width ||
        !meta.height ||
        meta.width > 4096 ||
        meta.height > 4096 ||
        !["png", "jpeg", "webp"].includes(meta.format ?? "")
      )
        throw new AppError(
          502,
          "INVALID_IMAGE",
          "Định dạng hoặc kích thước ảnh không hợp lệ.",
        );
      // Force a decode, not just a header read, before committing bytes to cloud.
      await sharp(bytes, { limitInputPixels: 4096 * 4096 })
        .stats()
        .catch(() => {
          throw new AppError(502, "INVALID_IMAGE", "Dữ liệu ảnh không đầy đủ.");
        });
      const storage = await this.storage.put(
        "generations/" + String(job._id) + "/original." + meta.format,
        bytes,
        "image/" + meta.format,
        String(job.userId),
      );
      await mongoose.connection.transaction(async (session) => {
        const owned = await GenerationModel.findOne({
          _id: job._id,
          status: "saving",
          "lease.owner": this.workerId,
        }).session(session);
        if (!owned) throw new Error("Lease lost");
        const image = await ImageModel.findOneAndUpdate(
          { generationId: job._id },
          {
            $setOnInsert: {
              userId: job.userId,
              generationId: job._id,
              title: job.originalPrompt.trim().slice(0, 80),
              storage,
              storageRevision: 1,
              integrity: { sha256: digest(bytes) },
              width: meta.width,
              height: meta.height,
              format: meta.format,
              bytes: bytes.length,
            },
          },
          {
            returnDocument: "after",
            upsert: true,
            session,
            runValidators: true,
          },
        );
        await GenerationModel.updateOne(
          { _id: job._id },
          {
            $set: {
              status: "succeeded",
              imageId: image._id,
              completedAt: new Date(),
              durationMs:
                Date.now() - (job.startedAt ?? job.createdAt).getTime(),
              lease: null,
              error: null,
            },
          },
          { session },
        );
        await UserModel.updateOne(
          { _id: job.userId, activeGenerationId: job._id },
          { $set: { activeGenerationId: null } },
          { session },
        );
      });
      await unlink(path).catch(() => undefined);
    } catch (error) {
      if (!dispatchStarted) {
        await this.failBeforeDispatch(job._id);
      } else if (error instanceof AppError && error.code === "INVALID_IMAGE")
        await this.terminal(job._id, "failed", error.code, error.message);
      else {
        // Keep durable saving checkpoint for retry; processing without checkpoint is uncertain.
        const saved = await GenerationModel.findById(job._id);
        if (saved?.status === "processing")
          await this.terminal(
            job._id,
            "needs_review",
            "RESULT_UNCERTAIN",
            "Kết quả chưa được lưu đầy đủ; cần kiểm tra.",
          );
        else if ((saved?.savingAttempts ?? 0) >= 3)
          await this.terminal(
            job._id,
            "needs_review",
            "STORAGE_FAILED",
            "Không lưu được ảnh sau ba lần. Checkpoint được giữ để kiểm tra.",
          );
        else
          await GenerationModel.updateOne(
            { _id: job._id, status: "saving", "lease.owner": this.workerId },
            {
              $set: {
                "lease.expiresAt": new Date(Date.now() + 30000),
                error: {
                  code: "STORAGE_FAILED",
                  safeMessage:
                    "Chưa lưu được ảnh; hệ thống giữ checkpoint để phục hồi.",
                  stage: "saving",
                  occurredAt: new Date(),
                },
              },
            },
          );
      }
    } finally {
      clearInterval(heartbeat);
    }
  }
  private async failBeforeDispatch(id: Types.ObjectId) {
    let transitioned = false;
    await mongoose.connection.transaction(async (session) => {
      const job = await GenerationModel.findOneAndUpdate(
        {
          _id: id,
          status: "processing",
          "lease.owner": this.workerId,
          "quotaReservation.releasedAt": null,
        },
        {
          $set: {
            status: "failed",
            lease: null,
            completedAt: new Date(),
            "quotaReservation.releasedAt": new Date(),
            error: {
              code: "CHECKPOINT_UNAVAILABLE",
              safeMessage:
                "Chưa gửi được yêu cầu vì không chuẩn bị được nơi lưu tạm. Lượt đã hoàn.",
              stage: "pre_dispatch",
              occurredAt: new Date(),
            },
          },
        },
        { session, returnDocument: "after" },
      );
      if (!job) return;
      transitioned = true;
      for (const [scopeType, scopeId] of [
        ["user", String(job.userId)],
        ["application", "app"],
      ] as const) {
        await DailyUsageModel.updateOne(
          {
            scopeType,
            scopeId,
            dateKey: job.quotaReservation.dateKey,
            reservedRequests: { $gt: 0 },
          },
          { $inc: { reservedRequests: -1 } },
          { session },
        );
      }
      await UserModel.updateOne(
        { _id: job.userId, activeGenerationId: id },
        { $set: { activeGenerationId: null } },
        { session },
      );
    });
    if (transitioned) await this.removeReferenceImage(id);
  }
  async cleanup() {
    const checkpointFiles = await readdir(this.options.checkpointDir).catch(() => [] as string[]);
    const inputFiles = checkpointFiles.filter((name) => /^[a-f0-9]{24}\.input\.png$/i.test(name)).slice(0, 25);
    const ids = inputFiles.map((file) => new Types.ObjectId(file.slice(0, 24)));
    const activeIds = new Set((await GenerationModel.find({ _id: { $in: ids }, status: { $in: ["queued", "processing"] } }).select("_id")).map((job) => String(job._id)));
    for (const file of inputFiles) {
      if (!activeIds.has(file.slice(0, 24)))
        await unlink(join(this.options.checkpointDir, file)).catch(() => undefined);
    }
    const images = await ImageModel.find({
      deletedAt: { $ne: null },
      storageDeletionStatus: { $in: ["pending", "failed"] },
      storageCleanupAttempts: { $lt: 5 },
      $or: [{ storageCleanupNextAt: null }, { storageCleanupNextAt: { $lte: new Date() } }],
    }).limit(10);
    for (const image of images) {
      try {
        await (
          this.registry ? this.registry.forObject(image.storage) : this.storage
        ).delete(image.storage);
        await ImageModel.updateOne(
          { _id: image._id },
          { $set: { storageDeletionStatus: "deleted", storageCleanupNextAt: null } },
        );
      } catch {
        await ImageModel.updateOne(
          { _id: image._id },
          { $inc: { storageCleanupAttempts: 1 }, $set: { storageDeletionStatus: "failed", storageCleanupNextAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** image.storageCleanupAttempts)) } },
        );
      }
    }
  }
}
