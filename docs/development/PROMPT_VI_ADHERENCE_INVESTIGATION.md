# Vietnamese Prompt Adherence — Investigation and Disabled Prototype

Date: 2026-11-03  
Status: prototype only; automatic translation remains disabled.

## Decision and sources

- **CONFIRMED:** Issue #17 and PRD §6.1 require the submitted prompt to be sent directly without automatic translation, rewrite or truncation. Issue #1 requires Vietnamese prompt input and preservation of Vietnamese characters.
- **CONFIRMED:** the current implemented API is `POST /api/v1/generations` with `{prompt}` and `Idempotency-Key`; the GET DTO exposes the original prompt. Current prompt limit is 2,048 JavaScript UTF-16 code units.
- **PROPOSAL:** the local experiment can translate Vietnamese text through Cloudflare Workers AI `@cf/meta/m2m100-1.2b`, controlled by `PROMPT_TRANSLATION_ENABLED`. The flag defaults to false and startup rejects it in production. This does not authorize enabling it for users.
- **OPEN QUESTION:** approval is needed before product use because translation conflicts with PRD §6.1 / Issue #17 and adds an external processing step, latency and shared Cloudflare AI usage. See [OPEN_QUESTIONS](../project/OPEN_QUESTIONS.md).

## Code-path evidence

1. The prompt textarea stores the raw string. Create submits `JSON.stringify({ prompt: pending.current.prompt })`; no frontend normalization is applied on that path. Dashboard hand-off uses `encodeURIComponent`, then the create page reads it with `URLSearchParams`.
2. Express JSON parsing decodes the JSON string as UTF-8. Generation request validation checks string type, non-empty-after-trim and `.length <= 2048`; it does not trim, normalize Unicode, strip accents or truncate the value.
3. `GenerationService.accept` fingerprints the exact input bytes as UTF-8 through `createHash().update(prompt)`, then stores the exact original text. With translation disabled, `submittedPrompt` is the same string.
4. The Cloudflare image adapter sends `{ prompt, steps: 4 }` once and sets a 90-second timeout. It does not send a seed; the provider therefore chooses its default/random behavior. There is no application-side prompt clipping or seed control in the request.
5. Worker inference reads the persisted `submittedPrompt`. The public generation/image DTO reads `originalPrompt`.

Relevant source: `frontend/src/pages/create/CreateImagePage.tsx`, `frontend/src/domain/prompt.ts`, `backend/src/modules/product/routes.ts`, `backend/src/modules/generations/service.ts`, `backend/src/models/generation.model.ts`, and `backend/src/providers/cloudflare.ts`.

This is evidence that the application path preserves the prompt. It does **not** prove how Cloudflare/model tokenization handles every Unicode sequence, nor prove relative Vietnamese/English image adherence. The repository has no paired live-image dataset/results, and no prompt-adherence root cause can be assigned from source inspection alone.

## Prototype behavior

- `PROMPT_TRANSLATION_ENABLED` defaults to `false`; it is rejected when `NODE_ENV=production`.
- Only strings containing precomposed Vietnamese letters are translated. English-only input passes unchanged. Mixed input is sent as Vietnamese with the English clauses included; M2M100 may still alter those clauses, so this needs evaluation. Unaccented Vietnamese is not reliably detected and will pass through unchanged.
- The translation adapter uses a fixed model, source and target language, 10-second timeout, safe errors and no retries. A failed/malformed/empty translation returns an error before creating a job or reserving quota. Translation failures reuse the existing safe `GENERATION_FAILED` code; over-limit translation reuses `INVALID_PROMPT`. The prompt is never logged.
- A translation above 2,048 UTF-16 code units is rejected before job/quota creation. The limit mirrors the app's current accepted prompt ceiling as a conservative guard; it is not a claim that Cloudflare documents this exact provider maximum.
- Idempotency replay is checked before translation. A first accepted translated job keeps the Vietnamese value in `originalPrompt`, stores the English value in existing `submittedPrompt`, fingerprints the original input, and sends only `submittedPrompt` to FLUX. No schema field or public DTO was added.
- Two simultaneous same-key requests could both finish translation before the MongoDB transaction lets one win. They still resolve to one job, one quota reservation and one FLUX inference, but may consume duplicate translation usage in that race; durable cross-instance translation de-duplication would need an approved state/schema design.
- Translation and image generation are separate provider calls. A translation failure dispatches zero image inferences. After acceptance, the existing worker still performs at most one FLUX call and retains its existing recovery/no-retry behavior.
- This feature flag is intended for isolated local experiments only. The tests use mocks; no Cloudflare account, model or live FLUX call was used.

## Paired prompt evaluation set

Use each Vietnamese/English row as a semantic pair. Before any live run, a reviewer should verify that the English wording preserves the listed constraints. Record the language, translation text (if any), model, `steps=4`, seed as **provider default/not supplied**, output ID and timestamp. Score each generated image blind to input language.

| # | Vietnamese prompt | Equivalent English prompt | Dimensions to score |
|---:|---|---|---|
| 1 | Một con mèo cam ngồi trên ghế gỗ bên cửa sổ, nhìn ra khu vườn mưa; ảnh màu nước, không có người. | An orange cat sits on a wooden chair by a window, looking out at a rainy garden; watercolor, no people. | subject, action, background, color, spatial relation, style, negation |
| 2 | Hai chú chó trắng chạy sang trái trên bãi biển lúc bình minh; tranh minh họa phẳng, không có vòng cổ. | Two white dogs run to the left on a beach at sunrise; flat illustration, no collars. | count, color, action/direction, background, style, negation |
| 3 | Một chiếc xe đạp đỏ tựa vào bức tường xanh, bên phải chậu cây nhỏ; ảnh tĩnh vật chân thực. | A red bicycle leans against a blue wall, with a small plant pot on its right; realistic still life. | subject, colors, relation, count/size, style |
| 4 | Ba quả lê vàng nằm trong bát trắng trên bàn gỗ; nền bếp mờ, ánh sáng ban mai. | Three yellow pears lie in a white bowl on a wooden table; blurred kitchen background, morning light. | count, colors, setting, relation, lighting |
| 5 | Một người phụ nữ lớn tuổi mặc áo khoác xanh đọc sách dưới tán cây; không nhìn vào máy ảnh, phong cách ảnh tài liệu. | An older woman in a blue coat reads a book under a tree; not looking at the camera, documentary photography. | subject, clothing color, action, setting, negation, style |
| 6 | Một cậu bé thả diều đỏ trên đồi cỏ, con diều ở phía trên bên trái; tranh màu chì. | A boy flies a red kite on a grassy hill, the kite in the upper left; colored-pencil drawing. | subject, action, color, background, position, style |
| 7 | Một chiếc thuyền gỗ nhỏ trôi phía sau ngọn hải đăng trắng, biển xanh yên; tranh sơn dầu, không có chim. | A small wooden boat floats behind a white lighthouse, calm blue sea; oil painting, no birds. | subject, size, relation, color, setting, style, negation |
| 8 | Bốn chiếc lá đỏ nằm bên trái một viên đá xám trên nền cát; ảnh macro, ánh sáng tự nhiên. | Four red leaves lie to the left of a gray stone on sand; macro photography, natural light. | count, color, relation, background, style |
| 9 | Một chiếc đèn giấy vàng treo giữa hai cửa sổ, trong căn phòng tối xanh; phong cách hoạt hình 2D. | A yellow paper lantern hangs between two windows in a dark blue room; 2D animation style. | subject, color, position, setting, style |
| 10 | Một con hươu đứng sau hàng rào gỗ phủ tuyết, rừng thông ở xa; tranh khắc gỗ đơn sắc. | A deer stands behind a snow-covered wooden fence, pine forest in the distance; monochrome woodcut. | subject, action, relation, background, style, color treatment |
| 11 | Hai chiếc cốc, một đỏ và một xanh, đặt cạnh nhau trên khăn trắng; không có chữ hoặc logo, ảnh sản phẩm tối giản. | Two cups, one red and one blue, sit side by side on a white cloth; no text or logos, minimalist product photography. | count, colors, relation, background, negation, style |
| 12 | Một ngôi nhà nhỏ nằm giữa cánh đồng hoa tím, núi ở phía sau và mặt trời bên phải; minh họa truyện thiếu nhi, không thêm nhân vật. | A small house sits in a field of purple flowers, mountains behind it and the sun on the right; children's book illustration, no added characters. | subject, setting, color, spatial relations, style, negation |

For every dimension score `0 = missing/wrong`, `1 = partly correct`, `2 = correct`. Report each dimension separately and count main-subject errors. Compare (A) Vietnamese directly to FLUX, (B) English equivalent directly to FLUX, and (C) translated Vietnamese to FLUX. Keep steps/seed policy/worker version constant. Translation text review is a separate check and does not count as image-generation evidence.

No live image score is reported by this investigation. Do not batch-call FLUX. A later approved experiment should use the smallest balanced subset first and stop at Cloudflare quota limits.

## Cost and limits

Cloudflare currently lists Workers AI on Free and Paid plans, a shared 10,000 Neurons/day Free allocation, and $0.011 per 1,000 Neurons above that allocation on Workers Paid. It lists M2M100 input/output unit pricing at `$0.342 per M tokens`; actual Neuron consumption and total cost depend on model accounting and account plan. The quota is shared with FLUX/other Workers AI workloads, not reserved for translation. Free-plan over-limit requests fail; a paid plan may charge above the included daily allocation. Check [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and [M2M100 model page](https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/) before any live translation experiment. This repo does not assume a translation free tier or enable billing.

## Contract and approval items

No endpoint, request field, public response field, auth, quota, worker concurrency, collection, or index changed. The current internal fields are sufficient for original and submitted prompt comparison. If the group needs translation provenance (model/version, source/target languages, outcome, latency, input/output hashes or consent record), approve a schema/retention plan before adding it. API users currently see the original prompt only; they cannot preview/approve the translated text. If product approval requires user review, the frontend/API contract must change before enabling the feature.

## Verification boundary

- Unit tests mock Cloudflare transport and cover Vietnamese/English/mixed detection, prompt forwarding, fixed language pair, timeout, provider errors, output-length rejection, no retry and feature flag defaults.
- Replica-set integration test covers translation failure before job/quota, exact original/translated persistence, idempotent replay and exactly one mocked image inference.
- Neither test proves the translation model's semantic fidelity or FLUX adherence. Those require reviewed translation outputs and a separately authorized, small live image experiment.
