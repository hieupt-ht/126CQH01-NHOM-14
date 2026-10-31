import { randomUUID } from 'node:crypto';
import type { Writable } from 'node:stream';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { AppConfig } from '../config/env.js';
import { getCloudinaryClient } from '../config/cloudinary.js';
import { imageUploadLimitBytes, MAX_IMAGE_UPLOAD_BYTES } from '../config/image-upload.js';

export const CLOUDINARY_IMAGE_CATEGORIES = ['generated', 'uploads', 'avatars'] as const;
export type CloudinaryImageCategory = (typeof CLOUDINARY_IMAGE_CATEGORIES)[number];

export interface StoredCloudinaryImage {
  imageUrl: string;
  publicId: string;
  assetId: string;
  format: 'png' | 'jpeg' | 'webp';
  width: number;
  height: number;
  bytes: number;
  version: string;
  deliveryMode: 'server-proxy';
}

export type CloudinaryClient = ReturnType<typeof getCloudinaryClient>;

export class CloudinaryStorageError extends Error {
  readonly name = 'CloudinaryStorageError';

  constructor(
    readonly code: 'CLOUDINARY_UPLOAD_FAILED' | 'CLOUDINARY_RESULT_UNCERTAIN' | 'CLOUDINARY_DELETE_FAILED',
    readonly outcome: 'failed' | 'unknown',
  ) {
    super('Cloudinary could not complete the image storage operation.');
  }
}

interface UploadInput {
  userId: string;
  bytes: Buffer;
}

function validateUserId(userId: string): void {
  if (!/^[a-f\d]{24}$/i.test(userId)) throw new TypeError('A valid authenticated user ID is required.');
}

function validateImage(buffer: Buffer, maxBytes: number): void {
  if (buffer.length === 0) throw new TypeError('Image data is required.');
  if (buffer.length > maxBytes) throw new TypeError('Image exceeds the configured size limit.');

  const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp = buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!isPng && !isJpeg && !isWebp) throw new TypeError('Only PNG, JPEG, and WebP images are supported.');
}

function imageMimeType(buffer: Buffer): 'image/png' | 'image/jpeg' | 'image/webp' {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  throw new TypeError('Only PNG, JPEG, and WebP images are supported.');
}

function decodeBase64Image(value: string, maxBytes: number): Buffer {
  let data = value;
  let declaredMime: string | undefined;
  if (value.startsWith('data:')) {
    const dataUri = /^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/.exec(value);
    if (!dataUri) throw new TypeError('Base64 image data is invalid or exceeds the configured size limit.');
    declaredMime = dataUri[1];
    data = dataUri[2];
  }
  const maxEncodedLength = Math.ceil(maxBytes / 3) * 4;
  if (data.length === 0 || data.length > maxEncodedLength || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 === 1) {
    throw new TypeError('Base64 image data is invalid or exceeds the configured size limit.');
  }
  const bytes = Buffer.from(data, 'base64');
  validateImage(bytes, maxBytes);
  if (declaredMime && declaredMime !== imageMimeType(bytes)) throw new TypeError('Base64 image MIME type does not match its file signature.');
  return bytes;
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === 'ETIMEDOUT'
    || candidate.code === 'ESOCKETTIMEDOUT'
    || (typeof candidate.message === 'string' && /timed?\s*out|timeout/i.test(candidate.message));
}

function normalizeFormat(format: string): 'png' | 'jpeg' | 'webp' {
  if (format === 'png' || format === 'webp') return format;
  if (format === 'jpg' || format === 'jpeg') return 'jpeg';
  throw new CloudinaryStorageError('CLOUDINARY_RESULT_UNCERTAIN', 'unknown');
}

export function createCloudinaryService(
  client: CloudinaryClient,
  maxImageBytes: number,
  makePublicId: () => string = randomUUID,
) {
  if (!Number.isSafeInteger(maxImageBytes) || maxImageBytes < 1 || maxImageBytes > MAX_IMAGE_UPLOAD_BYTES) {
    throw new RangeError('Image upload limit must be an integer from 1 byte to 95 MiB.');
  }

  async function upload(input: UploadInput, category: CloudinaryImageCategory): Promise<StoredCloudinaryImage> {
    validateUserId(input.userId);
    validateImage(input.bytes, maxImageBytes);

    const publicId = makePublicId();
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(publicId)) throw new Error('Cloudinary asset ID generator returned an invalid ID.');
    const options: UploadApiOptions = {
      asset_folder: `ai-image-studio/users/${input.userId}/${category}`,
      public_id: publicId,
      overwrite: false,
      unique_filename: false,
      resource_type: 'image',
      type: 'authenticated',
    };

    let result: UploadApiResponse;
    try {
      result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream: Writable = client.uploader.upload_stream(options, (error, response) => {
          if (error || !response) {
            reject(error ?? new Error('Cloudinary returned an empty upload result.'));
            return;
          }
          resolve(response);
        });
        stream.on('error', reject);
        stream.end(input.bytes);
      });
    } catch (error) {
      throw new CloudinaryStorageError(
        isTimeoutError(error) ? 'CLOUDINARY_RESULT_UNCERTAIN' : 'CLOUDINARY_UPLOAD_FAILED',
        isTimeoutError(error) ? 'unknown' : 'failed',
      );
    }

    if (!result.secure_url || !result.public_id || !result.asset_id || !result.format
      || !Number.isInteger(result.width) || result.width < 1
      || !Number.isInteger(result.height) || result.height < 1
      || !Number.isInteger(result.bytes) || result.bytes < 1
      || !Number.isFinite(result.version)) {
      throw new CloudinaryStorageError('CLOUDINARY_RESULT_UNCERTAIN', 'unknown');
    }

    if (result.public_id !== publicId) throw new CloudinaryStorageError('CLOUDINARY_RESULT_UNCERTAIN', 'unknown');
    return {
      imageUrl: result.secure_url,
      publicId: result.public_id,
      assetId: result.asset_id,
      format: normalizeFormat(result.format),
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      version: String(result.version),
      deliveryMode: 'server-proxy',
    };
  }

  return {
    uploadGeneratedImage(input: UploadInput): Promise<StoredCloudinaryImage> {
      return upload(input, 'generated');
    },
    uploadUserImage(input: UploadInput): Promise<StoredCloudinaryImage> {
      return upload(input, 'uploads');
    },
    uploadAvatar(input: UploadInput): Promise<StoredCloudinaryImage> {
      return upload(input, 'avatars');
    },
    async deleteImage(publicId: string): Promise<'deleted' | 'already_deleted'> {
      if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(publicId)) throw new TypeError('A valid Cloudinary image ID is required.');
      try {
        const result = await client.uploader.destroy(publicId, {
          resource_type: 'image',
          type: 'authenticated',
          invalidate: true,
        });
        if (result.result === 'ok') return 'deleted';
        if (result.result === 'not found') return 'already_deleted';
        throw new Error('Unexpected Cloudinary deletion response.');
      } catch {
        throw new CloudinaryStorageError('CLOUDINARY_DELETE_FAILED', 'unknown');
      }
    },
    async uploadGeneratedBase64Image(input: Omit<UploadInput, 'bytes'> & { base64: string }): Promise<StoredCloudinaryImage> {
      validateUserId(input.userId);
      const bytes = decodeBase64Image(input.base64, maxImageBytes);
      return await upload({ userId: input.userId, bytes }, 'generated');
    },
  };
}

export function getCloudinaryStorageService(config: Pick<AppConfig, 'maxImageUploadMb'>) {
  return createCloudinaryService(getCloudinaryClient(), imageUploadLimitBytes(config.maxImageUploadMb));
}
