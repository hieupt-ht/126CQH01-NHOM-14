import assert from "node:assert/strict";
import { once } from "node:events";
import { Readable } from "node:stream";
import { test } from "node:test";
import mongoose, { Types } from "mongoose";
import sharp from "sharp";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../../src/app.js";
import { createDeclaredIndexes, DailyUsageModel, GenerationModel, ImageModel } from "../../src/models/index.js";
import { StorageRegistry, type ImageStorage } from "../../src/storage/storage.js";

test("library/history: owner scoping, tied cursors, private files and soft-delete", { timeout: 180000 }, async (t) => {
  const repl = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  let server: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined;
  try {
    await mongoose.connect(repl.getUri("flux_library_history_test"));
    await createDeclaredIndexes();
    const bytes = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#224466" } }).png().toBuffer();
    let reads = 0;
    let unavailable = false;
    let interrupted = false;
    const storage: ImageStorage = {
      async put() { throw new Error("No uploads permitted in this test"); },
      async openRead() {
        reads++;
        if (unavailable) throw new Error("SDK secret and private/path must never reach response");
        if (interrupted) return Readable.from((async function* () {
          yield bytes.subarray(0, 3);
          await new Promise<void>((done) => setImmediate(done));
          throw new Error("Sensitive SDK stream failure");
        })());
        return Readable.from(bytes);
      },
      async delete() { throw new Error("Cleanup belongs to worker; API only soft-deletes"); },
    };
    const origin = "http://localhost:5173";
    server = createApp({ frontendOrigin: origin, jwtSecret: "isolated-library-test-secret-at-least-32-bytes" }, {
      registry: new StorageRegistry(new Map([["test:isolated", storage]])),
    }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = "http://127.0.0.1:" + address.port + "/api/v1";
    async function account(email: string) {
      const registration = await fetch(base + "/auth/register", {
        method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Library test", email, password: "isolated-test-password" }),
      });
      assert.equal(registration.status, 201);
      const registered = await registration.json() as { data: { user: { id: string } } };
      const login = await fetch(base + "/auth/login", {
        method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "isolated-test-password" }),
      });
      assert.equal(login.status, 200);
      const logged = await login.json() as { data: { csrfToken: string } };
      return { id: new Types.ObjectId(registered.data.user.id), cookie: login.headers.get("set-cookie")!.split(";")[0], csrf: logged.data.csrfToken };
    }
    const a = await account("library-a@example.test");
    const b = await account("library-b@example.test");
    function request(path: string, method = "GET", body?: unknown, user = a, csrf = user.csrf) {
      return fetch(base + path, {
        method, headers: { Origin: origin, Cookie: user.cookie, "X-CSRF-Token": csrf,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    }
    const createdAt = new Date("2026-10-30T12:00:00.000Z");
    const jobs = await GenerationModel.create(Array.from({ length: 45 }, (_, i) => ({
      userId: a.id, requestKey: "synthetic-library-" + i, requestFingerprint: "fixture-" + i,
      originalPrompt: "Synthetic test metadata, no generated file " + i, submittedPrompt: "Test",
      provider: "test", model: "fixture-model-" + i, status: "succeeded", createdAt,
      quotaReservation: { dateKey: "2026-10-30", userReserved: true, appReserved: true },
    })));
    const images = await ImageModel.create(jobs.map((job, i) => ({
      userId: a.id, generationId: job._id, title: "Synthetic image " + i,
      storage: { provider: "test", accountAlias: "isolated", key: "fixture-" + i, deliveryMode: "private" },
      width: 64, height: 64, bytes: bytes.length, format: "png", createdAt,
    })));
    for (let i = 0; i < jobs.length; i++) {
      await GenerationModel.updateOne({ _id: jobs[i]._id }, { $set: { imageId: images[i]._id } });
    }
    const image = images[0], job = jobs[0];
    await DailyUsageModel.create({ scopeType: "user", scopeId: String(a.id), dateKey: "2026-10-30", reservedRequests: 3 });

    await t.test("cursor walks same-timestamp records exactly once, defaults and boundaries", async () => {
      for (const resource of ["images", "generations"]) {
        const ids: string[] = [];
        let cursor: string | null = null;
        do {
          const response = await request("/" + resource + "?limit=7" + (cursor ? "&cursor=" + cursor : ""));
          assert.equal(response.status, 200);
          const page = (await response.json()).data;
          ids.push(...page.items.map((item: { id: string }) => item.id));
          cursor = page.nextCursor;
          assert.ok(ids.length <= 45, "cursor must advance");
        } while (cursor);
        const expected = (resource === "images" ? images : jobs).map((record) => String(record._id)).sort().reverse();
        assert.deepEqual(ids, expected);
        assert.equal(new Set(ids).size, 45);
        assert.equal((await (await request("/" + resource)).json()).data.items.length, 20);
        assert.equal((await (await request("/" + resource + "?limit=50")).json()).data.items.length, 45);
        for (const query of ["limit=0", "limit=51", "limit=1.5", "cursor=", "cursor=bad", "userId=" + b.id, "cursor[date]=x"])
          assert.equal((await request("/" + resource + "?" + query)).status, 400, query);
        const cursorValue = (await (await request("/" + resource + "?limit=1")).json()).data.nextCursor;
        assert.equal((await request("/" + resource + "?cursor=" + cursorValue + "!")).status, 400);
      }
    });
    await t.test("all reads and mutations require session and owner, no storage lookup for another owner", async () => {
      const readCount = reads;
      for (const [path, method, body] of [
        ["/images/" + image._id, "GET", undefined],
        ["/images/" + image._id + "/content", "GET", undefined],
        ["/images/" + image._id + "/download", "GET", undefined],
        ["/images/" + image._id, "PATCH", { title: "Forbidden" }],
        ["/images/" + image._id, "DELETE", undefined],
        ["/generations/" + job._id, "GET", undefined],
      ] as const) {
        assert.equal((await fetch(base + path)).status, 401);
        const response = await request(path, method, body, b);
        assert.equal(response.status, 404);
        const missingPath = path.replace(String(path.startsWith("/generations") ? job._id : image._id), String(new Types.ObjectId()));
        const missing = await request(missingPath, method, body, b);
        assert.deepEqual(await response.json(), await missing.json());
      }
      for (const path of ["/images", "/generations"])
        assert.deepEqual((await (await request(path, "GET", undefined, b)).json()).data.items, []);
      assert.equal(reads, readCount);
      assert.equal((await request("/images/" + image._id, "PATCH", { title: "New" }, a, "wrong")).status, 403);
    });
    await t.test("model comes from owner job, private stream headers and safe storage failure", async () => {
      const page = (await (await request("/images?limit=50")).json()).data;
      assert.equal(page.items.find((item: { id: string }) => item.id === String(image._id)).model, job.model);
      assert.doesNotMatch(JSON.stringify(page), /storage|fixture-0|checkpoint|requestFingerprint/);
      for (const mode of ["content", "download"]) {
        const response = await request("/images/" + image._id + "/" + mode);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type"), "image/png");
        assert.equal(response.headers.get("content-length"), String(bytes.length));
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
        assert.ok(response.headers.get("content-disposition")?.startsWith(mode === "download" ? "attachment;" : "inline;"));
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
      }
      unavailable = true;
      const failed = await request("/images/" + image._id + "/content");
      assert.equal(failed.status, 503);
      const failure = await failed.json();
      assert.equal(failure.error.code, "STORAGE_UNAVAILABLE");
      assert.doesNotMatch(JSON.stringify(failure), /SDK|secret|private\/path/);
      unavailable = false;
      interrupted = true;
      await assert.rejects(async () => {
        const response = await request("/images/" + image._id + "/download");
        await response.arrayBuffer();
      });
      interrupted = false;
    });
    await t.test("rename persists, rejects extra fields, delete keeps history and quota", async () => {
      for (const body of [{ title: " " }, { title: "x".repeat(121) }, { title: "Valid", userId: b.id }, { isFavorite: true }])
        assert.equal((await request("/images/" + image._id, "PATCH", body)).status, 400);
      assert.equal((await request("/images/" + image._id, "PATCH", { title: "  Đã đổi tên  " })).status, 200);
      assert.equal((await (await request("/images/" + image._id)).json()).data.title, "Đã đổi tên");
      assert.equal((await request("/images/" + image._id, "DELETE")).status, 204);
      assert.equal((await request("/images/" + image._id)).status, 404);
      assert.equal((await request("/images/" + image._id + "/download")).status, 404);
      const remaining = (await (await request("/images?limit=50")).json()).data.items;
      assert.equal(remaining.length, 44);
      assert.equal(remaining.some((item: { id: string }) => item.id === String(image._id)), false);
      const retained = (await (await request("/generations/" + job._id)).json()).data;
      assert.equal(retained.imageDeleted, true);
      assert.equal(retained.status, "succeeded");
      assert.equal((await ImageModel.findById(image._id))!.storageDeletionStatus, "pending");
      assert.equal((await DailyUsageModel.findOne({ scopeId: String(a.id) }))!.reservedRequests, 3);
      await GenerationModel.updateOne({ _id: jobs[1]._id }, { $set: { status: "failed", imageId: null } });
      await GenerationModel.updateOne({ _id: jobs[2]._id }, { $set: { status: "needs_review", imageId: null } });
      const history = (await (await request("/generations?limit=50")).json()).data.items;
      assert.equal(history.length, 45);
      assert.ok(history.some((item: { status: string }) => item.status === "failed"));
      assert.ok(history.some((item: { status: string }) => item.status === "needs_review"));
      assert.equal(history.find((item: { id: string }) => item.id === String(job._id)).imageDeleted, true);
    });
    await t.test("bulk delete is validated, owner scoped, and covers every library page", async () => {
      const otherJob = await GenerationModel.create({
        userId: b.id, requestKey: "other-account-job", requestFingerprint: "other-account",
        originalPrompt: "Other user's image", submittedPrompt: "Other user's image",
        provider: "test", model: "fixture-model", status: "succeeded", createdAt,
        quotaReservation: { dateKey: "2026-10-30", userReserved: true, appReserved: true },
      });
      const otherImage = await ImageModel.create({
        userId: b.id, generationId: otherJob._id, title: "Other user's image",
        storage: { provider: "test", accountAlias: "isolated", key: "other-image", deliveryMode: "private" },
        width: 64, height: 64, bytes: bytes.length, format: "png", createdAt,
      });
      const ids = [String(images[3]._id), String(images[4]._id)];
      for (const body of [{ ids: [ids[0]] }, { ids: ["bad", ids[1]] }, { all: false }, { all: true, userId: String(a.id) }])
        assert.equal((await request("/images", "DELETE", body)).status, 400);
      assert.equal((await request("/images", "DELETE", { ids }, a, "wrong")).status, 403);
      assert.equal((await fetch(base + "/images", { method: "DELETE", headers: { Origin: origin } })).status, 401);
      const foreign = await request("/images", "DELETE", { ids }, b);
      assert.equal(foreign.status, 200);
      assert.equal((await foreign.json()).data.deletedCount, 0);
      const chosen = await request("/images", "DELETE", { ids });
      assert.equal(chosen.status, 200);
      assert.equal((await chosen.json()).data.deletedCount, 2);
      assert.equal((await (await request("/images", "DELETE", { ids })).json()).data.deletedCount, 0);
      const all = await request("/images", "DELETE", { all: true });
      assert.equal(all.status, 200);
      assert.equal((await all.json()).data.deletedCount, 42);
      assert.deepEqual((await (await request("/images?limit=50")).json()).data.items, []);
      assert.equal((await (await request("/images", "GET", undefined, b)).json()).data.items[0].id, String(otherImage._id));
      assert.equal((await ImageModel.findById(images[44]._id))!.storageDeletionStatus, "pending");
      assert.equal((await (await request("/generations?limit=50")).json()).data.items.length, 45);
      assert.equal((await DailyUsageModel.findOne({ scopeId: String(a.id) }))!.reservedRequests, 3);
    });
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await mongoose.disconnect();
    await repl.stop();
  }
});
