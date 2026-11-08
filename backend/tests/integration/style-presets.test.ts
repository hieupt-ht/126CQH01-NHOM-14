import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import sharp from "sharp";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../../src/app.js";
import { AppError } from "../../src/errors/app-error.js";
import { createDeclaredIndexes, DailyUsageModel, GenerationModel, ImageModel, UserModel } from "../../src/models/index.js";
import { GenerationService } from "../../src/modules/generations/service.js";
import { applyImageStyle } from "../../src/modules/generations/presentation.js";
import { StorageRegistry, type ImageStorage } from "../../src/storage/storage.js";

type Account = { id: string; cookie: string; csrf: string };
type JobDto = { id: string; prompt: string; style: string; aspectRatio: string; status: string; imageId: string | null };
type Envelope<T> = { success: boolean; data: T; error?: { code: string } };

test("three presets: real HTTP/replica set, translation, replay, private delivery and saving recovery", { timeout: 180_000 }, async (context) => {
  // Always start a fresh disposable DB; never read .env or MONGODB_URI.
  const repl = await MongoMemoryReplSet.create({
    binary: { version: "8.2.6" }, replSet: { count: 1 }, instanceOpts: [{ launchTimeout: 60_000 }],
  });
  const temp = await mkdtemp(join(tmpdir(), "flux-style-presets-"));
  let server: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined;
  try {
    await mongoose.connect(repl.getUri("flux_style_presets_test"));
    await createDeclaredIndexes();
    const bytes = await sharp({ create: { width: 64, height: 40, channels: 3, background: "#224466" } }).png().toBuffer();
    const inferencePrompts: string[] = [];
    const translatedInputs: string[] = [];
    const objects = new Map<string, Buffer>();
    const uploads = new Map<string, number>();
    let failTranslation = false;
    const baseOriginal = 'Một ngôi nhà cạnh cây táo, một người dắt một con chó. Biển ghi "Xin chào!".';
    // Translation fixture, not evidence about live M2M100 translation quality.
    const baseTranslated = 'A house beside an apple tree, one person walking one dog. A sign reads "Xin chào!".';
    const oilOriginal = 'Cô gái tóc đen giữa những cánh bướm phát sáng tím hồng, chân dung anime, ánh sáng huyền ảo và nền đêm.';
    const oilTranslated = 'Black hair girl between glowing butterflies pink and purple, anime portraits, virtual lighting and nighttime background.';
    const translator = {
      model: "test/translator", revision: "isolated-preset-test",
      async translateVietnameseToEnglish(prompt: string) {
        translatedInputs.push(prompt);
        if (failTranslation) throw new AppError(502, "GENERATION_FAILED", "Isolated translation failure");
        if (prompt === oilOriginal) return oilTranslated;
        assert.equal(prompt, baseOriginal);
        return baseTranslated;
      },
    };
    const provider = { async generate(prompt: string) { inferencePrompts.push(prompt); return bytes; } };
    const storage: ImageStorage = {
      async put(key, content) {
        const attempt = (uploads.get(key) ?? 0) + 1;
        uploads.set(key, attempt);
        if (attempt === 1) throw new Error("Isolated storage outage");
        objects.set(key, content);
        return { provider: "test", accountAlias: "presets", key, deliveryMode: "private" };
      },
      async openRead(object) {
        const content = objects.get(object.key);
        assert.ok(content);
        return Readable.from(content);
      },
      async delete() { throw new Error("Unexpected deletion in preset test"); },
    };
    const registry = new StorageRegistry(new Map([["test:presets", storage]]));
    const options = { userLimit: 5, appLimit: 20, cooldownMs: 0, checkpointDir: temp };
    const service = new GenerationService(provider, storage, options, registry, true, translator, true);
    const origin = "http://localhost:5173";
    server = createApp({ frontendOrigin: origin, jwtSecret: "isolated-style-test-secret-at-least-32-bytes" }, { generations: service, registry }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}/api/v1`;
    async function account(email: string): Promise<Account> {
      const headers = { Origin: origin, "Content-Type": "application/json" };
      const registration = await fetch(base + "/auth/register", { method: "POST", headers,
        body: JSON.stringify({ displayName: "Preset test", email, password: "isolated-password-123" }) });
      assert.equal(registration.status, 201);
      const login = await fetch(base + "/auth/login", { method: "POST", headers, body: JSON.stringify({ email, password: "isolated-password-123" }) });
      assert.equal(login.status, 200);
      const body = await login.json() as Envelope<{ user: { id: string }; csrfToken: string }>;
      return { id: body.data.user.id, cookie: login.headers.get("set-cookie")!.split(";")[0], csrf: body.data.csrfToken };
    }
    function request(user: Account | null, path: string, method = "GET", body?: unknown, key?: string) {
      return fetch(base + path, { method, headers: {
        Origin: origin, ...(user ? { Cookie: user.cookie, "X-CSRF-Token": user.csrf } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(key ? { "Idempotency-Key": key } : {}),
      }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    }
    async function assertNoReservation(user: Account) {
      assert.equal(await GenerationModel.countDocuments({ userId: user.id }), 0);
      assert.equal(await DailyUsageModel.countDocuments({ scopeType: "user", scopeId: user.id }), 0);
      assert.equal((await UserModel.findById(user.id))!.activeGenerationId, null);
    }
    const other = await account("other@presets.example.test");
    for (const style of ["oil-painting", "3d", "comic"] as const) {
      await context.test(style, async () => {
        const original = style === "oil-painting" ? oilOriginal : baseOriginal;
        const translated = style === "oil-painting" ? oilTranslated : baseTranslated;
        const user = await account(`${style}@presets.example.test`);
        const body = { prompt: original, style, aspectRatio: "16:9" };
        const key = `preset-${style}-request-0001`;
        const callsBefore = inferencePrompts.length;
        const translationsBefore = translatedInputs.length;

        assert.equal((await request(null, "/generations", "POST", body, key)).status, 401);
        assert.equal((await request({ ...user, csrf: "invalid" }, "/generations", "POST", body, key)).status, 403);
        for (const invalid of [{ ...body, style: "unsupported" }, { ...body, userId: other.id }, { ...body, count: 3 }, { ...body, aspectRatio: "2:1" }]) {
          assert.equal((await request(user, "/generations", "POST", invalid, key)).status, 400);
        }
        const tooLong = await request(user, "/generations", "POST", { ...body, prompt: "x".repeat(2048) }, key);
        assert.equal(tooLong.status, 400);
        assert.equal((await tooLong.json() as Envelope<never>).error?.code, "INVALID_PROMPT");
        await assertNoReservation(user);
        assert.equal(translatedInputs.length, translationsBefore);
        assert.equal(inferencePrompts.length, callsBefore);

        failTranslation = true;
        assert.equal((await request(user, "/generations", "POST", body, key)).status, 502);
        await assertNoReservation(user);
        failTranslation = false;
        const accepted = await request(user, "/generations", "POST", body, key);
        assert.equal(accepted.status, 202);
        const dto = (await accepted.json() as Envelope<JobDto>).data;
        assert.equal(dto.style, style);
        assert.equal(dto.aspectRatio, "16:9");
        assert.equal(dto.prompt, original);
        assert.equal(dto.status, "queued");
        assert.equal("submittedPrompt" in dto, false);
        const job = await GenerationModel.findById(dto.id);
        assert.ok(job);
        assert.equal(job.originalPrompt, original);
        assert.equal(job.submittedPrompt, applyImageStyle(translated, style));
        if (style === "oil-painting") {
          const paintedScene = oilTranslated.replace(", anime portraits,", ", oil-painted portraits,");
          assert.ok(job.submittedPrompt.includes(paintedScene));
          assert.doesNotMatch(job.submittedPrompt, /\banime\b/i);
          assert.match(job.submittedPrompt.slice(job.submittedPrompt.indexOf(paintedScene) + paintedScene.length), /^ Rendering medium:.*oil painting/);
        }
        assert.equal(job.settings.style, style);
        assert.equal(translatedInputs.length, translationsBefore + 2);

        const replay = await request(user, "/generations", "POST", body, key);
        assert.equal(replay.status, 202);
        assert.equal((await replay.json() as Envelope<JobDto>).data.id, dto.id);
        for (const changed of [{ ...body, style: "none" }, { ...body, style: style === "comic" ? "3d" : "comic" }, { ...body, aspectRatio: "1:1" }, { ...body, prompt: original + "!" }]) {
          assert.equal((await request(user, "/generations", "POST", changed, key)).status, 409);
        }
        assert.equal(translatedInputs.length, translationsBefore + 2);
        assert.equal((await request(other, "/generations/" + dto.id)).status, 404);
        assert.equal(inferencePrompts.length, callsBefore);

        await service.runOnce();
        const saving = await GenerationModel.findById(dto.id);
        assert.equal(saving!.status, "saving");
        assert.equal(inferencePrompts.length, callsBefore + 1);
        assert.equal(inferencePrompts.at(-1), job.submittedPrompt);
        assert.equal(await ImageModel.countDocuments({ generationId: dto.id }), 0);
        assert.equal((await UserModel.findById(user.id))!.activeGenerationId?.toString(), dto.id);

        // Expire only this isolated job's lease. Fresh worker must use its durable bytes.
        await GenerationModel.updateOne({ _id: dto.id }, { $set: { "lease.expiresAt": new Date(0) } });
        const restarted = new GenerationService(provider, storage, options, registry, false, translator, true);
        await restarted.runOnce();
        const completed = await GenerationModel.findById(dto.id);
        assert.equal(completed!.status, "succeeded");
        assert.equal(completed!.submittedPrompt, job.submittedPrompt);
        assert.equal(completed!.settings.style, style);
        assert.equal(inferencePrompts.length, callsBefore + 1);
        assert.equal(translatedInputs.length, translationsBefore + 2);
        assert.equal((await UserModel.findById(user.id))!.activeGenerationId, null);
        const image = await ImageModel.findOne({ generationId: dto.id });
        assert.ok(image);
        assert.equal(await ImageModel.countDocuments({ generationId: dto.id }), 1);
        assert.equal(image.width * 9, image.height * 16);
        assert.equal(image.storage.deliveryMode, "private");
        assert.equal(uploads.get(image.storage.key), 2);
        assert.equal((await DailyUsageModel.findOne({ scopeType: "user", scopeId: user.id, dateKey: job.quotaReservation.dateKey }))!.reservedRequests, 1);

        const detail = (await (await request(user, "/generations/" + dto.id)).json() as Envelope<JobDto>).data;
        assert.equal(detail.style, style);
        assert.equal(detail.prompt, original);
        assert.equal(detail.status, "succeeded");
        const history = (await (await request(user, "/generations")).json() as Envelope<{ items: JobDto[] }>).data.items;
        assert.equal(history.length, 1);
        assert.equal(history[0].style, style);
        const download = await request(user, `/images/${image._id}/download`);
        assert.equal(download.status, 200);
        assert.equal(download.headers.get("cache-control"), "private, no-store");
        assert.deepEqual(Buffer.from(await download.arrayBuffer()), objects.get(image.storage.key));
        assert.equal((await request(other, `/images/${image._id}/content`)).status, 404);
        const terminalReplay = await request(user, "/generations", "POST", body, key);
        assert.equal((await terminalReplay.json() as Envelope<JobDto>).data.status, "succeeded");
        assert.equal(inferencePrompts.length, callsBefore + 1);
        assert.equal(translatedInputs.length, translationsBefore + 2);
      });
    }
    assert.equal(await GenerationModel.countDocuments(), 3);
    assert.equal(await ImageModel.countDocuments(), 3);
    assert.equal(inferencePrompts.length, 3);
    assert.equal((await DailyUsageModel.findOne({ scopeType: "application" }))!.reservedRequests, 3);
  } finally {
    if (server) await new Promise<void>((done) => server!.close(() => done()));
    await mongoose.disconnect();
    await repl.stop();
    // Cleanup is restricted to the exact directory created by this test.
    assert.equal(dirname(resolve(temp)), resolve(tmpdir()));
    assert.ok(basename(temp).startsWith("flux-style-presets-"));
    await rm(temp, { recursive: true, force: true });
  }
});
