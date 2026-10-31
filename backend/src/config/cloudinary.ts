import { createHash } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { AppConfig, EnvironmentValidationError } from './env.js';

let configured = false;
let configuredFingerprint: string | undefined;

export function configureCloudinary(config: Pick<
  AppConfig,
  'cloudinaryCloudName' | 'cloudinaryApiKey' | 'cloudinaryApiSecret' | 'cloudinaryTimeoutMs'
>): void {
  if (!config.cloudinaryCloudName?.trim() || !config.cloudinaryApiKey?.trim() || !config.cloudinaryApiSecret?.trim()) {
    throw new EnvironmentValidationError('Cloudinary configuration is incomplete.');
  }

  const fingerprint = createHash('sha256')
    .update([config.cloudinaryCloudName, config.cloudinaryApiKey, config.cloudinaryApiSecret, config.cloudinaryTimeoutMs].join('\0'))
    .digest('hex');
  if (configured) {
    if (configuredFingerprint !== fingerprint) {
      throw new EnvironmentValidationError('Cloudinary configuration cannot be changed after initialization.');
    }
    return;
  }

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true,
    timeout: config.cloudinaryTimeoutMs,
  });
  configuredFingerprint = fingerprint;
  configured = true;
}

export function getCloudinaryClient(): typeof cloudinary {
  if (!configured) throw new Error('Cloudinary has not been configured.');
  return cloudinary;
}
