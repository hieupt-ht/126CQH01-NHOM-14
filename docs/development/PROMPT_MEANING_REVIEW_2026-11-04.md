# Prompt meaning preservation — investigation, 04/11/2026

## CONFIRMED failure

Read-only inspection of the relevant saved local generation showed:

- Original: `tạo giúp tôi một cậu bé đang cưỡi trên con trâu Việt Nam và thổi sáo trên 1 cánh đồng lúa chín`
- Actual translated scene: `Help me with a boy riding on a Vietnamese beetle and blasting on a ripe rice field.`
- Selected style: cinematic; the same wrong scene also occurred with watercolor.
- Translation was enabled. Therefore this case is not explained by a missing flag
  or a lost merge. M2M100 mistranslated the main subject and action before FLUX.

Human-reviewed meaning: a boy riding a Vietnamese water buffalo while playing a
flute in a field of ripe rice. The English wording above is a reference for review,
not model-generated evidence. The narrow watercolor guard does not preserve other
subjects/actions and cannot repair this class of semantic error.

## Historical PROPOSAL — declined by the owner

Replace only the translation stage with Cloudflare
`@cf/qwen/qwen3-30b-a3b-fp8`, keeping the current FLUX image model, storage, prompt
limits, original text, quota and one-inference recovery behavior. No new package
or billing change. A fixed system instruction should translate rather than invent
an image, retaining subjects, actions, counts, relationships, colors, setting,
style, quoted text and negations. Require a small validated JSON response, reject
empty/malformed/truncated/over-limit results before job/quota acceptance, and do
not silently fall back to the known-bad translation or retry image inference.

The owner explicitly chose **keep M2M100 and fix only the current flow**.
Qwen was not implemented or enabled. The following implementation supersedes
the model-change proposal.

## CONFIRMED — M2M100 terminology protection

### Follow-up: cyclo, revision visual-terms-v2

The next reported saved prompt was `giúp tôi tạo 1 bức ảnh về 1 con khỉ đang đạp
xích lô`. Both watercolor and cinematic jobs actually submitted a monkey walking
on a chain. The stored revision visual-terms-v1 was present, confirming that the
guard was loaded but the cyclo term was outside its vocabulary.

Revision visual-terms-v2 adds standalone xích lô/xe xích lô/xích-lô and the complete
pedaling action. The English definition explicitly describes the Vietnamese
three-wheeled pedal rickshaw, front passenger seat and rear pedaling position,
consistent with [Vietnam News Agency's cyclo description](https://vietnam.vnanet.vn/english/print/touring-hanoi-by-cyclo-92213.html).
Describing a seat does not add a passenger; no scene/monkey count is hardcoded.
Longest-match handling keeps action and vehicle together instead of translating
xích and lô separately; a genuinely requested dây xích remains an independent term.

Tests cover the reported prompt, alternate spellings/case/decomposed Unicode,
standalone vehicle versus chain, no added passenger, no extra translation call,
failed translation before quota and restored worker input after replay. These
remain mocked transport/data-flow checks, not a live model-quality result.
Follow-up verification: backend build and full unit suite50 pass/1 skip; the
affected product integration passed after adding cyclo failure/success/replay
assertions. Restarted local backend after zero active jobs; health200 and the
container reports visual-terms-v2. No live provider call or commit/push occurred.

Use a versioned, bounded Vietnamese visual glossary for culturally specific
subjects/actions and known lost background details. Longest phrases match at
Unicode word boundaries on an NFC copy. Terms receive unique opaque identifiers
before the same single M2M100 call. On return, each identifier must occur exactly
once and map back to its canonical English meaning; omission/duplication/corruption
returns422 PROMPT_TRANSLATION_INCOMPLETE before job/quota, without an inference fallback.
Terms repeated in the input get separate identifiers, so their occurrences are
not collapsed. No whole-prompt example is hardcoded as an output image prompt.
The definitive4xx lets the existing frontend clear its pending request key and
unlock the preserved prompt for editing; it is not an uncertain accepted job.

Current groups cover buffalo/riding a buffalo, flute-playing (not every occurrence
of the ambiguous word sáo), rice fields, glowing butterflies, glow colors and
nighttime. Negation phrases are protected together with an applicable scene term.
Prompts without these scene terms retain the original provider input path.
This is deliberately a limited terminology guard, not a semantic parser or proof
that M2M100 preserves every unprotected action/count/relation. If M2M100 changes a
marker, the app rejects that result rather than spending an image-generation slot.
At most64 protected occurrences are accepted to bound placeholder expansion; this
is an application guard, not a provider-documented limit.

Keep originalPrompt/fingerprint exact, save only restored readable English (plus
the selected style) as submittedPrompt, and record model/revision under existing
job settings.promptTranslation. Existing images/jobs are not rewritten; replay
still returns the existing job. A new image requires a new explicit create intent.
Production flag guard, FLUX model/steps, quota, storage and package list stay intact.

Tests use mocked M2M100 transport, including the actual reported input and a
simulated beetle/blasting/missing-marker response. Integration asserts zero jobs,
no user/application quota change or active lock after rejection, then restored
meaning persistence, replay and one image inference for an accepted mock response.
These tests establish transport/data invariants only. No live quality result is
reported for the placeholder-based translation yet.

Verification: backend build passed; full unit48 pass/1 skip (dedicated MongoDB
test URI absent); full isolated integration16 pass/0 skip. After the final
pre-acceptance422 classification and translation model metadata adjustment,
backend build plus the four terminology unit tests and affected product
integration were rerun and passed. Diff check passed. No frontend source changed;
its existing4xx pending-request clearing behavior is reused. Local Docker backend
was restarted after confirming zero active jobs; health returned200. No live
Cloudflare/Cloudinary call, billing change, commit/push or remote comment occurred.

## Sources and usage

- [Cloudflare Qwen model and request/response schema](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/)
- [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

The model is listed with multilingual/instruction-following capabilities. This is
not evidence of fidelity for the supplied prompt. Translation shares Workers AI
allocation with FLUX; account plan and actual usage have not been checked. Free
allocation is10,000 Neurons/day; Paid may charge above that. Do not enable billing
or make a live cloud request in automated tests.

## Review set and acceptance

| Input case | Details that must survive translation |
|---|---|
| Boy riding buffalo and playing flute in ripe rice | boy; buffalo, not insect/vehicle; riding; flute-playing; ripe rice field |
| Black-haired girl with glowing pink-purple butterflies, anime, night | girl; black hair; butterflies; pink-purple glow; anime portrait; nighttime |
| House beside apple tree; person walking dog; watercolor | house; apple tree; spatial relation; person/dog; walking; watercolor |
| Two white dogs running left on beach at sunrise, no collars | count2; white; running left; beach; sunrise; negated collars |
| Three yellow pears in white bowl on wooden table | count3; yellow pears; white bowl; containment; wooden table |
| Four red leaves left of gray stone; macro | count4; red; left relation; gray stone; macro |
| Mixed Vietnamese/English description | translate Vietnamese and retain English constraints |
| Caption requested in Vietnamese quotation marks | preserve the requested visible text, not translate it away |

Mocks can verify exact input forwarding, response parsing and persistence, not
semantic model quality. A separately authorized small live comparison should record
actual translated text and independently review these details before scoring
generated images. No result is reported for a new model yet. No production flag,
cloud call was made by this investigation. Verification above was recorded before
the owner's requested commit/push/PR/merge handoff; shared acceptance stays open.
