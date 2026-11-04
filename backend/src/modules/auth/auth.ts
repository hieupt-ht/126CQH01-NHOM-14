import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  Router,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import type { SessionDocument } from "../../models/session.model.js";
import type { UserDocument } from "../../models/user.model.js";
import { SessionModel, UserModel } from "../../models/index.js";
import type { AppConfig } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";

export type AuthPrincipal = { session: SessionDocument; user: UserDocument };
export function principal(response: Response): AuthPrincipal {
  const auth = response.locals.auth as AuthPrincipal | undefined;
  if (!auth) throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
  return auth;
}
export type AuthConfig = Pick<
  AppConfig,
  | "frontendOrigin"
  | "jwtSecret"
  | "sessionCookieName"
  | "sessionTtlDays"
  | "sessionCookieSameSite"
  | "sessionCookieSecure"
>;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const hashJwtId = hash;
const csrfFor = (token: string) =>
  createHmac("sha256", token).update("flux-studio-csrf-v1").digest("hex");
const JWT_ISSUER = "flux-studio-api";
const JWT_AUDIENCE = "flux-studio-web";

export async function issueAccessToken(
  config: Pick<AppConfig, "jwtSecret">,
  userId: string,
  tokenId: string,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(userId)
    .setJti(tokenId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(Buffer.from(config.jwtSecret, "utf8"));
}

export async function verifyAccessToken(
  config: Pick<AppConfig, "jwtSecret">,
  token: string,
): Promise<{ userId: string; tokenId: string }> {
  const { payload, protectedHeader } = await jwtVerify(
    token,
    Buffer.from(config.jwtSecret, "utf8"),
    { algorithms: ["HS256"], issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
  );
  if (
    protectedHeader.typ !== "JWT" ||
    typeof payload.sub !== "string" ||
    !/^[a-f\d]{24}$/i.test(payload.sub) ||
    typeof payload.jti !== "string" ||
    !/^[a-f\d]{64}$/.test(payload.jti) ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    payload.exp <= payload.iat ||
    payload.iat > Math.floor(Date.now() / 1000) + 60
  ) {
    throw new Error("Invalid authentication token claims.");
  }
  return { userId: payload.sub, tokenId: payload.jti };
}
const credentials = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(128),
  })
  .strict();
export const registrationSchema = credentials.extend({
  displayName: z.string().trim().min(1).max(80),
});
export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
    );
  return result.data;
}
function tokenFrom(request: Request, config: AuthConfig): string | null {
  const parts = (request.headers.cookie ?? "")
    .split(";")
    .map((part) => part.trim());
  const value = parts
    .find((part) => part.startsWith(config.sessionCookieName + "="))
    ?.slice(config.sessionCookieName.length + 1);
  return value && value.length <= 8192 && value.split(".").length === 3
    ? value
    : null;
}
function cookieOptions(config: AuthConfig) {
  return {
    httpOnly: true,
    secure: config.sessionCookieSecure,
    sameSite: config.sessionCookieSameSite,
    path: "/",
  } as const;
}
export function requireSession(config: AuthConfig): RequestHandler {
  return async (request, response, next) => {
    try {
      const token = tokenFrom(request, config);
      if (!token)
        throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
      let claims: { userId: string; tokenId: string };
      try {
        claims = await verifyAccessToken(config, token);
      } catch {
        throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
      }
      const session = await SessionModel.findOne({
        tokenHash: hash(claims.tokenId),
        userId: claims.userId,
        expiresAt: { $gt: new Date() },
      }).select("+csrfTokenHash");
      const user =
        session &&
        (await UserModel.findOne({ _id: session.userId, status: "active" }));
      if (!session || !user)
        throw new AppError(
          401,
          "UNAUTHENTICATED",
          "Phiên đăng nhập đã hết hạn.",
        );
      response.locals.auth = { session, user };
      response.setHeader("Cache-Control", "private, no-store");
      next();
    } catch (error) {
      next(error);
    }
  };
}
export function requireOrigin(config: AuthConfig): RequestHandler {
  return (request, _response, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      request.get("Origin") !== config.frontendOrigin
    ) {
      next(
        new AppError(
          403,
          "ORIGIN_NOT_ALLOWED",
          "Nguồn yêu cầu không được phép.",
        ),
      );
    } else next();
  };
}
export const requireCsrf: RequestHandler = (request, response, next) => {
  const token = request.get("X-CSRF-Token") ?? "";
  const expected = response.locals.auth?.session.csrfTokenHash;
  if (
    !/^[a-f0-9]{64}$/.test(token) ||
    typeof expected !== "string" ||
    !/^[a-f0-9]{64}$/.test(expected) ||
    !timingSafeEqual(Buffer.from(hash(token)), Buffer.from(expected))
  ) {
    next(
      new AppError(
        403,
        "CSRF_INVALID",
        "Phiên bảo vệ không hợp lệ. Vui lòng tải lại trang.",
      ),
    );
  } else next();
};
function userDto(user: {
  avatar?: { revision: string } | null;
  _id: unknown;
  displayName: string;
  email: string;
  createdAt: Date;
}) {
  return {
    id: String(user._id),
    displayName: user.displayName,
    email: user.email,
    createdAt: user.createdAt,
    avatarUrl: user.avatar ? "/api/v1/users/me/avatar?v=" + user.avatar.revision : null,
  };
}
export function createAuthRouter(config: AuthConfig): Router {
  const router = Router();
  const attempts = new Map<string, { count: number; resetAt: number }>();
  const limit: RequestHandler = (request, response, next) => {
    const now = Date.now();
    for (const [key, entry] of attempts)
      if (entry.resetAt <= now) attempts.delete(key);
    const key = request.ip ?? "unknown";
    const entry = attempts.get(key) ?? { count: 0, resetAt: now + 15 * 60_000 };
    if (entry.count >= 10 || (!attempts.has(key) && attempts.size >= 10000)) {
      response.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))),
      );
      next(
        new AppError(
          429,
          "RATE_LIMITED",
          "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
        ),
      );
      return;
    }
    entry.count++;
    attempts.set(key, entry);
    next();
  };
  router.use(requireOrigin(config));
  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  router.post("/register", limit, async (request, response) => {
    const input = parseInput(registrationSchema, request.body);
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    try {
      const user = await UserModel.create({
        displayName: input.displayName,
        email: input.email,
        passwordHash,
      });
      response
        .status(201)
        .json({ success: true, data: { user: userDto(user) } });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      )
        throw new AppError(409, "EMAIL_IN_USE", "Email đã được sử dụng.");
      throw error;
    }
  });
  // A dummy hash keeps unknown-account checks on the same password verification path.
  const dummyHash = argon2.hash(randomBytes(32).toString("hex"), {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  router.post("/login", limit, async (request, response) => {
    const input = parseInput(credentials, request.body);
    const user = await UserModel.findOne({ email: input.email }).select(
      "+passwordHash",
    );
    const valid = await argon2.verify(
      user?.passwordHash ?? (await dummyHash),
      input.password,
    );
    if (!user || user.status !== "active" || !valid)
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Email hoặc mật khẩu chưa đúng.",
      );
    const expiresAt = new Date(Date.now() + config.sessionTtlDays * 86400000);
    const tokenId = randomBytes(32).toString("hex");
    const token = await issueAccessToken(
      config,
      String(user._id),
      tokenId,
      expiresAt,
    );
    const csrfToken = csrfFor(token);
    await SessionModel.create({
      userId: user._id,
      tokenHash: hash(tokenId),
      csrfTokenHash: hash(csrfToken),
      expiresAt,
    });
    const previous = tokenFrom(request, config);
    if (previous) {
      try {
        const claims = await verifyAccessToken(config, previous);
        await SessionModel.deleteOne({ tokenHash: hash(claims.tokenId) });
      } catch {
        // Ignore an invalid or expired cookie while completing a valid login.
      }
    }
    response.cookie(config.sessionCookieName, token, {
      ...cookieOptions(config),
      expires: expiresAt,
    });
    response.json({ success: true, data: { user: userDto(user), csrfToken } });
  });
  router.get("/me", requireSession(config), (_request, response) => {
    response.json({
      success: true,
      data: { user: userDto(response.locals.auth.user) },
    });
  });
  router.get("/csrf", requireSession(config), async (_request, response) => {
    const csrfToken = csrfFor(tokenFrom(_request, config)!);
    await SessionModel.updateOne(
      { _id: principal(response).session._id },
      { $set: { csrfTokenHash: hash(csrfToken) } },
    );
    response.json({ success: true, data: { csrfToken } });
  });
  router.post(
    "/logout",
    requireSession(config),
    requireCsrf,
    async (_request, response) => {
      await SessionModel.deleteOne({ _id: response.locals.auth.session._id });
      response
        .clearCookie(config.sessionCookieName, cookieOptions(config))
        .status(204)
        .end();
    },
  );
  return router;
}
