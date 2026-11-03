import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
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
  // Referencing demonstration on isolated synthetic collections only.
  await database.collection("course_generations").insertMany(docs.map((doc) => ({
    _id: doc.generationId, userId: doc.userId, status: doc.status,
    model: "synthetic-test-model", originalPrompt: "Synthetic metadata; no image was generated",
  })));
  const joined = await collection.aggregate([
    { $match: query },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: 20 },
    { $lookup: {
      from: "course_generations",
      let: { generationId: "$generationId", ownerId: "$userId" },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ["$_id", "$$generationId"] }, { $eq: ["$userId", "$$ownerId"] },
        ] } } },
        { $project: { _id: 0, model: 1, status: 1 } },
      ],
      as: "generation",
    } },
    { $project: { _id: 0, title: 1, generation: 1 } },
  ]).toArray();
  assert.equal(joined.length, 20);
  assert.ok(joined.every((row) => row.generation.length === 1));
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
  const usage = database.collection("course_usage");
  await usage.insertOne({ reserved: 0 });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await usage.updateOne({}, { $inc: { reserved: 1 } }, { session });
      await database.collection("course_validation").insertOne({ title: "synthetic-committed" }, { session });
    });
    await assert.rejects(session.withTransaction(async () => {
      await usage.updateOne({}, { $inc: { reserved: 1 } }, { session });
      await database.collection("course_validation").insertOne({ title: "synthetic-rolled-back" }, { session });
      throw new Error("Intentional isolated rollback");
    }), /Intentional isolated rollback/);
  } finally {
    await session.endSession();
  }
  const transaction = {
    committedRecords: await database.collection("course_validation").countDocuments({ title: "synthetic-committed" }),
    rolledBackRecords: await database.collection("course_validation").countDocuments({ title: "synthetic-rolled-back" }),
    reserved: (await usage.findOne())!.reserved,
  };
  assert.deepEqual(transaction, { committedRecords: 1, rolledBackRecords: 0, reserved: 1 });
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
    environment: { node: process.version, platform: process.platform, architecture: process.arch, replicaSetNodes: 1 },
    before: summarize(before),
    after: summarize(after),
    aggregation: stats,
    lookup: { matched: joined.length, samples: joined.slice(0, 2) },
    transaction,
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
