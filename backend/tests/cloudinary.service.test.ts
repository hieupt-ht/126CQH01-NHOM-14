import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { configureCloudinary, getCloudinaryClient } from '../src/config/cloudinary.js';
import {
  CloudinaryStorageError,
  createCloudinaryService,
  type CloudinaryClient,
} from '../src/services/cloudinary.service.js';

const userId = '671000000000000000000010';
const publicId = 'd9428888-122b-4e5e-8d5c-7a1a2c3d4e5f';
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);

test('Cloudinary SDK v2 is configured securely once from validated environment values', () => {
  configureCloudinary({
    cloudinaryCloudName: 'test-cloud',
    cloudinaryApiKey: 'test-key',
    cloudinaryApiSecret: 'test-secret',
    cloudinaryTimeoutMs: 30000,
  });
  const configuration = getCloudinaryClient().config();
  assert.equal(configuration.cloud_name, 'test-cloud');
  assert.equal(configuration.secure, true);
  assert.equal(Boolean(configuration.api_secret), true);
});

function createFakeClient(options: {
  uploadError?: Error;
  deleteResult?: string;
  format?: string;
} = {}) {
  const calls: Array<{ options: UploadApiOptions; bytes: Buffer }> = [];
  const deleted: Array<{ publicId: string; options: unknown }> = [];
  const response = {
    secure_url: 'https://res.cloudinary.com/test/image/authenticated/id.png',
    public_id: publicId,
    asset_id: 'cloudinary-asset-id',
    format: options.format ?? 'png',
    width: 1,
    height: 1,
    bytes: png.length,
    version: 123,
  } as UploadApiResponse;
  const fake = {
    uploader: {
      upload_stream(uploadOptions: UploadApiOptions, callback: (error?: Error, result?: UploadApiResponse) => void) {
        const chunks: Buffer[] = [];
        return new Writable({
          write(chunk: Buffer, _encoding, done) {
            chunks.push(Buffer.from(chunk));
            done();
          },
          final(done) {
            calls.push({ options: uploadOptions, bytes: Buffer.concat(chunks) });
            callback(options.uploadError, options.uploadError ? undefined : response);
            done();
          },
        });
      },
      async destroy(id: string, destroyOptions: unknown) {
        deleted.push({ publicId: id, options: destroyOptions });
        return { result: options.deleteResult ?? 'ok' };
      },
    },
  } as unknown as CloudinaryClient;
  return { client: fake, calls, deleted };
}

test('Cloudinary generated image upload validates content and uses owner asset folder with authenticated delivery', async () => {
  const fake = createFakeClient();
  const service = createCloudinaryService(fake.client, 100, () => publicId);
  const result = await service.uploadGeneratedImage({ userId, bytes: png });

  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].options.asset_folder, `ai-image-studio/users/${userId}/generated`);
  assert.equal(fake.calls[0].options.resource_type, 'image');
  assert.equal(fake.calls[0].options.type, 'authenticated');
  assert.equal(fake.calls[0].options.overwrite, false);
  assert.equal(fake.calls[0].options.folder, undefined);
  assert.equal(fake.calls[0].options.public_id, publicId);
  assert.deepEqual(fake.calls[0].bytes, png);
  assert.equal(result.publicId, publicId);
  assert.equal(result.assetId, 'cloudinary-asset-id');
  assert.equal(result.deliveryMode, 'server-proxy');
});

test('Cloudinary upload rejects invalid owner, image signatures, and oversized bytes before provider calls', async () => {
  const fake = createFakeClient();
  const service = createCloudinaryService(fake.client, 20, () => publicId);

  await assert.rejects(service.uploadUserImage({ userId: 'not-an-object-id', bytes: png }), TypeError);
  await assert.rejects(service.uploadUserImage({ userId, bytes: Buffer.from('not an image') }), /Only PNG/);
  await assert.rejects(service.uploadUserImage({ userId, bytes: Buffer.concat([png, Buffer.alloc(12)]) }), /size limit/);
  assert.equal(fake.calls.length, 0);
});

test('Cloudinary service rejects unsafe size limits during setup', () => {
  const fake = createFakeClient();
  for (const invalidLimit of [0, -1, 1.5, 95 * 1024 * 1024 + 1]) {
    assert.throws(() => createCloudinaryService(fake.client, invalidLimit), /upload limit/);
  }
});

test('Cloudinary normalizes JPEG format names to the MongoDB image enum', async () => {
  const fake = createFakeClient({ format: 'jpg' });
  const service = createCloudinaryService(fake.client, 100, () => publicId);
  const result = await service.uploadUserImage({ userId, bytes: Buffer.from([0xff, 0xd8, 0xff, 1]) });

  assert.equal(result.format, 'jpeg');
  assert.equal(fake.calls[0].options.asset_folder, `ai-image-studio/users/${userId}/uploads`);
});

test('Cloudinary Base64 upload decodes within bounds and rejects malformed data before upload', async () => {
  const fake = createFakeClient();
  const service = createCloudinaryService(fake.client, 100, () => publicId);

  const result = await service.uploadGeneratedBase64Image({ userId, base64: `data:image/png;base64,${png.toString('base64')}` });
  assert.equal(result.format, 'png');
  assert.deepEqual(fake.calls[0].bytes, png);
  await assert.rejects(service.uploadGeneratedBase64Image({ userId, base64: '%%%invalid%%%' }), /Base64 image data/);
  await assert.rejects(
    service.uploadGeneratedBase64Image({ userId, base64: `data:image/jpeg;base64,${png.toString('base64')}` }),
    /does not match its file signature/,
  );
  assert.equal(fake.calls.length, 1);
});

test('Cloudinary timeout is marked uncertain and deletion is idempotent for already missing assets', async () => {
  const timeoutFake = createFakeClient({ uploadError: Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' }) });
  const timeoutService = createCloudinaryService(timeoutFake.client, 100, () => publicId);
  await assert.rejects(
    timeoutService.uploadGeneratedImage({ userId, bytes: png }),
    (error: unknown) => error instanceof CloudinaryStorageError && error.code === 'CLOUDINARY_RESULT_UNCERTAIN' && error.outcome === 'unknown',
  );

  const deleteFake = createFakeClient({ deleteResult: 'not found' });
  const deleteService = createCloudinaryService(deleteFake.client, 100);
  assert.equal(await deleteService.deleteImage(publicId), 'already_deleted');
  assert.equal((deleteFake.deleted[0].options as { type: string }).type, 'authenticated');
});
