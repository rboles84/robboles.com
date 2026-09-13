# robboles.com RobQA usage

Classify changed and protected behavior before selecting checks. Use the smallest deterministic set that protects the realistic risk; publication and existing project gates remain mandatory where they apply.

- Visible UI, copy, Field Kit, and interactive artifact changes require rendered route review at relevant viewport and interaction states; source-only checks do not pass them.
- New articles must satisfy the voice/publish checklist. Table Talk changes require the MTG Expert Review; Magic Math changes retain their visualization and research controls.
- Verify generated content through `content-index.json` and the generator, not hand-edited projections. Search needs a local server rather than `file://`.
- Treat owner findings as product evidence, distinguish harness/environment problems from product defects, and add the narrowest appropriate regression invariant.

Record selected and skipped checks, rendered evidence, candidate identity when required, residual risk, and the shortest owner review limited to human editorial or product judgment.
