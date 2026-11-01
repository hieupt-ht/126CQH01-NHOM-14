---
name: authentication-session
description: Legacy opaque-session notes. Current FLUX STUDIO authentication guidance is in authentication-jwt.
---

# Legacy Authentication Notes

This workflow is superseded by the project owner's JWT decision dated 01/11/2026. Do not use the no-JWT checklist below as current guidance.

For current authentication implementation, read `.agents/skills/authentication-jwt/SKILL.md` and the current API/database contracts. The project uses an HS256 JWT in an HttpOnly cookie and retains MongoDB `sessions` records containing hashed `jti` values for immediate revocation.
