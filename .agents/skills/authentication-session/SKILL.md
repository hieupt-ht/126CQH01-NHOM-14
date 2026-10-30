---
name: authentication-session
description: Implement confirmed FLUX STUDIO authentication with opaque server-side sessions, HttpOnly cookies, ownership and CSRF protections.
---

# Authentication and Session

## Use when

Use for authentication/session middleware, register/login/logout/current-user flows or security fixes involving cookies. Do not implement JWT. Stop at unresolved cookie/CSRF/package decisions that affect deployment rather than guessing.

## Read first

1. `AGENTS.md`, `docs/development/BACKEND_RULES.md` and `docs/backend/database-design.md`.
2. Auth endpoints in `docs/backend/api-contract.md`, `docs/development/FRONTEND_BACKEND_CONTRACT.md`, `docs/backend/implementation-plan.md` and related `OPEN_QUESTIONS.md` entries.
3. Existing session model, environment config, CORS/security middleware and tests.

## Workflow

1. Confirm the exact endpoint, cookie name/policy, session lifetime, allowed origins, CSRF bootstrap/header and password-hash package before coding dependent behavior. These values are not all finalized in current docs.
2. Generate opaque session IDs with cryptographically secure randomness; store only a hash in `sessions`. Verify `expiresAt` and revocation on each authenticated request; TTL cleanup is supplementary.
3. Hash passwords with the approved reputable library and parameters. Never store or return plaintext passwords or `passwordHash`.
4. Set HttpOnly; Secure under HTTPS. Apply the confirmed SameSite/origin/CSRF policy. Credentialed CORS must use explicit origins, never wildcard.
5. Rotate/create session on successful login; revoke it on logout. Use generic credential errors and rate-limit public auth flows according to the approved deployment design.
6. Attach a typed authenticated principal to request context. All ownership checks use that principal, not request body/query `userId`.
7. Test cookies, CSRF, origins, expiry/revocation, disabled accounts, duplicate registration and non-enumerating credential errors without real user data.

## Example session storage rule

```text
browser cookie: opaque random token (HttpOnly)
database: hash(token), userId, createdAt, expiresAt, lastSeenAt
```

Cookie name, hash algorithm, TTL and CSRF exchange must follow the final approved configuration; this sketch is not a secret or implementation choice.

## Acceptance checklist

- [ ] Authentication is server-side session based; no JWT is introduced.
- [ ] Raw session token and password never persist or appear in logs/responses.
- [ ] Cookie, CORS and CSRF behavior match deployment decisions.
- [ ] Expired/revoked/disabled sessions fail closed and ownership derives from session.
- [ ] Auth, CSRF, origin, cookie and enumeration tests are covered.

## Common mistakes

- Assuming HttpOnly alone prevents CSRF.
- Using `SameSite=None` without Secure, or wildcard CORS with credentials.
- Trusting TTL cleanup without checking expiry per request.
- Storing raw cookie token in MongoDB or logging it.
- Choosing a password library or deployment cookie policy without resolving the open question.

## References

`docs/development/BACKEND_RULES.md`, `docs/backend/database-design.md`, `docs/backend/api-contract.md`, `docs/backend/implementation-plan.md`, `docs/development/FRONTEND_BACKEND_CONTRACT.md`, `docs/project/OPEN_QUESTIONS.md`, and `.agents/skills/backend-api/SKILL.md`.
