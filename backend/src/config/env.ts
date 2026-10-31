import 'dotenv/config';
import { DEFAULT_MAX_IMAGE_UPLOAD_MB, MAX_IMAGE_UPLOAD_MB } from './image-upload.js';

export type NodeEnvironment = 'development' | 'test' | 'production';
export type SameSitePolicy = 'lax' | 'strict' | 'none';

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  mongodbUri: string;
  mongodbUsername?: string;
  mongodbPassword?: string;
  mongodbAuthSource: string;
  mongodbServerSelectionTimeoutMs: number;
  frontendOrigin: string;
  mongooseAutoIndex: boolean;
  sessionCookieName: string;
  sessionTtlDays: number;
  sessionCookieSameSite: SameSitePolicy;
  sessionCookieSecure: boolean;
  geminiApiKey?: string;
  geminiImageModel?: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  cloudinaryTimeoutMs: number;
  maxImageUploadMb: number;
}

export class EnvironmentValidationError extends Error {
  readonly name = 'EnvironmentValidationError';
  constructor(message: string) {
    super(message);
  }
}

type EnvSource = Record<string, string | undefined>;

function readInteger(source: EnvSource, key: string, fallback: number, min: number, max: number): number {
  const raw = source[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  if (!/^\d+$/.test(raw.trim())) {
    throw new EnvironmentValidationError(`${key} must be an integer between ${min} and ${max}.`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new EnvironmentValidationError(`${key} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function readBoolean(source: EnvSource, key: string, fallback: boolean): boolean {
  const raw = source[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new EnvironmentValidationError(`${key} must be true or false.`);
}

function readRequiredValue(source: EnvSource, key: string): string {
  const value = source[key]?.trim();
  if (!value) throw new EnvironmentValidationError(`${key} is required.`);
  return value;
}

function readOrigin(source: EnvSource): string {
  const value = source.FRONTEND_ORIGIN?.trim() || 'http://localhost:5173';
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new EnvironmentValidationError('FRONTEND_ORIGIN must be a valid absolute origin URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== value.replace(/\/$/, '')) {
    throw new EnvironmentValidationError('FRONTEND_ORIGIN must contain only an http(s) origin without a path.');
  }
  return parsed.origin;
}

export function validateEnv(source: EnvSource = process.env): AppConfig {
  const rawNodeEnv = source.NODE_ENV?.trim() || 'development';
  if (!['development', 'test', 'production'].includes(rawNodeEnv)) {
    throw new EnvironmentValidationError('NODE_ENV must be development, test, or production.');
  }
  const nodeEnv = rawNodeEnv as NodeEnvironment;

  const mongodbUri = source.MONGODB_URI?.trim();
  if (!mongodbUri) throw new EnvironmentValidationError('MONGODB_URI is required.');
  if (!/^(mongodb|mongodb\+srv):\/\//i.test(mongodbUri)) {
    throw new EnvironmentValidationError('MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme.');
  }

  const mongodbUsername = source.MONGODB_USERNAME?.trim() || undefined;
  const mongodbPassword = source.MONGODB_PASSWORD;
  if ((mongodbUsername === undefined) !== (mongodbPassword === undefined) || mongodbPassword === '') {
    throw new EnvironmentValidationError('MONGODB_USERNAME and MONGODB_PASSWORD must be set together.');
  }

  const sameSiteRaw = source.SESSION_COOKIE_SAME_SITE?.trim().toLowerCase() || 'lax';
  if (!['lax', 'strict', 'none'].includes(sameSiteRaw)) {
    throw new EnvironmentValidationError('SESSION_COOKIE_SAME_SITE must be lax, strict, or none.');
  }
  const sessionCookieSecure = readBoolean(source, 'SESSION_COOKIE_SECURE', nodeEnv === 'production');
  if (sameSiteRaw === 'none' && !sessionCookieSecure) {
    throw new EnvironmentValidationError('SESSION_COOKIE_SECURE must be true when SESSION_COOKIE_SAME_SITE is none.');
  }

  return {
    nodeEnv,
    port: readInteger(source, 'PORT', 3000, 1, 65535),
    mongodbUri,
    mongodbUsername,
    mongodbPassword,
    mongodbAuthSource: source.MONGODB_AUTH_SOURCE?.trim() || 'admin',
    mongodbServerSelectionTimeoutMs: readInteger(source, 'MONGODB_SERVER_SELECTION_TIMEOUT_MS', 5000, 100, 120000),
    frontendOrigin: readOrigin(source),
    mongooseAutoIndex: readBoolean(source, 'MONGOOSE_AUTO_INDEX', nodeEnv !== 'production'),
    sessionCookieName: source.SESSION_COOKIE_NAME?.trim() || 'flux_session',
    sessionTtlDays: readInteger(source, 'SESSION_TTL_DAYS', 7, 1, 365),
    sessionCookieSameSite: sameSiteRaw as SameSitePolicy,
    sessionCookieSecure,
    geminiApiKey: source.GEMINI_API_KEY?.trim() || undefined,
    geminiImageModel: source.GEMINI_IMAGE_MODEL?.trim() || undefined,
    cloudinaryCloudName: readRequiredValue(source, 'CLOUDINARY_CLOUD_NAME'),
    cloudinaryApiKey: readRequiredValue(source, 'CLOUDINARY_API_KEY'),
    cloudinaryApiSecret: readRequiredValue(source, 'CLOUDINARY_API_SECRET'),
    cloudinaryTimeoutMs: readInteger(source, 'CLOUDINARY_TIMEOUT_MS', 30000, 1000, 120000),
    maxImageUploadMb: readInteger(source, 'MAX_IMAGE_UPLOAD_MB', DEFAULT_MAX_IMAGE_UPLOAD_MB, 1, MAX_IMAGE_UPLOAD_MB),
  };
}
