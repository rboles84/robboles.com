# Article Template (drafting)

Draft in this file, then port the prose into `article-template.html`
(copy that to `posts/<slug>/index.html` and fill the `{{TOKENS}}`).

> Before drafting, read the local voice pack in `docs/voice/` (profile, anti-patterns, archetypes).
> A post may not reach `status: published` until it passes `docs/voice/voice-and-publish-checklist.md`.
> Pick ONE archetype and AT MOST one metaphor family. Useful before clever.

## Metadata

- Title: <!-- statement, 6-12 words, contains the primary term -->
- Slug: <!-- kebab-case, matches the folder name -->
- Category: QA Field Guide | Automation Cookbook | Learning Lab
- Tags: <!-- 3 -->
- post_type: <!-- one archetype from docs/voice/post-archetypes.md -->
- voice_profile: robert-v1.1
- metaphor_family: <!-- one family, or "none" (none is the common, correct answer) -->
- status: draft <!-- draft | published; only "published" after passing the voice gate -->
- Date published: <!-- YYYY-MM-DD -->
- Date modified: <!-- YYYY-MM-DD, only on substantive edits -->
- Last verified: <!-- YYYY-MM-DD you last re-ran the steps -->
- Proficiency: Beginner | Intermediate | Expert
- Dependencies: <!-- tools + versions assumed, e.g. Playwright 1.45, Node 20 -->
- Read time: <!-- minutes -->
- Description: <!-- one sentence; becomes the meta + search snippet -->

## Anti-slop checklist (must hit >= 7/9 before publishing)

- [ ] Original screenshot or log (real UI / real failure, version or date visible)
- [ ] Code or config artifact the reader can lift
- [ ] One comparison or decision table
- [ ] At least one dated, first-hand observation ("when I hit this on <date>...")
- [ ] A "where this breaks" reality section
- [ ] A reusable asset (repo / checklist / config)
- [ ] Author identity links present
- [ ] Every H2 reads as a standalone search query
- [ ] No paragraph an LLM could have written without your experience

---

## Hook (answer-first, <= 120 words)

<!-- Sentence 1: name the exact problem the reader googled.
     Sentence 2-3: the stakes — what goes wrong without this.
     Sentence 4: the promise — "by the end you'll have X working." -->

## Why this matters

<!-- The mechanism, not the steps. Where this shows up in real QA work.
     One supporting visual/screenshot belongs here. -->

## The method

<!-- Verb-led steps. Code block or screenshot after each step that needs one. -->

## Where this breaks

<!-- The reality layer. At least one dated, first-hand observation.
     This is where elite posts accelerate. -->

## My rule of thumb

<!-- One short, opinionated, portable takeaway. -->

## Reusable asset

<!-- The artifact the reader can take with them, and what it saves them. -->

## Related posts

<!-- 2-3 hand-picked, contextual links. -->
