import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Disposable isolated replica set. No API/provider/cloud call and no application database URI.
const repl = await MongoMemoryReplSet.create({
  binary: { version: "8.2.6" },
  replSet: { count: 1 },
});
try {
  await mongoose.connect(repl.getUri("flux_course_test"));
  const database = mongoose.connection.db!;
  const collection = database.collection("course_images");
  const owner = new Types.ObjectId();
  const anotherOwner = new Types.ObjectId();
  const docs = Array.from({ length: 10000 }, (_, index) => ({
    userId: index % 10 === 0 ? owner : anotherOwner,
    generationId: new Types.ObjectId(),
    title: "Synthetic course record " + index,
    deletedAt: null,
    createdAt: new Date(Date.UTC(2026, 9, 1) + index * 1000),
    bytes: 1024 + index,
    status: index % 7 ? "succeeded" : "failed",
    durationMs: 1000 + (index % 5000),
    source: "synthetic-no-image-file",
  }));
  await collection.insertMany(docs);
  const query = { userId: owner, deletedAt: null };
  const before = await collection
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(20)
    .explain("executionStats");
  await collection.createIndex(
    { userId: 1, deletedAt: 1, createdAt: -1, _id: -1 },
    { name: "course_user_library" },
  );
  const after = await collection
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(20)
    .explain("executionStats");
  const stats = await collection
    .aggregate([
      { $match: { userId: owner } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          averageDurationMs: { $avg: "$durationMs" },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  // Actual MongoDB collection-level validation, independent of Mongoose.
  await database.createCollection("course_validation", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["title"],
        properties: { title: { bsonType: "string", minLength: 1 } },
      },
    },
  });
  let validationRejected = false;
  try {
    await database.collection("course_validation").insertOne({ title: 42 });
  } catch (error) {
    validationRejected = Boolean(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 121,
    );
  }
  if (!validationRejected)
    throw new Error("Collection validator did not reject invalid BSON.");
  const summarize = (result: typeof before) => ({
    nReturned: result.executionStats.nReturned,
    totalDocsExamined: result.executionStats.totalDocsExamined,
    totalKeysExamined: result.executionStats.totalKeysExamined,
    executionTimeMillis: result.executionStats.executionTimeMillis,
    winningPlan: result.queryPlanner.winningPlan,
  });
  const output = resolve("data/course-report");
  await mkdir(output, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    dataset: "10000 synthetic metadata, no AI/cloud calls",
    mongodbVersion: (await database.admin().serverInfo()).version,
    before: summarize(before),
    after: summarize(after),
    aggregation: stats,
    validationRejected,
  };
  await writeFile(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  await writeFile(
    resolve(output, "explain-before.json"),
    JSON.stringify(before, null, 2),
  );
  await writeFile(
    resolve(output, "explain-after.json"),
    JSON.stringify(after, null, 2),
  );
  console.info(JSON.stringify(report, null, 2));
} finally {
  await mongoose.disconnect();
  await repl.stop();
}
