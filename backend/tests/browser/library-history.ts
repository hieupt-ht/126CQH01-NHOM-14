// Run with tsx. PLAYWRIGHT_MODULE may point to a preinstalled Playwright package.
// This never starts the generation worker or reads application .env credentials.
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import sharp from "sharp";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../../src/app.js";
import { createDeclaredIndexes, GenerationModel, ImageModel, UserModel } from "../../src/models/index.js";
import { StorageRegistry, type ImageStorage } from "../../src/storage/storage.js";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const { createServer } = await import(pathToFileURL(resolve("../frontend/node_modules/vite/dist/node/index.js")).href);
const repl = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
let apiServer: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined;
let vite: Awaited<ReturnType<typeof createServer>> | undefined;
let browser;
const output = resolve("data/library-history-browser");
await mkdir(output, { recursive: true });
try {
  await mongoose.connect(repl.getUri("flux_library_browser_test"));
  await createDeclaredIndexes();
  const bytes = await sharp({ create: { width: 512, height: 320, channels: 3, background: "#224466" } }).png().toBuffer();
  let fileUnavailable = false;
  const storage: ImageStorage = {
    async put() { throw new Error("Uploads prohibited in browser test"); },
    async openRead() {
      if (fileUnavailable) throw new Error("Simulated cloud outage");
      return Readable.from(bytes);
    },
    async delete() { throw new Error("Cloud deletion prohibited in browser test"); },
  };
  const origin = "http://127.0.0.1:5187";
  apiServer = createApp({ frontendOrigin: origin, jwtSecret: "isolated-browser-test-secret-at-least-32-bytes" }, {
    registry: new StorageRegistry(new Map([["test:isolated", storage]])),
  }).listen(0, "127.0.0.1");
  await once(apiServer, "listening");
  const address = apiServer.address();
  assert.ok(address && typeof address !== "string");
  vite = await createServer({
    root: resolve("../frontend"),
    configFile: resolve("../frontend/vite.config.ts"),
    // Development routing/styles with real API transport; preview is explicitly disabled.
    define: { "import.meta.env.VITE_UI_PREVIEW": JSON.stringify("false") },
    server: { host: "127.0.0.1", port: 5187, strictPort: true,
      proxy: { "/api": { target: "http://127.0.0.1:" + address.port, changeOrigin: true } } },
  });
  await vite.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  let generationPosts = 0;
  page.on("pageerror", (error: Error) => errors.push(error.message));
  page.on("request", (request: { method(): string; url(): string }) => {
    if (request.method() === "POST" && request.url().endsWith("/api/v1/generations")) generationPosts++;
  });
  const email = "browser-library@example.test";
  const password = "isolated-test-password";
  const registered = await page.request.post(origin + "/api/v1/auth/register", {
    headers: { Origin: origin }, data: { email, password, displayName: "Browser test" },
  });
  assert.equal(registered.status(), 201);
  const user = await UserModel.findOne({ email });
  assert.ok(user);
  const jobs = await GenerationModel.create(Array.from({ length: 45 }, (_, i) => ({
    userId: user._id, requestKey: "browser-synthetic-" + i, requestFingerprint: "fixture-" + i,
    originalPrompt: "Synthetic browser fixture, no FLUX inference " + i,
    submittedPrompt: "Synthetic fixture", provider: "test", model: "test-fixture-model",
    status: "succeeded", createdAt: new Date("2026-10-30T12:00:00.000Z"),
    quotaReservation: { dateKey: "2026-10-30", userReserved: true, appReserved: true },
  })));
  const images = await ImageModel.create(jobs.map((job, i) => ({
    userId: user._id, generationId: job._id, title: "Ảnh kiểm thử " + i,
    width: 512, height: 320, bytes: bytes.length, format: "png",
    storage: { provider: "test", accountAlias: "isolated", key: "fixture-" + i, deliveryMode: "private" },
    createdAt: new Date("2026-10-30T12:00:00.000Z"),
  })));
  for (let i = 0; i < jobs.length; i++)
    await GenerationModel.updateOne({ _id: jobs[i]._id }, { $set: { imageId: images[i]._id } });
  await page.goto(origin + "/login");
  await page.getByLabel("Địa chỉ email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(/\/app/);
  await page.goto(origin + "/app/library");
  await page.locator(".library-image-card").first().waitFor();
  assert.equal(await page.locator(".library-image-card").count(), 20);
  const widths: number[] = [];
  for (const width of [360, 768, 1280, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: resolve(output, "library-" + width + ".png"), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "library overflow at " + width);
    widths.push(width);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await page.waitForURL(/cursor=/);
  await page.getByRole("heading", { name: "Ảnh kiểm thử 24", exact: true }).waitFor();
  const secondPageUrl = page.url();
  await page.reload();
  await page.getByRole("heading", { name: "Ảnh kiểm thử 24", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Ảnh kiểm thử 12", exact: true }).getByRole("link").click();
  await page.getByRole("heading", { name: "Ảnh kiểm thử 12", exact: true }).waitFor();
  await page.getByRole("button", { name: "Đổi tên", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Đổi tên hình ảnh" });
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    assert.ok(await dialog.evaluate((element: HTMLDialogElement) => element.contains(document.activeElement)), "modal must trap keyboard focus");
  }
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Shift+Tab");
    assert.ok(await dialog.evaluate((element: HTMLDialogElement) => element.contains(document.activeElement)), "modal must trap reverse keyboard focus");
  }
  await dialog.getByLabel("Tên hình ảnh").fill(" ");
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await dialog.getByRole("alert").waitFor();
  await dialog.getByLabel("Tên hình ảnh").fill("Tên ảnh sau refresh");
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  await page.reload();
  await page.getByRole("heading", { name: "Tên ảnh sau refresh", exact: true }).waitFor();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Tải ảnh", exact: true }).click();
  const download = await downloadEvent;
  assert.equal(await download.failure(), null);
  await download.saveAs(resolve(output, "download.png"));
  await page.getByRole("link", { name: "Quay lại thư viện", exact: true }).click();
  await page.getByRole("heading", { name: "Tên ảnh sau refresh", exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get("cursor"), new URL(secondPageUrl).searchParams.get("cursor"));
  assert.ok((await page.evaluate(() => window.scrollY)) > 0, "return must restore list position");
  const card = page.locator(".library-image-card").filter({ has: page.getByRole("heading", { name: "Tên ảnh sau refresh", exact: true }) });
  await card.locator("summary").click();
  await card.getByRole("button", { name: "Đổi tên", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Tên hình ảnh").press("Escape");
  assert.equal(await page.locator("summary:focus").count(), 1, "Escape restores focus to action trigger");
  await page.screenshot({ path: resolve(output, "library-return.png"), fullPage: true });
  await card.getByRole("heading").getByRole("link").click();
  fileUnavailable = true;
  await page.reload();
  await page.getByRole("status").filter({ hasText: "Không tải được ảnh" }).first().waitFor();
  fileUnavailable = false;
  await page.getByRole("button", { name: "Tải lại ảnh", exact: true }).first().click();
  await page.locator(".detail-art-panel img").waitFor();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "detail overflow at " + width);
    await page.screenshot({ path: resolve(output, "detail-" + width + ".png"), fullPage: true });
  }
  await page.getByRole("link", { name: "Xem lần tạo ảnh", exact: true }).click();
  const historyDialog = page.getByRole("dialog", { name: "Chi tiết lần tạo ảnh" });
  await historyDialog.waitFor();
  await historyDialog.getByRole("link", { name: "Xem ảnh", exact: true }).waitFor();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    assert.ok(await historyDialog.evaluate((element: HTMLDialogElement) => element.contains(document.activeElement)), "drawer must trap keyboard focus");
  }
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "history overflow at " + width);
    await page.screenshot({ path: resolve(output, "history-" + width + ".png"), fullPage: true });
  }
  await page.goto(origin + "/app/images/" + images[12]._id);
  await page.getByRole("button", { name: "Xóa ảnh", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await page.waitForURL(/\/app\/library/);
  await page.getByRole("status").filter({ hasText: "Đã xóa khỏi thư viện" }).waitFor();
  await page.goto(origin + "/app/history?job=" + jobs[12]._id);
  await page.getByRole("dialog").getByText("Ảnh đã xóa khỏi thư viện, lịch sử vẫn được giữ.").waitFor();
  assert.equal(generationPosts, 0);
  assert.deepEqual(errors, []);
  const report = { passed: true, widths, realApi: true, isolatedMongoDB: true,
    imageSource: "synthetic fixture served by storage stub; no Cloudflare/Cloudinary calls",
    generationPosts, consoleErrors: errors, checks: ["login", "cursor refresh", "scroll return", "rename persistence", "private download", "modal focus trap", "Escape/focus", "file fallback/retry", "job deep link", "soft-delete/history"] };
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.info(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await vite?.close();
  if (apiServer) await new Promise<void>((done) => apiServer!.close(() => done()));
  await mongoose.disconnect();
  await repl.stop();
}
