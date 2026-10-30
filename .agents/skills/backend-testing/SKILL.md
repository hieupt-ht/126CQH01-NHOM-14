---
name: backend-testing
description: Plan and implement isolated FLUX STUDIO backend tests for validation, auth, ownership, MongoDB, generation lifecycle and storage failure cases.
---

# Backend Testing

## Use when

Use when adding or changing backend tests or designing verification for a backend feature. Tests must not connect to production services or create real user data.

## Read first

1. `AGENTS.md`, `docs/development/BACKEND_RULES.md`, `docs/development/QUALITY_CHECKLIST.md` and existing test scripts/config.
2. The relevant endpoint, schema and phase acceptance criteria in `docs/backend/` and `docs/development/FRONTEND_BACKEND_CONTRACT.md`.
3. Existing test helpers, fixtures and mock conventions.

## Workflow

1. Separate pure unit tests, API tests, MongoDB integration tests and provider/storage adapter tests. Prefer deterministic unit tests where integration adds no confidence.
2. For MongoDB, require a dedicated `MONGODB_TEST_URI` and an isolated test database. Fail closed if URI points to known dev/prod database names. Never drop a shared/existing database; use uniquely named records and remove only those test records.
3. Exercise validation and safe errors; auth, CSRF, ownership and IDOR; duplicate email/idempotency; daily quota and one-active-generation races; state transitions including `needs_review`; private image content/download/delete; and index constraints as relevant to the changed scope.
4. Mock Gemini at the provider boundary; assert call count and no call for validation/read endpoints. Never make a live provider call by default.
5. Exercise filesystem MIME/signature/size validation, partial writes, disk/metadata failure and cleanup. Use a temporary test directory with explicit teardown limited to that directory.
6. Run the repository's existing test/typecheck/build commands and report exact results. Do not claim tests ran when blocked by absent MongoDB/test configuration.

## Example provider assertion

```text
given: same user, same Idempotency-Key and canonical prompt submitted twice
expect: one generation record, one quota reservation and one mocked provider call
```

## Acceptance checklist

- [ ] Tests cover changed behavior and relevant boundary/failure cases.
- [ ] MongoDB and filesystem resources are isolated and safely cleaned up.
- [ ] Provider calls are mocked unless separately authorized.
- [ ] No real credentials, user data or production database is used.
- [ ] Commands, pass/fail/skip results and environment limitations are reported accurately.

## Common mistakes

- Running destructive database cleanup against a URI that might be shared.
- Making tests depend on live Gemini, timing, or nondeterministic output.
- Asserting only the happy path for ownership, quota or idempotency code.
- Testing a Mongoose `unique` declaration without ensuring the actual index exists.
- Deleting arbitrary temp paths or real storage data in teardown.

## References

`docs/development/BACKEND_RULES.md`, `docs/development/QUALITY_CHECKLIST.md`, `docs/backend/database-design.md`, `docs/backend/implementation-plan.md`, `docs/backend/api-contract.md`, `docs/development/FRONTEND_BACKEND_CONTRACT.md`, and `.agents/skills/backend-api/SKILL.md`.
