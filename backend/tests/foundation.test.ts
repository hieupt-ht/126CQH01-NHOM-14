import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, test } from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectMongo, DatabaseConnectionError, disconnectMongo } from '../src/config/database.js';
import { EnvironmentValidationError, validateEnv } from '../src/config/env.js';
import { AppError } from '../src/errors/app-error.js';
import { asyncHandler } from '../src/middlewares/async-handler.js';
import { errorHandler } from '../src/middlewares/error-handler.js';
import { validateJsonObject } from '../src/middlewares/validate-json-object.js';
import { DailyUsageModel } from '../src/models/daily-usage.model.js';
import { GENERATION_STATUSES, GenerationModel } from '../src/models/generation.model.js';
import { ImageModel } from '../src/models/image.model.js';
import { SessionModel } from '../src/models/session.model.js';
import { createDeclaredIndexes, UserModel } from '../src/models/index.js';
import { shutdown } from '../src/server.js';

const validEnvironment = {
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/flux-test',
  FRONTEND_ORIGIN: 'http://localhost:5173',
};

after(async () => {
  await disconnectMongo().catch(() => undefined);
});

test('environment validation accepts valid configuration and applies safe defaults', () => {
  const config = validateEnv(validEnvironment);
  assert.equal(config.port, 3000);
  assert.equal(config.mongodbUsername, undefined);
  assert.equal(config.mongodbPassword, undefined);
  assert.equal(config.mongodbAuthSource, 'admin');
  assert.equal(config.frontendOrigin, 'http://localhost:5173');
  assert.equal(config.sessionCookieName, 'flux_session');
  assert.equal(config.sessionCookieSecure, false);
  assert.equal(config.mongooseAutoIndex, true);
});

test('environment validation keeps MongoDB credentials separate from the URI', () => {
  const password = 'p@ss:/?#% with spaces';
  const config = validateEnv({
    ...validEnvironment,
    MONGODB_USERNAME: 'flux_dev',
    MONGODB_PASSWORD: password,
    MONGODB_AUTH_SOURCE: 'admin',
  });

  assert.equal(config.mongodbUri, validEnvironment.MONGODB_URI);
  assert.equal(config.mongodbUsername, 'flux_dev');
  assert.equal(config.mongodbPassword, password);
  assert.throws(
    () => validateEnv({ ...validEnvironment, MONGODB_USERNAME: 'flux_dev' }),
    /MONGODB_USERNAME and MONGODB_PASSWORD must be set together/,
  );
});

test('environment validation rejects invalid values without echoing secrets', () => {
  assert.throws(() => validateEnv({ NODE_ENV: 'test' }), /MONGODB_URI is required/);
  assert.throws(() => validateEnv({ ...validEnvironment, MONGODB_URI: 'https://db.example.test' }), /mongodb:\/\//);
  assert.throws(
    () => validateEnv({ ...validEnvironment, PORT: '70000' }),
    (error: unknown) => error instanceof EnvironmentValidationError && /PORT/.test(error.message),
  );
  assert.throws(
    () => validateEnv({ ...validEnvironment, FRONTEND_ORIGIN: 'http://localhost:5173/path' }),
    EnvironmentValidationError,
  );
  assert.throws(
    () => validateEnv({ ...validEnvironment, SESSION_COOKIE_SAME_SITE: 'none' }),
    /SESSION_COOKIE_SECURE/,
  );
});

test('MongoDB connection errors are wrapped in a safe message', async () => {
  await assert.rejects(
    connectMongo('mongodb://127.0.0.1:1/flux-foundation-test', { serverSelectionTimeoutMS: 100 }),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseConnectionError);
      assert.doesNotMatch(error.message, /127\.0\.0\.1|flux-foundation-test/);
      return true;
    },
  );
});

test('user schema validates required fields, normalizes email and hides passwordHash', async () => {
  const user = new UserModel({ displayName: '  Linh Nguyen ', email: ' LINH@EXAMPLE.TEST ', passwordHash: 'test-hash' });
  await user.validate();
  assert.equal(user.displayName, 'Linh Nguyen');
  assert.equal(user.email, 'linh@example.test');
  assert.equal(user.status, 'active');
  assert.equal(user.activeGenerationId, null);
  assert.equal(user.lastGenerationAt, null);
  assert.equal(JSON.stringify(user).includes('passwordHash'), false);
  assert.equal(user.schema.indexes().some(([keys, options]) => keys.email === 1 && options.unique === true), true);

  await assert.rejects(new UserModel({ displayName: 'No hash', email: 'a@example.test' }).validate());
});

test('session schema references users, hides tokenHash and declares unique and TTL indexes', async () => {
  const session = new SessionModel({
    userId: new mongoose.Types.ObjectId(),
    tokenHash: 'test-only-token-hash',
    expiresAt: new Date(Date.now() + 60_000),
  });
  await session.validate();
  assert.ok(session.createdAt instanceof Date);
  assert.ok(session.lastSeenAt instanceof Date);
  assert.equal(JSON.stringify(session).includes('tokenHash'), false);
  assert.equal(
    session.schema.indexes().some(([keys, options]) => keys.tokenHash === 1 && options.unique === true),
    true,
  );
  assert.equal(session.schema.indexes().some(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0), true);
});

test('generation schema only accepts documented lifecycle statuses', async () => {
  const generation = new GenerationModel({
    userId: new mongoose.Types.ObjectId(),
    requestKey: 'request-test',
    requestFingerprint: 'fingerprint-test',
    originalPrompt: 'A quiet landscape',
    submittedPrompt: 'A quiet landscape',
    provider: 'google-genai',
    model: 'configured-image-model',
    quotaReservation: { dateKey: '2026-10-30', userReserved: true, appReserved: true },
  });
  await generation.validate();
  assert.equal(generation.status, 'queued');
  assert.deepEqual(GENERATION_STATUSES, ['queued', 'processing', 'saving', 'succeeded', 'failed', 'needs_review']);

  generation.status = 'complete' as (typeof GENERATION_STATUSES)[number];
  await assert.rejects(generation.validate(), /status/);
});

test('image schema validates metadata, storage references, formats and defaults', async () => {
  const image = new ImageModel({
    userId: new mongoose.Types.ObjectId(),
    generationId: new mongoose.Types.ObjectId(),
    title: '  Sample image  ',
    storage: { provider: 'local-filesystem', key: 'objects/random.png', deliveryMode: 'server-proxy' },
    width: 1024,
    height: 1024,
    format: 'png',
    bytes: 1024,
  });
  await image.validate();
  assert.equal(image.title, 'Sample image');
  assert.equal(image.isFavorite, false);
  assert.equal(image.deletedAt, null);
  assert.equal(image.storageDeletionStatus, 'not_requested');
  assert.equal(image.schema.indexes().some(([keys, options]) => keys.generationId === 1 && options.unique === true), true);

  const invalid = new ImageModel({ ...image.toObject(), format: 'gif', width: 0 });
  await assert.rejects(invalid.validate());
});

test('daily usage schema declares its compound unique scope and date key', async () => {
  const usage = new DailyUsageModel({ scopeType: 'user', scopeId: 'abc123', dateKey: '2026-10-30' });
  await usage.validate();
  assert.equal(usage.reservedRequests, 0);
  assert.equal(
    usage.schema.indexes().some(([keys, options]) => keys.scopeType === 1 && keys.scopeId === 1 && keys.dateKey === 1 && options.unique === true),
    true,
  );
  await assert.rejects(new DailyUsageModel({ scopeType: 'unknown', scopeId: 'x', dateKey: '20261030' }).validate());
});

test('all model schemas disable implicit index changes', () => {
  for (const model of [UserModel, SessionModel, GenerationModel, ImageModel, DailyUsageModel]) {
    assert.equal(model.schema.options.autoIndex, false);
  }
});

test('health endpoint preserves the response and security headers', async () => {
  const server = createApp({ frontendOrigin: 'http://localhost:5173' }).listen(0);
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-powered-by'), null);

    const allowedOrigin = await fetch(`http://127.0.0.1:${address.port}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(allowedOrigin.headers.get('access-control-allow-origin'), 'http://localhost:5173');

    const rejectedOrigin = await fetch(`http://127.0.0.1:${address.port}/api/health`, {
      headers: { Origin: 'https://untrusted.example' },
    });
    assert.equal(rejectedOrigin.status, 403);
    assert.match(await rejectedOrigin.text(), /ORIGIN_NOT_ALLOWED/);
  } finally {
    await new Promise<void>((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  }
});

test('graceful shutdown closes the HTTP server and database connection', async () => {
  const server = createApp({ frontendOrigin: 'http://localhost:5173' }).listen(0);
  await once(server, 'listening');
  await shutdown(server);
  assert.equal(server.listening, false);
  assert.equal(mongoose.connection.readyState, 0);
});

test('central error handler returns safe errors for async and unexpected failures', async () => {
  const app = express();
  app.get('/test-async-error', asyncHandler(async () => { throw new AppError(400, 'TEST_ERROR', 'Safe test message.'); }));
  app.get('/test-unexpected-error', asyncHandler(async () => { throw new Error('private database detail'); }));
  app.use(errorHandler);
  const server = app.listen(0);
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    const known = await fetch(`http://127.0.0.1:${address.port}/test-async-error`);
    assert.equal(known.status, 400);
    assert.deepEqual(await known.json(), { success: false, error: { code: 'TEST_ERROR', message: 'Safe test message.' } });

    const unexpected = await fetch(`http://127.0.0.1:${address.port}/test-unexpected-error`);
    assert.equal(unexpected.status, 500);
    const payload = await unexpected.text();
    assert.doesNotMatch(payload, /private database detail|stack/i);
    assert.match(payload, /INTERNAL_ERROR/);
  } finally {
    await new Promise<void>((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  }
});

test('request validation rejects non-object bodies and unknown fields', async () => {
  const app = express();
  app.use(express.json());
  app.post('/test-validation', validateJsonObject({ allowedKeys: ['prompt'], requiredKeys: ['prompt'] }), (_request, response) => {
    response.status(204).end();
  });
  app.use(errorHandler);
  const server = app.listen(0);
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    const invalid = await fetch(`http://127.0.0.1:${address.port}/test-validation`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'ok', userId: 'attacker-value' }),
    });
    assert.equal(invalid.status, 400);
    assert.match(await invalid.text(), /UNKNOWN_REQUEST_FIELD/);
  } finally {
    await new Promise<void>((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  }
});

const testMongoUri = process.env.MONGODB_TEST_URI;
test('MongoDB unique email and dailyUsage indexes reject duplicate inserts when a test URI is configured', {
  skip: testMongoUri ? false : 'MONGODB_TEST_URI is not configured; no MongoDB writes were attempted.',
}, async () => {
  assert.ok(testMongoUri);
  const databaseName = testMongoUri.split('/').filter(Boolean).at(-1)?.split('?')[0] ?? '';
  assert.match(databaseName, /(^|[_-])test([_-]|$)/i, 'MONGODB_TEST_URI must point to a database with "test" in its name.');
  await connectMongo(testMongoUri, { serverSelectionTimeoutMS: 1500 });
  await createDeclaredIndexes();

  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `phase1-${suffix}@example.test`;
  const scopeId = `phase1-${suffix}`;
  let createdUserId: mongoose.Types.ObjectId | undefined;
  try {
    const insertedUser = await UserModel.create({ displayName: 'Test User', email, passwordHash: 'test-only-hash' });
    createdUserId = insertedUser._id;
    await assert.rejects(
      UserModel.create({ displayName: 'Duplicate', email, passwordHash: 'test-only-hash' }),
      (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000),
    );

    await DailyUsageModel.create({ scopeType: 'user', scopeId, dateKey: '2026-10-30' });
    await assert.rejects(
      DailyUsageModel.create({ scopeType: 'user', scopeId, dateKey: '2026-10-30' }),
      (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000),
    );
  } finally {
    if (createdUserId) await UserModel.deleteOne({ _id: createdUserId });
    await DailyUsageModel.deleteMany({ scopeId });
  }
  // Leave the explicitly configured test database intact; only the test records are removed.
});
