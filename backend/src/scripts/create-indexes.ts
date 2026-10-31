import { validateEnv } from '../config/env.js';
import { connectMongo, disconnectMongo } from '../config/database.js';
import { createDeclaredIndexes } from '../models/index.js';

async function main(): Promise<void> {
  const config = validateEnv();
  await connectMongo(config.mongodbUri, {
    serverSelectionTimeoutMS: config.mongodbServerSelectionTimeoutMs,
    ...(config.mongodbUsername !== undefined && config.mongodbPassword !== undefined
      ? { auth: { username: config.mongodbUsername, password: config.mongodbPassword }, authSource: config.mongodbAuthSource }
      : {}),
  });
  try {
    await createDeclaredIndexes();
    console.info('Declared indexes created or already present. No indexes were dropped.');
  } finally {
    await disconnectMongo();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown index creation failure.';
  console.error(`Index creation failed: ${message}`);
  process.exitCode = 1;
});
