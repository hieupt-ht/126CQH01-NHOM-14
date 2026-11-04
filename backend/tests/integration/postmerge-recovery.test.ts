import assert from "node:assert/strict";
import { test } from "node:test";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import sharp from "sharp";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createDeclaredIndexes, DailyUsageModel, GenerationModel, ImageModel, UserModel } from "../../src/models/index.js";
import { GenerationService } from "../../src/modules/generations/service.js";
import type { ImageStorage } from "../../src/storage/storage.js";

test("post-merge recovery: expired lease, restart, saving cap and cleanup backoff", { timeout: 180000 }, async (t) => {
  const repl = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  const temp = await mkdtemp(join(tmpdir(), "flux-postmerge-"));
  try {
    await mongoose.connect(repl.getUri("flux_postmerge_recovery_test"));
    await createDeclaredIndexes();
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#224466" } }).png().toBuffer();
    let fixtureNumber = 0;
    async function fixture() {
      const number = fixtureNumber++;
      const user = await UserModel.create({ displayName: "Synthetic recovery test", email: "recovery-" + number + "@example.test", passwordHash: "unused-fixture-hash" });
      const state = { inference: 0, puts: 0, deletes: 0, failPut: false, loseUploadResponse: false, failDelete: false };
      const objects = new Map<string, Buffer>();
      const storage: ImageStorage = {
        async put(key, bytes) {
          state.puts++;
          if (state.failPut) throw new Error("Simulated storage outage");
          if (objects.has(key)) assert.deepEqual(objects.get(key), bytes, "retry must preserve bytes at the same key");
          else objects.set(key, Buffer.from(bytes));
          if (state.loseUploadResponse) { state.loseUploadResponse = false; throw new Error("Upload stored but response lost"); }
          return { provider: "test", accountAlias: "isolated", key, deliveryMode: "private" };
        },
        async openRead(object) { assert.ok(objects.has(object.key)); return Readable.from(objects.get(object.key)!); },
        async delete(object) {
          state.deletes++;
          if (state.failDelete) throw new Error("Simulated cleanup failure");
          objects.delete(object.key);
        },
      };
      const checkpointDir = join(temp, "fixture-" + number);
      const worker = () => new GenerationService({ async generate() { state.inference++; return png; } }, storage,
        { userLimit: 5, appLimit: 100, cooldownMs: 0, checkpointDir });
      const service = worker();
      const job = await service.accept(user._id, "recovery-request-key-" + number, "Synthetic test; no cloud calls");
      assert.ok(job);
      const reserved = async () => (await DailyUsageModel.findOne({ scopeType: "user", scopeId: String(user._id) }))!.reservedRequests;
      return { user, job, state, objects, worker, service, checkpointDir, reserved };
    }

    await t.test("two users race for the final app slot: one reservation, no orphan job or lock", async () => {
      const users = await UserModel.create(["one", "two"].map((suffix) => ({
        displayName: "App quota fixture", email: "app-race-" + suffix + "@example.test", passwordHash: "unused-fixture-hash",
      })));
      let inference = 0;
      const noCloud: ImageStorage = {
        async put() { throw new Error("No uploads in acceptance race"); },
        async openRead() { throw new Error("No reads in acceptance race"); },
        async delete() { throw new Error("No deletes in acceptance race"); },
      };
      const service = new GenerationService({ async generate() { inference++; throw new Error("No inference in acceptance race"); } },
        noCloud, { userLimit: 5, appLimit: 1, cooldownMs: 0, checkpointDir: join(temp, "app-race") });
      const outcomes = await Promise.allSettled(users.map((user, index) => service.accept(user._id, "app-race-request-key-" + index, "Synthetic concurrent app quota")));
      assert.equal(outcomes.filter((value) => value.status === "fulfilled").length, 1);
      const rejected = outcomes.find((value) => value.status === "rejected");
      assert.ok(rejected?.status === "rejected");
      assert.equal(rejected.reason.code, "DAILY_LIMIT_REACHED");
      const scope = { userId: { $in: users.map((user) => user._id) } };
      assert.equal(await GenerationModel.countDocuments(scope), 1);
      assert.equal((await DailyUsageModel.findOne({ scopeType: "application" }))!.reservedRequests, 1);
      const userCounters = await DailyUsageModel.find({ scopeType: "user", scopeId: { $in: users.map((user) => String(user._id)) } });
      assert.equal(userCounters.reduce((sum, item) => sum + item.reservedRequests, 0), 1);
      assert.equal(await UserModel.countDocuments({ _id: { $in: users.map((user) => user._id) }, activeGenerationId: { $ne: null } }), 1);
      assert.equal(inference, 0);
      // Retire only these isolated queued fixtures before later worker scenarios.
      await GenerationModel.updateMany(scope, { $set: { status: "failed" } });
      await UserModel.updateMany({ _id: { $in: users.map((user) => user._id) } }, { $set: { activeGenerationId: null } });
    });

    await t.test("one active lock wins even with five user slots available", async () => {
      const user = await UserModel.create({ displayName: "Active lock fixture", email: "active-race@example.test", passwordHash: "unused-fixture-hash" });
      const noCloud: ImageStorage = {
        async put() { throw new Error("No uploads in active race"); },
        async openRead() { throw new Error("No reads in active race"); },
        async delete() { throw new Error("No deletes in active race"); },
      };
      const service = new GenerationService({ async generate() { throw new Error("No inference in active race"); } },
        noCloud, { userLimit: 5, appLimit: 100, cooldownMs: 0, checkpointDir: join(temp, "active-race") });
      const outcomes = await Promise.allSettled([0, 1].map((index) => service.accept(user._id, "active-race-request-key-" + index, "Synthetic concurrent active lock")));
      assert.equal(outcomes.filter((value) => value.status === "fulfilled").length, 1);
      const rejected = outcomes.find((value) => value.status === "rejected");
      assert.ok(rejected?.status === "rejected");
      assert.equal(rejected.reason.code, "GENERATION_IN_PROGRESS");
      assert.equal(await GenerationModel.countDocuments({ userId: user._id }), 1);
      assert.equal((await DailyUsageModel.findOne({ scopeType: "user", scopeId: String(user._id) }))!.reservedRequests, 1);
      await GenerationModel.updateMany({ userId: user._id }, { $set: { status: "failed" } });
      await UserModel.updateOne({ _id: user._id }, { $set: { activeGenerationId: null } });
    });

    await t.test("expired processing lease needs review without a second inference or quota refund", async () => {
      const f = await fixture();
      await GenerationModel.updateOne({ _id: f.job._id }, { $set: {
        status: "processing", startedAt: new Date(),
        lease: { owner: "previous-worker", expiresAt: new Date(0), heartbeatAt: new Date(0) },
        checkpoint: { stage: "dispatch_intent", storageKey: "" },
      } });
      const restarted = f.worker();
      await restarted.runOnce();
      await restarted.runOnce();
      const job = await GenerationModel.findById(f.job._id);
      assert.equal(job!.status, "needs_review");
      assert.equal(job!.error!.code, "RESULT_UNCERTAIN");
      assert.equal(job!.lease, null);
      assert.equal((await UserModel.findById(f.user._id))!.activeGenerationId, null);
      assert.equal(await f.reserved(), 1);
      assert.equal(f.state.inference, 0);
      assert.equal(f.state.puts, 0);
      assert.equal(await ImageModel.countDocuments({ generationId: f.job._id }), 0);
    });

    await t.test("queued job survives a new worker and is inferred only once", async () => {
      const f = await fixture();
      const restarted = f.worker();
      await restarted.runOnce();
      await restarted.runOnce();
      assert.equal((await GenerationModel.findById(f.job._id))!.status, "succeeded");
      assert.equal(f.state.inference, 1);
      assert.equal(f.state.puts, 1);
      assert.equal(f.objects.size, 1);
      assert.equal(await ImageModel.countDocuments({ generationId: f.job._id }), 1);
      assert.equal(await f.reserved(), 1);
    });

    await t.test("three saving failures retain checkpoint and stop at needs_review without inference retry", async () => {
      const f = await fixture();
      f.state.failPut = true;
      await f.service.runOnce();
      assert.equal((await GenerationModel.findById(f.job._id))!.status, "saving");
      for (let attempt = 2; attempt <= 3; attempt++) {
        await GenerationModel.updateOne({ _id: f.job._id }, { $set: { "lease.expiresAt": new Date(0) } });
        await f.worker().runOnce();
        assert.equal((await GenerationModel.findById(f.job._id))!.savingAttempts, attempt);
      }
      await f.worker().runOnce();
      const job = await GenerationModel.findById(f.job._id);
      assert.equal(job!.status, "needs_review");
      assert.equal(job!.error!.code, "STORAGE_FAILED");
      assert.equal(f.state.inference, 1);
      assert.equal(f.state.puts, 3);
      assert.equal(await ImageModel.countDocuments({ generationId: f.job._id }), 0);
      assert.equal((await UserModel.findById(f.user._id))!.activeGenerationId, null);
      assert.equal(await f.reserved(), 1);
      await access(join(f.checkpointDir, String(f.job._id) + ".bin"));
    });

    await t.test("lost upload response recovers one stored object and one image with the same key", async () => {
      const f = await fixture();
      f.state.loseUploadResponse = true;
      await f.service.runOnce();
      assert.equal((await GenerationModel.findById(f.job._id))!.status, "saving");
      assert.equal(f.objects.size, 1);
      assert.equal(await ImageModel.countDocuments({ generationId: f.job._id }), 0);
      const key = [...f.objects.keys()][0];
      await GenerationModel.updateOne({ _id: f.job._id }, { $set: { "lease.expiresAt": new Date(0) } });
      await f.worker().runOnce();
      assert.equal((await GenerationModel.findById(f.job._id))!.status, "succeeded");
      const image = await ImageModel.findOne({ generationId: f.job._id });
      assert.equal(image!.storage.key, key);
      assert.equal(f.objects.size, 1);
      assert.equal(await ImageModel.countDocuments({ generationId: f.job._id }), 1);
      assert.equal(f.state.inference, 1);
      assert.equal(f.state.puts, 2);
      assert.equal(f.state.deletes, 0);
      assert.equal(await f.reserved(), 1);
    });

    await t.test("cleanup backs off and stops after five failures while retaining history and quota", async () => {
      const f = await fixture();
      await f.service.runOnce();
      const image = await ImageModel.findOne({ generationId: f.job._id });
      assert.ok(image);
      await ImageModel.updateOne({ _id: image._id }, { $set: { deletedAt: new Date(), storageDeletionStatus: "pending" } });
      f.state.failDelete = true;
      for (let attempt = 1; attempt <= 5; attempt++) {
        if (attempt > 1) await ImageModel.updateOne({ _id: image._id }, { $set: { storageCleanupNextAt: new Date(0) } });
        const before = Date.now();
        await f.service.cleanup();
        const retained = await ImageModel.findById(image._id);
        assert.equal(retained!.storageCleanupAttempts, attempt);
        assert.equal(retained!.storageDeletionStatus, "failed");
        assert.ok(retained!.storageCleanupNextAt!.getTime() >= before + 30000 * 2 ** (attempt - 1));
        await f.service.cleanup();
        assert.equal(f.state.deletes, attempt, "immediate retry must respect backoff");
      }
      await ImageModel.updateOne({ _id: image._id }, { $set: { storageCleanupNextAt: new Date(0) } });
      await f.service.cleanup();
      assert.equal(f.state.deletes, 5);
      assert.equal(f.objects.size, 1, "failed cleanup must not claim cloud file deletion");
      assert.equal((await GenerationModel.findById(f.job._id))!.status, "succeeded");
      assert.equal(await ImageModel.countDocuments({ userId: f.user._id, deletedAt: null }), 0);
      assert.equal(await f.reserved(), 1);
      assert.equal(f.state.inference, 1);
    });
  } finally {
    await mongoose.disconnect();
    await repl.stop();
    assert.equal(dirname(temp), tmpdir());
    assert.ok(basename(temp).startsWith("flux-postmerge-"));
    await rm(temp, { recursive: true, force: true });
  }
});
