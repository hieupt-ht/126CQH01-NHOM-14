import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { validateEnv } from "../config/env.js";
import { shutdown, startServer } from "../server.js";

// Developer convenience only: a loopback-only single-node replica set, durable in backend/data/mongo.
const dbPath = resolve("data/mongo");
await mkdir(dbPath, { recursive: true });
const repl = await MongoMemoryReplSet.create({
  binary: { version: "8.2.6" },
  replSet: { count: 1, name: "rs0", ip: "127.0.0.1" },
  instanceOpts: [{ dbPath, port: 27027, storageEngine: "wiredTiger" }],
});
let server;
try {
  server = await startServer(
    validateEnv({
      ...process.env,
      NODE_ENV: "development",
      MONGODB_URI: repl.getUri("flux_studio"),
    }),
  );
} catch (error) {
  await repl.stop({ doCleanup: false, force: false });
  throw error;
}
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  try {
    await shutdown(server);
  } finally {
    await repl.stop({ doCleanup: false, force: false });
  }
};
process.once("SIGINT", () => {
  void stop();
});
process.once("SIGTERM", () => {
  void stop();
});
console.info(
  "Local replica set ready. Data stays in backend/data/mongo. Cloud calls remain disabled unless explicitly configured.",
);
