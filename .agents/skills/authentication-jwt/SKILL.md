---
name: authentication-jwt
description: Implement FLUX STUDIO JWT authentication in HttpOnly cookies with MongoDB revocation, ownership and CSRF protections.
---

# Authentication with JWT Cookies

## Use when

Use for register/login/logout/current-user flows, JWT middleware, cookie security, revocation or CSRF changes. Follow the current contract; do not move tokens into localStorage or expose them in JSON.

## Read first

1. `AGENTS.md`, `docs/development/BACKEND_RULES.md` and `docs/backend/database-design.md`.
2. Auth endpoints in `docs/backend/api-contract.md`, `docs/development/FRONTEND_BACKEND_CONTRACT.md`, `docs/backend/implementation-plan.md`, `docs/technical-baseline/08-IMPLEMENTATION-STATUS.md` and related `OPEN_QUESTIONS.md` entries.
3. Existing auth middleware, session model, environment validation, CORS/security middleware and tests.

## Current contract

- Sign JWT with HS256 using server-only `JWT_SECRET` (minimum 32 bytes); verify only the configured algorithm, fixed issuer and audience, and required `sub`, random `jti`, `iat`, `exp` claims.
- Put JWT only in an HttpOnly cookie. Set Secure for HTTPS. Keep exact-origin validation and CSRF protection for unsafe cookie-authenticated methods.
- Persist only `SHA-256(jti)` in MongoDB `sessions` with user, CSRF hash and expiry. Check signature/claims and active, unexpired session on every request so logout and revocation apply immediately.
- Derive ownership from verified `sub` and active user record, never request `userId`.
- Hash passwords with Argon2id. Use generic credential errors and rate limits on public auth endpoints.
- Current token/session lifetime is seven days. Production origin and signing-key rotation policy remain OPEN QUESTION.

## Workflow

1. Keep auth endpoint paths, DTOs and errors aligned with canonical contracts.
2. Rotate to a new random `jti` on login; store its hash only. Revoke the prior valid session where applicable.
3. Verify algorithm, signature, issuer, audience, expiry and claim types before database lookup. Fail closed on malformed, expired or tampered tokens.
4. Use the stored session record for logout revocation; expire the cookie with matching name/path/SameSite/Secure attributes.
5. Bind CSRF validation to the authenticated session and require it alongside Origin validation on unsafe methods.
6. Never log JWTs, CSRF tokens, passwords or signing keys.

## Tests

- Valid signature and claims; wrong key/algorithm/issuer/audience; tampered/expired/malformed JWT.
- HttpOnly/Secure/SameSite cookie attributes; no token in JSON; hashed `jti` only in MongoDB.
- Logout/revocation, missing/expired session, disabled user, CSRF/Origin failures, duplicate registration and generic credential errors.
- Isolated MongoDB only; never call real providers or use real user data.
