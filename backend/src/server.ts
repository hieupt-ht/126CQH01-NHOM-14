import { GenerationService } from './modules/generations/service.js';
import { CloudflareProvider } from './providers/cloudflare.js';
import { AzureBlobStorage, StorageRegistry } from './storage/storage.js';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { AppConfig, validateEnv } from './config/env.js';
import { connectMongo, disconnectMongo } from './config/database.js';
import { createDeclaredIndexes } from './models/index.js';

const workers = new WeakMap<Server, GenerationService>();

export async function startServer(config: AppConfig = validateEnv()): Promise<Server> {
  await connectMongo(config.mongodbUri, {
    serverSelectionTimeoutMS: config.mongodbServerSelectionTimeoutMs,
  });

  try {
    if (config.mongooseAutoIndex) await createDeclaredIndexes();
    const storage = config.azureAccountUrl && config.azureContainer ? new AzureBlobStorage(config.azureAccountUrl, config.azureContainer, config.azureAccountAlias, config.storageNamespace) : undefined;
    const registry = new StorageRegistry(storage ? new Map([['azure:' + config.azureAccountAlias, storage]]) : new Map());
    const generations = storage ? new GenerationService(new CloudflareProvider(config.cloudflareAccountId ?? '', config.cloudflareApiToken ?? ''), storage,
      { userLimit: config.dailyUserLimit, appLimit: config.dailyAppLimit, cooldownMs: 15000, checkpointDir: config.imageStorageDir }, registry, config.generationEnabled) : undefined;
    const server = createApp(config, { generations: config.generationEnabled ? generations : undefined, registry, userLimit: config.dailyUserLimit, appLimit: config.dailyAppLimit }).listen(config.port);
    if (generations) { workers.set(server, generations); generations.start(); }
    await once(server, 'listening');
    console.info(`Backend listening on port ${config.port}.`);
    return server;
  } catch (error) {
    await disconnectMongo();
    throw error;
  }
}

export async function shutdown(server: Server): Promise<void> {
  await workers.get(server)?.stop();
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
  await disconnectMongo();
}

async function run(): Promise<void> {
  const config = validateEnv();
  const server = await startServer(config);
  let shuttingDown = false;

  const handleSignal = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`Received ${signal}; shutting down gracefully.`);
    void shutdown(server).catch(async () => {
      console.error('Graceful shutdown failed.');
      await disconnectMongo().catch(() => undefined);
      process.exitCode = 1;
    });
  };

  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  void run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown startup failure.';
    console.error(`Backend startup failed: ${message}`);
    process.exitCode = 1;
  });
}
