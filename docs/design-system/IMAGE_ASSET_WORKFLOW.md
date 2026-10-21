# Image Asset Workflow

This workflow applies when a UI task needs an artwork, background, illustration, reference image or gallery fixture. It does not authorize downloading assets during a rules-only task.

## 1. Understand the need

Record the route/component, purpose and constraints:

- background, decorative visual, feature illustration, gallery fixture or product artwork;
- subject, mood, light, crop, aspect ratio, focal point and text-safe space;
- demo/reference asset versus an actual FLUX API result.

Read `writing-block.md` and the relevant design docs before deciding whether an image belongs in the composition. Do not infer a font, token, palette extension or image treatment that the sources do not define.

## 2. Check local assets first

Inspect existing approved assets and the current asset conventions before searching online. Reuse a suitable local asset. Do not assume an image mentioned in a document or reference screenshot exists in the repository.

If a local asset is approved, preserve it unless the task explicitly authorizes replacement. Do not bulk-import images for convenience.

## 3. Search only when permitted

Before searching, verify that the task allows network access and that an appropriate image-search/download tool is available. Prefer sources with inspectable origin and usage terms, such as Unsplash, Pexels or Openverse, chosen according to the image type; these are suggestions, not a blanket license.

Build queries from the need: subject + mood + palette + lighting + style. For Midnight Aurora, terms such as `midnight navy`, `violet`, `indigo`, `cyan glow`, `aurora`, `cinematic` and `dark atmospheric` may help when relevant. Do not require every keyword, and do not choose by color alone.

Evaluate composition, negative space, focal point, aspect ratio, crop safety and consistency with neighboring assets. Preview the original when the tool permits.

## 4. Verify and record

Verify the source URL, loadability and usage/attribution requirements to the extent actually possible. Never claim license verification when it was not performed. Do not hotlink arbitrary URLs, invent a source, bypass access limits or copy assets with unclear provenance.

When the task explicitly permits adding an asset, use a descriptive filename and the repository's approved asset directory. Record source, source URL, license/attribution status, date checked and whether the asset is `reference`, `demo` or `generated` in an asset manifest if the project has one or the task approves creating one.

## 5. Integrate consistently

- Keep a coherent art direction, light quality, saturation and aspect-ratio family within a page/gallery.
- Use the approved `aspect-ratio`, `object-fit` and crop behavior; inspect the focal point at 360, 768, 1280 and 1536px.
- Never let an image reduce text contrast or obscure controls. Use an overlay only when allowed by the design and without distorting the artwork.
- Do not change FLUX-UI-001 tokens to accommodate a mismatched image.
- Preserve meaningful alt text; decorative images use empty alt text.

## 6. Separate demo from real output

Stock, reference and placeholder images must be labeled as such in code/docs and must not appear as real FLUX results. Do not call the image-generation API while building UI. Do not fabricate statistics or status to make an integration appear complete. If no reliable asset can be found, reuse a local asset, use an explicitly labeled placeholder or report the limitation.

## Image review checklist

- [ ] It serves the intended route/component purpose.
- [ ] Color and lighting harmonize with Midnight Aurora without changing approved tokens.
- [ ] Composition leaves appropriate space for text and controls.
- [ ] It is stylistically consistent with neighboring assets.
- [ ] It works at 360, 768, 1280 and 1536px.
- [ ] Crop preserves the primary subject.
- [ ] Source and usage/attribution were checked to the extent stated.
- [ ] It cannot be mistaken for a real FLUX API result.
- [ ] A suitable existing repository asset was considered first.
- [ ] If it fails the criteria, an alternative or limitation is recorded.
