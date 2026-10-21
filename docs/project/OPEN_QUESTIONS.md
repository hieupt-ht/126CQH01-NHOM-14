# Open Questions and Conflicts

These are not implementation permissions. Resolve them before the dependent feature is treated as CONFIRMED.

| Question | Why it matters | Current safe rule | Owner/status |
|---|---|---|---|
| Is Cloudflare Workers AI FLUX.1 Schnell accepted by the instructor, or is direct Black Forest Labs API required? | Provider protocol, quota and adapter differ. | Keep provider behind an adapter; do not expose provider options in UI. | OPEN |
| Which exact provider/model parameters are supported at integration time? | Prompt limit, steps, dimensions and output format may change. | Send only the verified prompt and server configuration. | OPEN |
| Is a public Cloudinary delivery URL acceptable for the privacy requirement? | A public URL is not private even when API authorization is correct. | Do not promise absolute image privacy; confirm authenticated delivery or local proxy. | OPEN |
| Are the initial quota values in `PRD.md` accepted? | They are team proposals, not provider limits. | Treat quota values as server configuration, not UI truth, until tested. | PROPOSAL |
| Which three names map to TV1/TV2/TV3? | Ownership and review assignment are still proposed. | Assign one owner per screen/API before parallel implementation. | OPEN |
| Is the product name `FLUX STUDIO` final, or is `PromptCanvas` still used? | Affects title, copy and repo documentation. | Use FLUX STUDIO for the interface; do not rename repository/package without approval. | OPEN |
| Do local `PRD.md` and `writing-block.md` replace the older Issue inline copy? | Issue describes an earlier repository state. | Preserve both sources and record conflicts; never silently edit the design source. | OPEN |
| Is authentication session storage library selected? | Cookie/session behavior affects security and API contract. | Keep implementation unspecified until library and CSRF/CORS policy are chosen. | OPEN |

## Conflict handling

No agent may resolve these by silently changing palette, endpoint behavior, quota, provider, schema or scope. Record the decision in the issue and update this file only after the team agrees.
