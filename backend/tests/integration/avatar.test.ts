import assert from "node:assert/strict";
import { once } from "node:events";
import { Readable } from "node:stream";
import { test } from "node:test";
import mongoose from "mongoose";
import sharp from "sharp";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../../src/app.js";
import { UserModel, ImageModel, GenerationModel, DailyUsageModel, createDeclaredIndexes } from "../../src/models/index.js";
import { AvatarService } from "../../src/modules/profile/avatar.js";
import { StorageRegistry, type ImageStorage } from "../../src/storage/storage.js";

test("private avatar: validation, ownership, replacement and storage/DB failures", { timeout: 180000 }, async () => {
  const repl = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  let server: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined;
  try {
    await mongoose.connect(repl.getUri("flux_avatar_isolated_test")); await createDeclaredIndexes();
    const objects = new Map<string, Buffer>();
    let failUpload = false, failDelete = false, calls = 0;
    let racingOwnerId = "", arrivals = 0, releaseRace = () => {};
    const raceGate = new Promise<void>(resolve => { releaseRace = resolve; });
    const storage: ImageStorage = {
      async put(key, bytes, mime, owner) {
        calls++; assert.match(key, new RegExp("^avatars/" + owner + "/[a-f0-9]{32}/original\\.webp$"));
        assert.equal(mime, "image/webp"); if (failUpload) throw new Error("Synthetic outage");
        if (owner === racingOwnerId) { arrivals++; if (arrivals === 2) releaseRace(); await raceGate; }
        objects.set(key, bytes); return { provider: "test", accountAlias: "avatar", key, deliveryMode: "private" };
      },
      async openRead(object) { const bytes = objects.get(object.key); if (!bytes) throw new Error("Missing test object"); return Readable.from(bytes); },
      async delete(object) { if (failDelete) throw new Error("Synthetic deletion outage"); objects.delete(object.key); },
    };
    const registry = new StorageRegistry(new Map([["test:avatar", storage]]));
    const avatars = new AvatarService(storage, registry);
    const origin = "http://localhost:5173";
    server = createApp({ frontendOrigin: origin, jwtSecret: "avatar-isolated-test-secret-at-least-32-bytes" }, { avatars, registry }).listen(0, "127.0.0.1");
    await once(server, "listening"); const address = server.address(); assert.ok(address && typeof address !== "string");
    const base = "http://127.0.0.1:" + address.port + "/api/v1";
    async function account(email: string) {
      const request = (path: string, body: unknown) => fetch(base + path, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await request("/auth/register", { displayName: "Avatar test", email, password: "test-password-123" });
      const login = await request("/auth/login", { email, password: "test-password-123" });
      const body = await login.json();
      return { cookie: login.headers.getSetCookie().map(value => value.split(";")[0]).join("; "), csrf: body.data.csrfToken, id: body.data.user.id };
    }
    const a = await account("avatar-a@example.test"), b = await account("avatar-b@example.test");
    const png = await sharp({ create: { width: 480, height: 320, channels: 3, background: "#224466" } }).png().toBuffer();
    const upload = (bytes = png, mime = "image/png", identity = a, csrf = identity.csrf) => fetch(base + "/users/me/avatar", {
      method: "PUT", headers: { Origin: origin, Cookie: identity.cookie, "X-CSRF-Token": csrf, "Content-Type": mime }, body: new Uint8Array(bytes),
    });
    const get = (path: string, identity = a) => fetch(base + path, { headers: { Cookie: identity.cookie } });
    assert.equal((await fetch(base + "/users/me/avatar")).status, 401);
    assert.equal((await upload(png, "image/png", a, "bad-csrf")).status, 403);
    assert.equal((await upload(Buffer.from("not an image"))).status, 400);
    assert.equal((await upload(png, "image/jpeg")).status, 400);
    assert.equal((await upload(png, "image/svg+xml")).status, 415);
    assert.equal((await upload(Buffer.alloc(2 * 1024 * 1024 + 1))).status, 413);
    assert.equal(calls, 0);
    const response = await upload(); assert.equal(response.status, 200);
    const result = await response.json(); assert.match(result.data.user.avatarUrl, /^\/api\/v1\/users\/me\/avatar\?v=[a-f0-9]{32}$/);
    assert.doesNotMatch(JSON.stringify(result), /storage|passwordHash|signed|credential/);
    const image = await get(result.data.user.avatarUrl.replace("/api/v1", ""));
    assert.equal(image.status, 200); assert.equal(image.headers.get("content-type"), "image/webp");
    assert.equal(image.headers.get("cache-control"), "private, no-store");
    const meta = await sharp(Buffer.from(await image.arrayBuffer())).metadata(); assert.ok(meta.width! <= 256 && meta.height! <= 256);
    assert.equal((await get(result.data.user.avatarUrl.replace("/api/v1", ""), b)).status, 404);
    assert.equal((await get("/users/" + a.id + "/avatar", b)).status, 404);
    assert.equal((await get("/auth/me")).status, 200);
    const previous = (await UserModel.findById(a.id))!.avatar!.revision;
    failUpload = true; assert.equal((await upload()).status, 503);
    assert.equal((await UserModel.findById(a.id))!.avatar!.revision, previous); failUpload = false;
    failDelete = true; assert.equal((await upload()).status, 200);
    assert.equal(objects.size, 2); assert.equal((await UserModel.findById(a.id))!.avatarPendingDeletion.length, 1);
    failDelete = false; assert.equal((await upload()).status, 200);
    assert.equal(objects.size, 1); assert.equal((await UserModel.findById(a.id))!.avatarPendingDeletion.length, 0);
    const serviceOwner = await UserModel.create({ displayName: "Race test", email: "avatar-race@example.test", passwordHash: "not-a-real-hash" });
    racingOwnerId = String(serviceOwner._id);
    const concurrent = await Promise.allSettled([avatars.replace(serviceOwner._id, png, "image/png"), avatars.replace(serviceOwner._id, png, "image/png")]);
    assert.equal(concurrent.filter(value => value.status === "fulfilled").length, 1);
    assert.equal((await UserModel.findById(serviceOwner._id))!.avatarPendingDeletion.length, 0);
    racingOwnerId = "";
    const originalUpdate = UserModel.findOneAndUpdate;
    UserModel.findOneAndUpdate = ((...args: unknown[]) => {
      const query = originalUpdate.apply(UserModel, args as Parameters<typeof originalUpdate>);
      return query.then(() => { throw new Error("Simulated lost database acknowledgement after commit"); });
    }) as typeof originalUpdate;
    try {
      const recovered = await avatars.replace(serviceOwner._id, png, "image/png");
      const actual = await UserModel.findById(serviceOwner._id);
      assert.equal(actual!.avatar!.revision, recovered.avatar!.revision);
      assert.ok(objects.has(actual!.avatar!.storage.key), "active avatar must survive an uncertain DB acknowledgement");
    } finally { UserModel.findOneAndUpdate = originalUpdate; }
    assert.equal(await ImageModel.countDocuments(), 0); assert.equal(await GenerationModel.countDocuments(), 0); assert.equal(await DailyUsageModel.countDocuments(), 0);
  } finally {
    if (server) await new Promise<void>(done => server!.close(() => done()));
    await mongoose.disconnect(); await repl.stop();
  }
});
