import { Router, type Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { pipeline } from "node:stream/promises";
import { AppError } from "../../errors/app-error.js";
import {
  DailyUsageModel,
  GenerationModel,
  ImageModel,
  UserModel,
} from "../../models/index.js";
import type { ImageDocument } from "../../models/image.model.js";
import type { GenerationDocument } from "../../models/generation.model.js";
import {
  principal,
  parseInput,
  requireCsrf,
  requireOrigin,
  requireSession,
  type AuthConfig,
} from "../auth/auth.js";
import type { GenerationService } from "../generations/service.js";
import type { StorageRegistry } from "../../storage/storage.js";

export type ProductDependencies = {
  generations?: GenerationService;
  registry?: StorageRegistry;
  userLimit?: number;
  appLimit?: number;
};
export function imageDto(image: ImageDocument) {
  return {
    id: String(image._id),
    generationId: String(image.generationId),
    title: image.title,
    createdAt: image.createdAt,
    width: image.width,
    height: image.height,
    format: image.format,
    bytes: image.bytes,
    isFavorite: image.isFavorite,
    contentUrl: "/api/v1/images/" + image._id + "/content",
    downloadUrl: "/api/v1/images/" + image._id + "/download",
  };
}
function jobDto(job: GenerationDocument) {
  return {
    id: String(job._id),
    prompt: job.originalPrompt,
    status: job.status,
    model: job.model,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    durationMs: job.durationMs,
    imageId: job.imageId ? String(job.imageId) : null,
    error: job.error
      ? { code: job.error.code, message: job.error.safeMessage }
      : null,
  };
}
function objectId(value: unknown) {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value))
    throw new AppError(404, "NOT_FOUND", "Không tìm thấy dữ liệu.");
  return new Types.ObjectId(value);
}
function pageQuery(query: unknown) {
  const parsed = parseInput(
    z
      .object({
        limit: z.coerce.number().int().min(1).max(50).default(20),
        cursor: z.string().max(300).optional(),
      })
      .strict(),
    query,
  );
  let filter = {};
  if (parsed.cursor) {
    try {
      const cursor = z
        .object({
          id: z.string().regex(/^[a-f0-9]{24}$/),
          date: z.string().datetime(),
        })
        .strict()
        .parse(JSON.parse(Buffer.from(parsed.cursor, "base64url").toString()));
      const date = new Date(cursor.date),
        id = new Types.ObjectId(cursor.id);
      filter = {
        $or: [
          { createdAt: { $lt: date } },
          { createdAt: date, _id: { $lt: id } },
        ],
      };
    } catch {
      throw new AppError(400, "INVALID_CURSOR", "Mã phân trang không hợp lệ.");
    }
  }
  return { limit: parsed.limit, filter };
}
function cursorFor(
  records: { _id: Types.ObjectId; createdAt: Date }[],
  limit: number,
) {
  const last = records[Math.min(limit, records.length) - 1];
  return records.length > limit
    ? Buffer.from(
        JSON.stringify({
          id: String(last._id),
          date: last.createdAt.toISOString(),
        }),
      ).toString("base64url")
    : null;
}
export function createProductRouter(
  config: AuthConfig,
  dependencies: ProductDependencies = {},
) {
  const router = Router();
  router.use(requireOrigin(config), requireSession(config));
  router.use((request, response, next) =>
    ["GET", "HEAD", "OPTIONS"].includes(request.method)
      ? next()
      : requireCsrf(request, response, next),
  );
  const owner = (response: Response) => principal(response).user._id;
  async function ownedImage(id: unknown, response: Response) {
    const image = await ImageModel.findOne({
      _id: objectId(id),
      userId: owner(response),
      deletedAt: null,
    });
    if (!image)
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hình ảnh.");
    return image;
  }
  router.post("/generations", async (request, response) => {
    const { prompt } = parseInput(
      z
        .object({
          prompt: z
            .string()
            .min(1)
            .max(2048)
            .refine((value) => value.trim().length > 0),
        })
        .strict(),
      request.body,
    );
    const key = parseInput(
      z.string().regex(/^[a-zA-Z0-9_-]{16,100}$/),
      request.get("Idempotency-Key"),
    );
    if (!dependencies.generations)
      throw new AppError(
        503,
        "GENERATION_NOT_CONFIGURED",
        "Chưa cấu hình Cloudflare và Cloudinary. Chưa nhận job hoặc trừ lượt.",
      );
    const job = await dependencies.generations.accept(
      owner(response),
      key,
      prompt,
    );
    response.status(202).json({ success: true, data: jobDto(job!) });
  });
  router.get("/generations", async (request, response) => {
    const { limit, filter } = pageQuery(request.query);
    const jobs = await GenerationModel.find({
      userId: owner(response),
      ...filter,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);
    const imageIds = jobs.map((job) => job.imageId).filter(Boolean);
    const available = new Set(
      (
        await ImageModel.find({
          _id: { $in: imageIds },
          userId: owner(response),
          deletedAt: null,
        }).select("_id")
      ).map((image) => String(image._id)),
    );
    response.json({
      success: true,
      data: {
        items: jobs
          .slice(0, limit)
          .map((job) => ({
            ...jobDto(job),
            imageDeleted: Boolean(
              job.imageId && !available.has(String(job.imageId)),
            ),
          })),
        nextCursor: cursorFor(jobs, limit),
      },
    });
  });
  router.get("/generations/:id", async (request, response) => {
    const job = await GenerationModel.findOne({
      _id: objectId(request.params.id),
      userId: owner(response),
    });
    if (!job) throw new AppError(404, "NOT_FOUND", "Không tìm thấy yêu cầu.");
    const exists = job.imageId
      ? await ImageModel.exists({
          _id: job.imageId,
          userId: owner(response),
          deletedAt: null,
        })
      : false;
    response.json({
      success: true,
      data: { ...jobDto(job), imageDeleted: Boolean(job.imageId && !exists) },
    });
  });
  router.get("/images", async (request, response) => {
    const { limit, filter } = pageQuery(request.query);
    const images = await ImageModel.find({
      userId: owner(response),
      deletedAt: null,
      ...filter,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);
    response.json({
      success: true,
      data: {
        items: images.slice(0, limit).map(imageDto),
        nextCursor: cursorFor(images, limit),
      },
    });
  });
  router.get("/images/:id", async (request, response) => {
    const image = await ownedImage(request.params.id, response);
    const job = await GenerationModel.findOne({
      _id: image.generationId,
      userId: owner(response),
    });
    response.json({
      success: true,
      data: {
        ...imageDto(image),
        prompt: job?.originalPrompt ?? "",
        model: job?.model ?? "",
      },
    });
  });
  router.patch("/images/:id", async (request, response) => {
    const input = parseInput(
      z.object({ title: z.string().trim().min(1).max(120) }).strict(),
      request.body,
    );
    const image = await ImageModel.findOneAndUpdate(
      {
        _id: objectId(request.params.id),
        userId: owner(response),
        deletedAt: null,
      },
      { $set: input },
      { returnDocument: "after", runValidators: true },
    );
    if (!image)
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hình ảnh.");
    response.json({ success: true, data: imageDto(image) });
  });
  router.delete("/images/:id", async (request, response) => {
    const image = await ImageModel.findOneAndUpdate(
      {
        _id: objectId(request.params.id),
        userId: owner(response),
        deletedAt: null,
      },
      { $set: { deletedAt: new Date(), storageDeletionStatus: "pending" } },
      { returnDocument: "after" },
    );
    if (!image)
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hình ảnh.");
    response.status(204).end();
  });
  for (const mode of ["content", "download"])
    router.get("/images/:id/" + mode, async (request, response) => {
      const image = await ownedImage(request.params.id, response);
      if (!dependencies.registry)
        throw new AppError(
          503,
          "STORAGE_NOT_CONFIGURED",
          "Chưa cấu hình kho ảnh.",
        );
      let stream;
      try {
        stream = await dependencies.registry
          .forObject(image.storage)
          .openRead(image.storage);
      } catch {
        throw new AppError(
          503,
          "STORAGE_UNAVAILABLE",
          "Không đọc được file ảnh. Vui lòng thử lại sau.",
        );
      }
      response.setHeader("Content-Type", "image/" + image.format);
      response.setHeader(
        "Content-Disposition",
        (mode === "download" ? "attachment" : "inline") +
          '; filename="image-' +
          image._id +
          "." +
          image.format +
          '"',
      );
      response.setHeader("Cache-Control", "private, no-store");
      response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
      await pipeline(stream, response);
    });
  router.get("/usage/me", async (_request, response) => {
    const dateKey = new Date().toISOString().slice(0, 10);
    const usage = await DailyUsageModel.findOne({
      scopeType: "user",
      scopeId: String(owner(response)),
      dateKey,
    });
    const appUsage = await DailyUsageModel.findOne({
      scopeType: "application",
      scopeId: "app",
      dateKey,
    });
    const limit = dependencies.userLimit ?? 5,
      appLimit = dependencies.appLimit ?? 20;
    response.json({
      success: true,
      data: {
        grantedToday: limit,
        acceptedToday: usage?.reservedRequests ?? 0,
        remainingToday: Math.max(
          0,
          Math.min(
            limit - (usage?.reservedRequests ?? 0),
            appLimit - (appUsage?.reservedRequests ?? 0),
          ),
        ),
        resetAt: new Date(Date.parse(dateKey) + 86400000),
        configured: Boolean(dependencies.generations),
      },
    });
  });
  router.patch("/users/me", async (request, response) => {
    const input = parseInput(
      z.object({ displayName: z.string().trim().min(1).max(80) }).strict(),
      request.body,
    );
    const user = await UserModel.findByIdAndUpdate(
      owner(response),
      { $set: input },
      { returnDocument: "after", runValidators: true },
    );
    if (!user)
      throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập lại.");
    response.json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          displayName: user.displayName,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
    });
  });
  router.get("/stats/me", async (_request, response) => {
    const userId = owner(response);
    const [jobsByDay, jobsByStatus, duration, totals] = await Promise.all([
      GenerationModel.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "Asia/Ho_Chi_Minh",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]),
      GenerationModel.aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      GenerationModel.aggregate([
        { $match: { userId, status: "succeeded" } },
        { $group: { _id: null, average: { $avg: "$durationMs" } } },
      ]),
      ImageModel.aggregate([
        { $match: { userId, deletedAt: null } },
        {
          $group: {
            _id: null,
            savedImages: { $sum: 1 },
            bytes: { $sum: "$bytes" },
          },
        },
      ]),
    ]);
    response.json({
      success: true,
      data: {
        jobsByDay,
        jobsByStatus,
        averageDurationMs: duration[0]?.average ?? null,
        totals: totals[0] ?? { savedImages: 0, bytes: 0 },
      },
    });
  });
  return router;
}
