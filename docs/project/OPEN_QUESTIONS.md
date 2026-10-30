# Open Questions and Conflicts

These are not implementation permissions. Resolve them before the dependent feature is treated as CONFIRMED.

| Question | Why it matters | Current safe rule | Owner/status |
|---|---|---|---|
| Which exact Gemini image model and output parameters will the project use? | Access, pricing, quota, output MIME/dimensions and model availability depend on the selected Google AI Studio project and can change. | **CONFIRMED:** Google AI Studio/Gemini via official `@google/genai`; configure model server-side with environment. Verify model capability and access before enabling; do not assume a free tier or enable billing. | OPEN |
| What private storage will be used after local demo deployment? | Local disks can be ephemeral or differ across replicas; private delivery and durability depend on hosting. | **CONFIRMED:** local filesystem for demo/local-first, outside static roots, delivered through authenticated owner-scoped API. Production persistent volume/backup or separately approved private object storage remains undecided. | OPEN |
| Are the initial quota values in `PRD.md` accepted? | They are team proposals, not provider limits. | Treat quota values as server configuration, not UI truth, until tested. | PROPOSAL |
| Which three names map to TV1/TV2/TV3? | Ownership and review assignment are still proposed. | Assign one owner per screen/API before parallel implementation. | OPEN |
| Is the product name `FLUX STUDIO` final, or is `PromptCanvas` still used? | Affects title, copy and repo documentation. | Use FLUX STUDIO for the interface; do not rename repository/package without approval. | OPEN |
| Do local `PRD.md` and `writing-block.md` replace the older Issue inline copy? | Issue describes an earlier repository state. | Preserve both sources and record conflicts; never silently edit the design source. | OPEN |
| What are the exact session lifetime, cookie, CSRF bootstrap and CORS settings for deployment? | Cookie behavior and cross-origin requests depend on deployment topology. | **CONFIRMED:** opaque server-side session in MongoDB-backed `sessions`, HttpOnly cookie, no JWT. Proposed baseline is SameSite=Lax, Secure on HTTPS, exact-origin CORS and session-bound CSRF token; finalize exact origin/lifetime/token exchange with deployment. Password-hash package also remains unselected. | OPEN |
| Which API prefix is the implementation contract? | PRD/Issue #1 use legacy `/api` paths while project owner selected a versioned prefix. | **CONFIRMED:** `/api/v1`; `docs/development/FRONTEND_BACKEND_CONTRACT.md` and backend API design use that prefix. | CONFIRMED |
| Does the task's “Home” reference mean the current `/` `DashboardPage` preview, or should a separate Home route be added later? | `frontend/src/App.tsx` currently renders `DashboardPage` for `/` and has no `HomePage` import. | Treat `/` as the implemented Dashboard preview; do not add or rename routes during a visual-rules task. | OPEN |
| When should `/register` and the `/app/*` product routes be wired? | `PRD.md` confirms them as product surfaces, but the current frontend only routes `/login` explicitly and uses a preview fallback elsewhere. | Do not infer authenticated routing or registration behavior from the current preview. | OPEN |

## Conflict handling

No agent may resolve these by silently changing palette, endpoint behavior, quota, provider, schema or scope. Record the decision in the issue and update this file only after the team agrees.
