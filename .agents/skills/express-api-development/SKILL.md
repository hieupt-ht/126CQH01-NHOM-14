---
name: express-api-development
description: Implement or refactor confirmed Express and TypeScript HTTP routes, middleware, controllers and service wiring in FLUX STUDIO.
---

# Express API Development

## Use when

Use when implementing an approved backend HTTP endpoint or Express middleware. Pair with `backend-api` for product semantics, ownership, quota, idempotency and safe errors. Do not invent an endpoint or domain rule.

## Read first

1. `AGENTS.md` and `docs/development/BACKEND_RULES.md`.
2. `docs/development/FRONTEND_BACKEND_CONTRACT.md` and the relevant sections of `docs/backend/api-contract.md` / `implementation-plan.md`.
3. Existing `backend/src/app.ts`, routes, middleware, error types, package scripts and tests.

## Workflow

1. Confirm method, path, auth requirement, request/response shape, error codes and status codes from the contract.
2. Follow the installed Express version and existing module conventions; keep routes declarative, controllers HTTP-focused, services responsible for use-case orchestration, and persistence/provider work behind existing boundaries.
3. Validate headers, params, query and JSON body at the edge. Convert to a narrow DTO; never forward `req.body`, `req.query` or `req.params` wholesale into MongoDB.
4. Derive user identity from authenticated session middleware, never from a submitted `userId`. Apply ownership in service/repository filters.
5. Use the existing async/error handling conventions; map known errors centrally to the documented safe envelope. Avoid duplicate ad-hoc try/catch handlers.
6. Add focused route/service tests for success, validation, auth, ownership, conflict and failure paths relevant to the endpoint.

## Example boundary

```ts
// Illustrative only: use the project's actual validator and DTO types.
const input = createGenerationSchema.parse(req.body);
const result = await generationService.create({
  userId: req.auth.userId,
  prompt: input.prompt,
  idempotencyKey: requireIdempotencyKey(req),
});
res.status(202).json({ success: true, data: result });
```

This example does not authorize a new route or replace the shared response contract.

## Acceptance checklist

- [ ] Endpoint and response behavior match the confirmed contract.
- [ ] Inputs are validated and mapped to an explicit DTO.
- [ ] Authentication/ownership and business invariants are enforced by backend services.
- [ ] Errors do not expose stack, secret, raw provider payload or private file path.
- [ ] Relevant route/service tests and typecheck/build pass, or unavailable checks are reported.

## Common mistakes

- Passing raw query/body objects into Mongoose.
- Putting business logic or database queries in route declarations.
- Catching errors locally and leaking `err.message` or provider responses.
- Trusting client-supplied user IDs, status or success state.
- Duplicating idempotency/quota logic already owned by a service.

## References

`docs/development/BACKEND_RULES.md`, `docs/development/CODING_RULES.md`, `docs/development/QUALITY_CHECKLIST.md`, `docs/development/FRONTEND_BACKEND_CONTRACT.md`, `docs/backend/api-contract.md`, `docs/backend/implementation-plan.md`, and `.agents/skills/backend-api/SKILL.md`.
