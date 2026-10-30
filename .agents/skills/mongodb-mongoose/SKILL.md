---
name: mongodb-mongoose
description: Implement FLUX STUDIO MongoDB persistence with Mongoose schemas, references, indexes, safe queries and isolated database tests.
---

# MongoDB and Mongoose

## Use when

Use when changing a confirmed model, query, index or MongoDB behavior. Pair with `backend-api` when persistence implements an API/business invariant.

## Read first

1. `AGENTS.md`, `docs/development/BACKEND_RULES.md` and `docs/backend/database-design.md`.
2. Relevant `docs/backend/api-contract.md` and `implementation-plan.md` sections.
3. Existing models, connection configuration, index script, package version and tests.

## Workflow

1. Preserve the five confirmed collections and exact field names/types/enums/references. Do not add `user_settings` without an approved requirement.
2. Use strict TypeScript model/document types, schema validators, timestamps and explicit serialization that omits `passwordHash` and `tokenHash`.
3. Implement only documented indexes. Treat unique indexes as correctness constraints; check duplicate legacy values before applying them to populated data.
4. Create indexes through the repository's controlled index procedure. Never use `syncIndexes()` as automatic startup behavior or drop an index/collection to make a test pass.
5. Scope user resources with both document ID and session-derived owner ID. Never use client filters or ObjectId alone for authorization.
6. Use atomic conditional updates/upserts for idempotency, daily usage and active-generation reservations as the approved design specifies. Keep provider/filesystem calls outside transactions; verify deployment supports transactions before relying on them.
7. For integration tests, use a dedicated test URI/database clearly isolated from development/production. Do not reset or drop an existing database; create unique test records and clean only those records.

## Example owner-scoped query

```ts
// Illustrative filter: ownerId must come from the authenticated server session.
const image = await ImageModel.findOne({ _id: imageId, userId: ownerId });
```

## Acceptance checklist

- [ ] Schema fields, defaults, enums and references match the database design.
- [ ] Required unique/compound/TTL indexes are declared and applied through a reviewed procedure.
- [ ] Serialization cannot expose credential hashes.
- [ ] Queries enforce ownership and avoid unfiltered client input.
- [ ] Schema/index/concurrency tests pass against isolated resources, or their limits are reported.

## Common mistakes

- Renaming a field or status to fit local code instead of the contract.
- Treating Mongoose `unique` as a validator rather than a database index.
- Running destructive index synchronization against existing data.
- Assuming TTL deletion happens immediately or replaces expiry checks.
- Assuming standalone MongoDB supports multi-document transactions.
- Returning Mongoose documents containing secrets directly as API DTOs.

## References

`docs/development/BACKEND_RULES.md`, `docs/backend/database-design.md`, `docs/backend/implementation-plan.md`, `docs/development/CODING_RULES.md`, `docs/development/QUALITY_CHECKLIST.md`, and `.agents/skills/backend-api/SKILL.md`.
