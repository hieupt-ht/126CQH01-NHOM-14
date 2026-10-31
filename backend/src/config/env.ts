import 'dotenv/config';
import { resolve } from 'node:path';

export type NodeEnvironment = 'development' | 'test' | 'production';
export type SameSitePolicy = 'lax' | 'strict' | 'none';

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  mongodbUri: string;
  mongodbServerSelectionTimeoutMs: number;
  frontendOrigin: string;
  mongooseAutoIndex: boolean;
  sessionCookieName: string;
  sessionTtlDays: number;
  sessionCookieSameSite: SameSitePolicy;
  sessionCookieSecure: boolean;
  generationEnabled: boolean;
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
  azureAccountUrl?: string;
  azureContainer?: string;
  azureAccountAlias: string;
  storageNamespace: string;
  dailyUserLimit: number;
  dailyAppLimit: number;
  imageStorageDir: string;
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

  const sameSiteRaw = source.SESSION_COOKIE_SAME_SITE?.trim().toLowerCase() || 'lax';
  if (!['lax', 'strict', 'none'].includes(sameSiteRaw)) {
    throw new EnvironmentValidationError('SESSION_COOKIE_SAME_SITE must be lax, strict, or none.');
  }
  const sessionCookieSecure = readBoolean(source, 'SESSION_COOKIE_SECURE', nodeEnv === 'production');
  if (sameSiteRaw === 'none' && !sessionCookieSecure) {
    throw new EnvironmentValidationError('SESSION_COOKIE_SECURE must be true when SESSION_COOKIE_SAME_SITE is none.');
  }

  if (nodeEnv === 'production' && !sessionCookieSecure) throw new EnvironmentValidationError('SESSION_COOKIE_SECURE must be true in production.');

  const generationEnabled = readBoolean(source, 'GENERATION_ENABLED', false);
  if (generationEnabled) {
    for (const key of ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','AZURE_STORAGE_ACCOUNT_URL','AZURE_STORAGE_CONTAINER']) {
      if (!source[key]?.trim()) throw new EnvironmentValidationError(key + ' is required when GENERATION_ENABLED=true.');
    }
    if (!/^[a-f0-9]{32}$/i.test(source.CLOUDFLARE_ACCOUNT_ID!.trim())) throw new EnvironmentValidationError('CLOUDFLARE_ACCOUNT_ID is invalid.');
    let azureUrl: URL;
    try { azureUrl = new URL(source.AZURE_STORAGE_ACCOUNT_URL!); } catch { throw new EnvironmentValidationError('AZURE_STORAGE_ACCOUNT_URL is invalid.'); }
    if (azureUrl.protocol !== 'https:' || !/^[a-z0-9]+\.blob\.core\.windows\.net$/.test(azureUrl.hostname) || azureUrl.search || azureUrl.username || azureUrl.password || azureUrl.pathname !== '/')
      throw new EnvironmentValidationError('AZURE_STORAGE_ACCOUNT_URL must be an Azure HTTPS account endpoint without credentials.');
  }
  const cookieName = source.SESSION_COOKIE_NAME?.trim() || 'flux_session';
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(cookieName)) throw new EnvironmentValidationError('SESSION_COOKIE_NAME is invalid.');
  const storageNamespace = source.IMAGE_STORAGE_NAMESPACE?.trim() || 'flux-studio/local';
  if (!/^[a-z0-9][a-z0-9/_-]{0,99}$/.test(storageNamespace)) throw new EnvironmentValidationError('IMAGE_STORAGE_NAMESPACE is invalid.');
  if (source.AZURE_STORAGE_CONTAINER?.trim() && !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(source.AZURE_STORAGE_CONTAINER.trim())) throw new EnvironmentValidationError('AZURE_STORAGE_CONTAINER is invalid.');
  return {
    nodeEnv,
    port: readInteger(source, 'PORT', 3000, 1, 65535),
    mongodbUri,
    mongodbServerSelectionTimeoutMs: readInteger(source, 'MONGODB_SERVER_SELECTION_TIMEOUT_MS', 5000, 100, 120000),
    frontendOrigin: readOrigin(source),
    mongooseAutoIndex: readBoolean(source, 'MONGOOSE_AUTO_INDEX', nodeEnv !== 'production'),
    sessionCookieName: cookieName,
    sessionTtlDays: readInteger(source, 'SESSION_TTL_DAYS', 7, 1, 365),
    sessionCookieSameSite: sameSiteRaw as SameSitePolicy,
    sessionCookieSecure,
    generationEnabled, storageNamespace,
    cloudflareAccountId: source.CLOUDFLARE_ACCOUNT_ID?.trim(), cloudflareApiToken: source.CLOUDFLARE_API_TOKEN?.trim(),
    azureAccountUrl: source.AZURE_STORAGE_ACCOUNT_URL?.trim(), azureContainer: source.AZURE_STORAGE_CONTAINER?.trim(),
    azureAccountAlias: source.AZURE_STORAGE_ACCOUNT_ALIAS?.trim() || 'demo-primary',
    dailyUserLimit: readInteger(source, 'DAILY_USER_LIMIT', 5, 1, 100), dailyAppLimit: readInteger(source, 'DAILY_APP_LIMIT', 20, 1, 100),
    imageStorageDir: resolve(source.IMAGE_STORAGE_DIR?.trim() || 'data/images'),
  };
}
