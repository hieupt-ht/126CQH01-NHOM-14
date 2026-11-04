// Run with tsx. PLAYWRIGHT_MODULE may point to a preinstalled Playwright package.
// This never starts the generation worker or reads application .env credentials.
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
import { GenerationService } from "../../src/modules/generations/service.js";

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
  let providerCalls = 0;
  // Accept requests against the real quota transaction, but never start the worker.
  const generations = new GenerationService({ async generate() {
    providerCalls++;
    throw new Error("Inference prohibited in browser test");
  } }, storage, { userLimit: 5, appLimit: 20, cooldownMs: 0, checkpointDir: resolve(output, "checkpoints") });
  apiServer = createApp({ frontendOrigin: origin, jwtSecret: "isolated-browser-test-secret-at-least-32-bytes" }, {
    generations,
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
  await page.goto(origin + "/register");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Browser test");
  await page.getByLabel("Địa chỉ email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await page.waitForURL(origin + "/login");
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
  const renamedDetailUrl = page.url();
  const previousCookie = (await page.context().cookies(origin)).map((cookie: { name: string; value: string }) => cookie.name + "=" + cookie.value).join("; ");
  await page.getByLabel("Thông tin không gian cá nhân", { exact: true }).click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page.waitForURL(origin + "/login");
  const revoked = await page.request.get(origin + "/api/v1/images/" + images[12]._id, { headers: { Cookie: previousCookie } });
  assert.equal(revoked.status(), 401, "logout revokes the previous session immediately");
  await page.goto(renamedDetailUrl);
  await page.waitForURL(origin + "/login");
  await page.getByLabel("Địa chỉ email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(/\/app/);
  await page.goto(renamedDetailUrl);
  await page.getByRole("heading", { name: "Tên ảnh sau refresh", exact: true }).waitFor();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Tải ảnh", exact: true }).click();
  const download = await downloadEvent;
  assert.equal(await download.failure(), null);
  await download.saveAs(resolve(output, "download.png"));
  assert.deepEqual(await readFile(resolve(output, "download.png")), bytes);

  // Independent browser session B must never gain access to A's image/job.
  const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  other.on("pageerror", (error: Error) => errors.push(error.message));
  const otherEmail = "browser-other@example.test";
  const otherRegistration = await other.request.post(origin + "/api/v1/auth/register", {
    headers: { Origin: origin }, data: { email: otherEmail, password, displayName: "Other test" },
  });
  assert.equal(otherRegistration.status(), 201);
  await other.goto(origin + "/login");
  await other.getByLabel("Địa chỉ email", { exact: true }).fill(otherEmail);
  await other.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await other.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await other.waitForURL(/\/app/);
  await other.goto(origin + "/app/library");
  await other.getByRole("heading", { name: "Bạn chưa có hình ảnh nào", exact: true }).waitFor();
  const csrfResponse = await other.request.get(origin + "/api/v1/auth/csrf");
  const csrf = (await csrfResponse.json()).data.csrfToken;
  for (const path of ["/images/" + images[12]._id, "/images/" + images[12]._id + "/content",
    "/images/" + images[12]._id + "/download", "/generations/" + jobs[12]._id]) {
    assert.equal((await other.request.get(origin + "/api/v1" + path)).status(), 404);
  }
  for (const method of ["PATCH", "DELETE"]) {
    const response = await other.request.fetch(origin + "/api/v1/images/" + images[12]._id, {
      method, headers: { Origin: origin, "X-CSRF-Token": csrf },
      ...(method === "PATCH" ? { data: { title: "Forbidden" } } : {}),
    });
    assert.equal(response.status(), 404);
  }
  await other.goto(origin + "/app/images/" + images[12]._id);
  await other.getByRole("heading", { name: "Không mở được hình ảnh", exact: true }).waitFor();
  assert.equal(await other.getByText("Tên ảnh sau refresh", { exact: true }).count(), 0);
  await other.goto(origin + "/app/history?job=" + jobs[12]._id);
  await other.getByRole("dialog").getByRole("alert").waitFor();
  assert.equal(await other.getByRole("link", { name: "Xem ảnh", exact: true }).count(), 0);
  await other.close();
  await page.getByRole("link", { name: "Quay lại thư viện", exact: true }).click();
  await page.getByRole("heading", { name: "Tên ảnh sau refresh", exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get("cursor"), new URL(secondPageUrl).searchParams.get("cursor"));
  assert.ok((await page.evaluate(() => window.scrollY)) > 0, "return must restore list position");
  const card = page.locator(".library-image-card").filter({ has: page.getByRole("heading", { name: "Tên ảnh sau refresh", exact: true }) });
  await card.locator("summary").click();
  await card.getByRole("button", { name: "Đổi tên", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Tên hình ảnh").press("Escape");
  assert.equal(await page.locator("summary:focus").count(), 1, "Escape restores focus to action trigger");
  await card.locator("summary").click();
  await card.getByRole("button", { name: "Đổi tên", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Tên hình ảnh").fill("Tên ảnh từ thư viện");
  await page.getByRole("dialog").getByRole("button", { name: "Lưu", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.getByRole("heading", { name: "Tên ảnh từ thư viện", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Tên ảnh từ thư viện", exact: true }).waitFor();
  await page.screenshot({ path: resolve(output, "library-return.png"), fullPage: true });
  fileUnavailable = true;
  await page.reload();
  await page.locator(".library-image-card .private-image-fallback").first().waitFor();
  await page.getByRole("heading", { name: "Tên ảnh từ thư viện", exact: true }).waitFor();
  fileUnavailable = false;
  await page.getByRole("button", { name: "Tải lại ảnh", exact: true }).first().click();
  await page.locator(".library-image-card img").first().waitFor();
  await page.getByRole("heading", { name: "Tên ảnh từ thư viện", exact: true }).getByRole("link").click();
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
  await page.goto(origin + "/app/library");
  const libraryDelete = page.locator(".library-image-card").filter({ has: page.getByRole("heading", { name: "Ảnh kiểm thử 44", exact: true }) });
  await libraryDelete.locator("summary").click();
  await libraryDelete.getByRole("button", { name: "Xóa ảnh", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.getByRole("status").filter({ hasText: "Đã xóa khỏi thư viện" }).waitFor();
  await libraryDelete.waitFor({ state: "detached" });
  assert.equal((await ImageModel.findById(images[44]._id))!.storageDeletionStatus, "pending");
  await page.goto(origin + "/app/history?job=" + jobs[44]._id);
  await page.getByRole("dialog").getByText("Ảnh đã xóa khỏi thư viện, lịch sử vẫn được giữ.").waitFor();
  assert.equal(generationPosts, 0);
  const libraryGenerationPosts = generationPosts;

  // Regression for the develop/PR conflict: changing refreshKey must update
  // sidebar usage on acceptance and stored-image totals on terminal polling.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(origin + "/app/create");
  const savedBefore = await ImageModel.countDocuments({ userId: user._id, deletedAt: null });
  const sidebar = page.locator(".studio-sidebar .usage-card");
  await sidebar.getByText("0 / 5", { exact: true }).waitFor();
  const storedCount = sidebar.locator(".usage-card__metrics > div").filter({ hasText: "Số ảnh" }).locator("dd");
  await storedCount.getByText(String(savedBefore), { exact: true }).waitFor();
  await page.locator("#create-prompt").fill("Synthetic refresh regression; no inference");
  // Create controls are real API inputs. Changing them or theme never dispatches.
  await page.getByRole("button", { name: "Chuyển sang chế độ sáng", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "Chuyển sang chế độ tối", exact: true }).click();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `create ${theme} overflow at ${width}`);
      await page.screenshot({ path: resolve(output, `create-controls-${theme}-${width}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  const wide = page.getByRole("radio", { name: "16:9 Ngang", exact: true });
  await wide.check();
  await wide.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.getByRole("radio", { name: "9:16 Dọc", exact: true }).isChecked(), true);
  await wide.check();
  await page.getByLabel("Chủ đề / phong cách").selectOption("watercolor");
  assert.equal(generationPosts, 0);
  await page.locator("#create-prompt").fill("Synthetic refresh regression; no inference");
  await page.getByRole("button", { name: "Tạo ảnh", exact: true }).click();
  await sidebar.getByText("1 / 5", { exact: true }).waitFor();
  await page.waitForURL(/job=/);
  const acceptedId = new URL(page.url()).searchParams.get("job");
  const accepted = await GenerationModel.findById(acceptedId);
  assert.ok(accepted && accepted.status === "queued");
  assert.equal(accepted.settings.aspectRatio, "16:9");
  assert.equal(accepted.settings.style, "watercolor");
  assert.equal(accepted.originalPrompt, "Synthetic refresh regression; no inference");
  assert.match(accepted.submittedPrompt, /^Hand-painted watercolor illustration/);
  assert.equal(await wide.isDisabled(), true);
  await page.reload();
  await page.getByRole("radio", { name: "16:9 Ngang", exact: true }).waitFor();
  await page.waitForFunction(() => (document.querySelector('input[value="16:9"]') as HTMLInputElement)?.checked);
  assert.equal(await page.getByLabel("Chủ đề / phong cách").inputValue(), "watercolor");
  // Synthetic persisted result, not FLUX output: only tests FE terminal refresh.
  const syntheticResult = await ImageModel.create({
    userId: user._id, generationId: accepted._id, title: "Synthetic refresh fixture",
    width: 512, height: 320, bytes: bytes.length, format: "png",
    storage: { provider: "test", accountAlias: "isolated", key: "refresh-fixture", deliveryMode: "private" },
  });
  await GenerationModel.updateOne({ _id: accepted._id }, { $set: {
    status: "succeeded", imageId: syntheticResult._id, completedAt: new Date(),
  } });
  await UserModel.updateOne({ _id: user._id }, { $set: { activeGenerationId: null } });
  await page.getByRole("heading", { name: "Ảnh đã được lưu", exact: true }).waitFor();
  await storedCount.getByText(String(savedBefore + 1), { exact: true }).waitFor();
  assert.equal(generationPosts, 1, "only the explicit test CTA may create a job");
  assert.equal(providerCalls, 0);
  assert.deepEqual(errors, []);
  const report = { passed: true, widths, realApi: true, isolatedMongoDB: true,
    createControlChecks: ["light/dark at all widths", "theme reload persistence", "ratio keyboard navigation", "no POST on selection", "persisted style/ratio and original text", "active selectors locked", "job reload restores options"],
    imageSource: "synthetic fixture served by storage stub; no Cloudflare/Cloudinary calls",
    libraryGenerationPosts, intentionalCreatePosts: generationPosts, providerCalls,
    terminalResult: "synthetic DB fixture, no worker/inference",
    consoleErrors: errors, checks: ["register/login", "cursor refresh", "scroll return", "detail and library rename persistence", "logout revocation", "protected-route redirect", "relogin persistence", "private download exact bytes", "two-account ownership read/write/file/job", "modal focus trap", "Escape/focus", "library and detail file fallback/retry", "job deep link", "detail and library soft-delete/history", "sidebar refresh on accept and terminal"] };
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.info(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await vite?.close();
  if (apiServer) await new Promise<void>((done) => apiServer!.close(() => done()));
  await mongoose.disconnect();
  await repl.stop();
}
