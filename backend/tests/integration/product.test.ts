import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import mongoose, { Types } from "mongoose";
import sharp from "sharp";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../../src/app.js";
import {
  createDeclaredIndexes,
  UserModel,
  ImageModel,
  GenerationModel,
  DailyUsageModel,
} from "../../src/models/index.js";
import { GenerationService } from "../../src/modules/generations/service.js";
import {
  StorageRegistry,
  type ImageStorage,
  type StoredObject,
} from "../../src/storage/storage.js";

test(
  "real replica set: one inference, quota races, storage recovery, ownership and history",
  { timeout: 180000 },
  async () => {
    const repl = await MongoMemoryReplSet.create({
      binary: { version: "8.2.6" },
      replSet: { count: 1 },
    });
    const temp = await mkdtemp(join(tmpdir(), "flux-product-test-"));
    let server: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined;
    try {
      await mongoose.connect(repl.getUri("flux_product_test"));
      await createDeclaredIndexes();
      const png = await sharp({
        create: { width: 64, height: 64, channels: 3, background: "#224466" },
      })
        .png()
        .toBuffer();
      let calls = 0,
        puts = 0,
        failStorage = false;
      const objects = new Map<string, Buffer>();
      const storage: ImageStorage = {
        async put(key, bytes) {
          puts++;
          if (failStorage) throw new Error("simulated outage");
          objects.set(key, bytes);
          return {
            provider: "test",
            accountAlias: "isolated",
            key,
            deliveryMode: "private",
          };
        },
        async openRead(object) {
          assert.ok(objects.has(object.key));
          return Readable.from(objects.get(object.key)!);
        },
        async delete(object) {
          objects.delete(object.key);
        },
      };
      const service = new GenerationService(
        {
          async generate() {
            calls++;
            return png;
          },
        },
        storage,
        { userLimit: 5, appLimit: 20, cooldownMs: 0, checkpointDir: temp },
      );
      server = createApp(
        { frontendOrigin: "http://localhost:5173" },
        {
          generations: service,
          registry: new StorageRegistry(new Map([["test:isolated", storage]])),
        },
      ).listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const base = "http://127.0.0.1:" + address.port + "/api/v1";
      async function account(email: string) {
        await fetch(base + "/auth/register", {
          method: "POST",
          headers: {
            Origin: "http://localhost:5173",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            displayName: "Test",
            email,
            password: "password-123",
          }),
        });
        const response = await fetch(base + "/auth/login", {
          method: "POST",
          headers: {
            Origin: "http://localhost:5173",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password: "password-123" }),
        });
        const body = (await response.json()) as any;
        return {
          cookie: response.headers.get("set-cookie")!.split(";")[0],
          csrf: body.data.csrfToken,
        };
      }
      const a = await account("a@example.test"),
        b = await account("b@example.test");
      async function request(
        path: string,
        method = "GET",
        body?: unknown,
        user = a,
        key?: string,
      ) {
        return fetch(base + path, {
          method,
          headers: {
            Origin: "http://localhost:5173",
            Cookie: user.cookie,
            "X-CSRF-Token": user.csrf,
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(key ? { "Idempotency-Key": key } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
      }
      assert.equal(
        (
          await request(
            "/generations",
            "POST",
            { prompt: " ".repeat(3) },
            a,
            "request-invalid-123",
          )
        ).status,
        400,
      );
      assert.equal(calls, 0);
      const [first, second] = await Promise.all([
        request(
          "/generations",
          "POST",
          { prompt: "Một căn nhà" },
          a,
          "request-duplicate-123",
        ),
        request(
          "/generations",
          "POST",
          { prompt: "Một căn nhà" },
          a,
          "request-duplicate-123",
        ),
      ]);
      assert.equal(first.status, 202);
      assert.equal(second.status, 202);
      const job = ((await first.json()) as any).data;
      assert.equal(((await second.json()) as any).data.id, job.id);
      assert.equal(await GenerationModel.countDocuments({}), 1);
      const usage = await DailyUsageModel.findOne({ scopeType: "user" });
      assert.equal(usage.reservedRequests, 1);
      assert.equal(
        (
          await request(
            "/generations",
            "POST",
            { prompt: "different" },
            a,
            "request-duplicate-123",
          )
        ).status,
        409,
      );
      await service.runOnce();
      assert.equal(calls, 1);
      const completed = await GenerationModel.findById(job.id);
      assert.equal(completed.status, "succeeded");
      const image = await ImageModel.findOne({ generationId: job.id });
      assert.ok(image);
      for (const [path, method, body] of [
        ["/images/" + image._id, "GET", undefined],
        ["/images/" + image._id + "/content", "GET", undefined],
        ["/images/" + image._id, "PATCH", { title: "hack" }],
        ["/images/" + image._id, "DELETE", undefined],
        ["/generations/" + job.id, "GET", undefined],
      ] as const)
        assert.equal((await request(path, method, body, b)).status, 404);
      assert.deepEqual(
        Buffer.from(
          await (
            await request("/images/" + image._id + "/download")
          ).arrayBuffer(),
        ),
        png,
      );
      assert.equal(
        (await request("/images/" + image._id, "PATCH", { title: "New name" }))
          .status,
        200,
      );
      assert.equal(
        (await request("/images/" + image._id, "DELETE")).status,
        204,
      );
      assert.equal((await request("/images/" + image._id)).status, 404);
      assert.equal((await request("/generations/" + job.id)).status, 200);
    const retainedHistory = await (await request("/generations/" + job.id)).json() as { data: { imageDeleted: boolean } };
    assert.equal(retainedHistory.data.imageDeleted, true);
      assert.equal(calls, 1);
      await service.cleanup();
      assert.equal(objects.size, 0);

      // Storage outage retains bytes; retry saving never calls provider again.
      failStorage = true;
      const next = await request(
        "/generations",
        "POST",
        { prompt: "Another image" },
        a,
        "request-saving-123",
      );
      const nextId = ((await next.json()) as any).data.id;
      await service.runOnce();
      assert.equal(calls, 2);
      assert.equal((await GenerationModel.findById(nextId)).status, "saving");
      failStorage = false;
      await GenerationModel.updateOne(
        { _id: nextId },
        { $set: { "lease.expiresAt": new Date(0) } },
      );
      await service.runOnce();
      assert.equal(calls, 2);
      assert.equal(
        (await GenerationModel.findById(nextId)).status,
        "succeeded",
      );
      assert.equal(puts, 3);

      // Ambiguous dispatch is never retried, even if runOnce is invoked again.
      const uncertain = new GenerationService(
        {
          async generate() {
            calls++;
            throw new Error("network timeout");
          },
        },
        storage,
        { userLimit: 5, appLimit: 20, cooldownMs: 0, checkpointDir: temp },
      );
      const unknown = await uncertain.accept(
        (await UserModel.findOne({ email: "a@example.test" }))._id,
        "request-uncertain-123",
        "Unknown outcome",
      );
      await uncertain.runOnce();
      await uncertain.runOnce();
      assert.equal(calls, 3);
      assert.equal(
        (await GenerationModel.findById(unknown._id)).status,
        "needs_review",
      );

      const user = await UserModel.create({
        displayName: "Quota",
        email: "quota@example.test",
        passwordHash: "test-hash",
      });
      const one = new GenerationService(
        {
          async generate() {
            throw new Error("must not call");
          },
        },
        storage,
        { userLimit: 1, appLimit: 20, cooldownMs: 0, checkpointDir: temp },
      );
      const races = await Promise.allSettled([
        one.accept(user._id, "quota-request-key-1", "first"),
        one.accept(user._id, "quota-request-key-2", "second"),
      ]);
      assert.equal(
        races.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(
        await GenerationModel.countDocuments({ userId: user._id }),
        1,
      );
      await UserModel.updateOne(
        { _id: user._id },
        { $set: { activeGenerationId: null } },
      );
      await assert.rejects(
        one.accept(user._id, "quota-request-key-3", "third"),
        (error: unknown) =>
          error instanceof Error &&
          "code" in error &&
          error.code === "DAILY_LIMIT_REACHED",
      );
      assert.equal(
        await GenerationModel.countDocuments({ userId: user._id }),
        1,
      );
      const quotaCounter = await DailyUsageModel.findOne({
        scopeType: "user",
        scopeId: String(user._id),
      });
      assert.equal(quotaCounter!.reservedRequests, 1);

      const beforeDispatchUser = await UserModel.create({
        displayName: "Before dispatch",
        email: "before-dispatch@example.test",
        passwordHash: "test-hash",
      });
      const blockedPath = join(temp, "not-a-directory");
      await writeFile(blockedPath, "test");
      const noDispatch = new GenerationService(
        {
          async generate() {
            throw new Error("provider must not be called");
          },
        },
        storage,
        {
          userLimit: 5,
          appLimit: 20,
          cooldownMs: 0,
          checkpointDir: blockedPath,
        },
      );
      // Finish the queued quota test first, otherwise the worker correctly picks the oldest queue item.
      await GenerationModel.updateMany(
        { userId: user._id, status: "queued" },
        { $set: { status: "failed" } },
      );
      const beforeDispatchJob = await noDispatch.accept(
        beforeDispatchUser._id,
        "before-dispatch-key-123",
        "Never sent",
      );
      await noDispatch.runOnce();
      assert.equal(
        (await GenerationModel.findById(beforeDispatchJob!._id))!.status,
        "failed",
      );
      assert.equal(
        (await DailyUsageModel.findOne({
          scopeType: "user",
          scopeId: String(beforeDispatchUser._id),
        }))!.reservedRequests,
        0,
      );
      assert.equal(calls, 3);
      const stats = await request("/stats/me");
      assert.equal(stats.status, 200);
      assert.equal((await request("/images?cursor=bad")).status, 400);
    } finally {
      if (server)
        await new Promise<void>((resolve) => server!.close(() => resolve()));
      await mongoose.disconnect();
      await repl.stop();
      await rm(temp, { recursive: true, force: true });
    }
  },
);
