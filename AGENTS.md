# AGENTS.md

## Project identity

This repository hosts the Robert Boles personal site: a QA authority + builder laboratory site.

Primary positioning:
Better tests. Better releases. Less theater.

Site lanes:
- QA Field Guide: QA strategy, release readiness, E2E testing, metrics, defect triage, and test data.
- Automation Cookbook: specific automation patterns, triage workflows, and maintainable testing guidance.
- Learning Lab: Vox Mana, Codex workflows, data contracts, visual QA, and builder experiments.

## Hard rules

- Do not publish confidential employer, client, vendor, claims, insurance, or internal process details.
- Keep examples generalized and field-safe.
- Do not make AI the whole identity of the site.
- Vox Mana is builder proof, not the whole brand.
- Prefer small focused changes over broad redesigns.
- Keep the site dependency-free unless a future task explicitly approves a framework.
- Preserve GitHub Pages compatibility from the repository root.

## Adding articles

1. Copy `content/templates/article-template.md`.
2. Draft the article.
3. Add a prebuilt HTML page under `posts/<slug>/index.html`.
4. Add one `content_type: "post"` record to `assets/data/content-index.json` (the source of truth).
5. Run `node scripts/build-site-indexes.js --report`, then `node scripts/build-site-indexes.js` to update generated projections (`posts.json`, search index, feeds, sitemap, and listing regions).
6. Link related posts in the hand-authored article.
7. Table Talk posts/shelf items only: add a `data-flavor` card per Table Talk Flavor Cards below.
8. Confirm the search page still works on a local server (not `file://`).
9. Run `npm test` (green) before publishing or pushing.

## Field Kit artifacts

- Field Kit artifact pages should keep the shared site shell: breadcrumbs, `Field Kit · <type>`, title,
  lede, action row, short usage instructions, and a back-to-Field-Kit link.
- Browser tools should not be embedded in iframes on the artifact page; nested scrolling makes them
  harder to use. Link to the tool as a full-page standalone HTML file instead.
- If a Field Kit item offers `Download HTML`, that download should point to a clean standalone file,
  not the site-shell wrapper page.
- Downloadable worksheets/templates must be useful as artifacts on their own: fillable where the user
  needs to supply answers, print/save-safe, free of site navigation clutter, and checked manually
  before the post is treated as ready.

## Development

Implementation is governed by [`RobDevPass.md`](RobDevPass.md). Work at an experienced mid-level/product
developer level with senior guardrails: practical and proportional, able to make safe in-scope decisions,
but never from blank context or by blind trial-and-error. Scale investigation depth to the change.

For non-trivial work, ground the implementation in the current Kanban card, relevant `learning.md` entries
and handoffs, the owning files and repository structure, a current analogous post/component, and targeted
Git history when it clarifies intent. Identify the source of truth, consumers, protected contracts,
non-goals, shared blast radius, failure/accessibility states, rollback, and the smallest complete change.
Reuse existing patterns before creating new ones; never hand-edit generated output; surface scope drift
instead of hiding it in a larger diff. RobDevPass READY hands implementation evidence to RobQAPass—it does
not replace testing or owner acceptance.

For a new post, current-MTG claim, research/data story, shared UI, generator, or ambiguous multi-file
change, apply [`RobAnalystPass.md`](RobAnalystPass.md) before planning implementation and use
[`RobScrumPass.md`](RobScrumPass.md) to manage the existing card flow. These are concise refinement and
flow authorities; they do not replace RobDevPass, RobQAPass, editorial review, or Rob's acceptance.

## Testing

A change's QA scope is governed by [`RobQAPass.md`](RobQAPass.md). Before selecting checks, classify
the QA tier, changed behavior, protected contracts, and realistic regression risk. Use the smallest
deterministic validation set that protects that risk. For QA-0, QA-1, and ordinary QA-2 changes, do
not run CPU-heavy or exhaustive journey, synthetic, mutation, recovery, enumeration, or equivalent
stress suites unless the changed protected behavior gives a concrete reason. Existing project-specific
commands and specialist gates remain authoritative for what they test; RobQAPass governs when they are
proportionate and how owner acceptance is prepared.

Visible UI changes require self-QA in the real rendered product at the relevant viewport and interaction
state; source checks alone are insufficient. Convert each confirmed manual owner finding into the
narrowest systemic regression invariant that prevents its defect class without imposing an unsafe global
rule. Reduce final owner review to the shortest deterministic cases that still require product judgment.

A dependency-free Node test suite lives in `tests/`. Run it with `npm test`
(`node --test tests/*.test.js`; no install needed). It checks internal links, `content-index.json`
validation, generated projections (`posts.json`, search index, feeds, sitemap, and listing regions),
JSON-LD, dependency-free-ness, the Mana Base Codex math, and basic voice/rhythm.

Run `npm test` and confirm it is green before every push. A new post's `<h1>` must match its
`content-index.json` `title` verbatim (byte-level check) — use literal characters in titles, not HTML entities.

## Design tone

Direct, practical, credible, calm, and useful.
Avoid hype, buzzword-heavy claims, and generic thought-leadership filler.

## Blog Voice System

Before drafting or editing ANY blog post, read the repo-local voice pack in `docs/voice/`:
`robert-voice-profile.md`, `anti-patterns.md`, `post-archetypes.md`, and `metaphor-bank.md`.

A post may not move to `status: published` until it passes
`docs/voice/voice-and-publish-checklist.md`. That checklist is the single pre-publish gate; it
supersedes any ad-hoc anti-slop list.

Rules:
- Pick ONE archetype and AT MOST one metaphor family per post.
- The identity priors (rockhound, Spider-Man, 80s cartoons, dad, military-medical) are NOT content.
  Most posts use zero explicit references; surface one only when it makes a hard idea click.
- Useful before clever. Every post carries one real, dated, field-safe specific only Rob could write.

The `docs/voice/` pack is private (gitignored under `docs/`); never move it into a tracked directory.

## Reference Standards

Before implementing or materially revising user-facing experiences, review any applicable standards under:

`docs/reference/`

These documents define durable product and interaction principles that complement (rather than replace) the voice system and editorial review.

Examples include:

- Magic Math design principles
- Magic Math publication polish
- reusable components
- future Vox Mana design principles

These documents describe **how information should be presented**, not how research is produced.

If multiple standards apply:

1. Research methodology (CECOS) determines what may be claimed.
2. Editorial review validates factual accuracy.
3. Voice documents determine how it sounds.
4. Reference standards determine how it should teach and interact.

## MTG Expert Review

Every new or materially changed Magic (Table Talk) article requires an MTG Expert Review, following
`docs/editorial/MTG_EXPERT_REVIEW.md`, before it may be treated as publication-ready. This review
covers Magic rules, Oracle-text, color/faction, design-intent, and analysis accuracy — it is separate
from and does not replace the Blog Voice System above. A post with an unresolved `BLOCK` result must
not publish, regardless of voice, build, or link status. Vox Mana audits and other local MTG datasets
are research indexes for this review, not automatic factual authority; rules and design-intent claims
still need current first-party verification. Durable lessons the review surfaces belong in
`docs/editorial/MTG_EXPERT_CONTEXT.md`.

## Table Talk Flavor Cards

Every new Table log post, and every new item added to the Recommended Shelf or Open the Deck Box,
requires a real MTG flavor card — follow `docs/reference/table-talk-flavor-cards.md`. Never invent
color identity, set data, or art; fetch real Scryfall data at authoring time (no runtime third-party
calls) and cache the art locally under `assets/images/cards/flavor/`. Table log posts should use a
named, deliberately-paired card (`data-flavor="Exact Card Name"`) when a natural tie to the post's
content exists; shelf/deck-box items use positional assignment (bare `data-flavor`). Within the
Recommended Shelf + Open the Deck Box specifically (a single scrolled collection), no two cards may
land within a year of each other — check the existing manifest's used years before adding a new one.

## Required workflow

For any non-trivial work, the main agent must follow:

1. Pre-flight review
2. Refine with RobAnalyst when the request meets its trigger; otherwise record why it is a local QA-0/QA-1 exception
3. Identify or update the Kanban card (`RBB-###`) and use RobScrum to protect WIP, dependencies, and handoff flow
4. RobDevPass planning/change contract, including preliminary RobQAPass classification
5. Implementation to RobDevPass READY
6. Risk-proportional verification under `RobQAPass.md` (build-free checks)
7. Documentation + learning-log update
8. Handoff report

Do not work from blank context. Small read-only questions and quick lookups are exempt unless they
reveal follow-up work.

## Mandatory pre-flight review

Before starting any planning, implementation, content, data, or verification task, review:

1. Current branch/status and overlapping working-tree changes
2. `RobDevPass.md` and `RobQAPass.md`
3. `learning.md`
4. `docs/handoffs/HANDOFF_INDEX.md`
5. Recent relevant handoff files in `docs/handoffs/`
6. `docs/kanban/board.md` and related cards
7. Owning files, related docs/plans, and relevant repository structure
8. A current analogous post/component and targeted Git history when they clarify implementation intent
9. Before writing new CSS/JS for a mana-color, rarity, Keyrune, or card-hover/flavor pattern:
   `docs/reference/reusable-components.md` — reuse an existing component instead of a parallel one
   that silently drops a fix the original already has.

Summarize: recent related work, current source-of-truth/owners, known risks, decisions already made,
files recently changed, applicable existing patterns, and what should not be touched. Scale the depth to
the change; do not perform history or page review merely for ceremony. If no relevant handoffs exist,
state: `No relevant prior handoff found.`

## Learning log

`learning.md` (repo root) is the running memory. Update it before substantive commits/pushes with what
changed, what was learned, and context the next session should inherit. Newest entries on top.

## Kanban

File-based board under `docs/kanban/` with `backlog/ready/in-progress/blocked/done` folders and
`board.md` as the summary. Card IDs use `RBB-###`. Move a card by moving its file between folders and
updating `board.md` in the same change. Do not mark a card done without checks or user confirmation.

## Required agent handoff

Every specialist subagent and every major main-agent task must create or update a handoff file.

Location: `docs/handoffs/`
Filename: `YYYY-MM-DD-HHMM-agent-name-short-task.md`

Each handoff includes: agent name, task requested, files reviewed, files changed, what changed, why,
decisions made, risks/uncertainties, checks run, not touched, follow-up recommendations, next suggested
agent, and related card/docs. An implementation handoff claiming RobDevPass readiness must include the
fields defined in `RobDevPass.md`; a handoff claiming RobQAPass readiness must include the fields defined
in `RobQAPass.md`. Reference those authorities rather than duplicating their policy. Also update
`docs/handoffs/HANDOFF_INDEX.md`.

## Roles (`.codex/prompts/`)

- `preflight.md` - pre-flight project-memory review (read-only)
- `plan.md` - Planning Architect
- `board.md` - Kanban Steward
- `docs.md` - Documentation Steward
- `json.md` - Data Cartographer (`content-index.json`, generated projections, feeds, sitemap)
- `test.md` - QA / Verification Strategist (build-free verification)
- `writing.md` - Content Companion (article drafting in Rob's voice)
- `webdev.md` - WebDev Helper (teaches HTML/CSS/JS; does not edit files for me)

Repo-local skills under `.agents/skills/` expose the RobAnalyst, RobScrum, RobDev, and RobQA entry points;
their root `*Pass.md` documents remain authoritative. Use `RobModelRouting.md` for guarded model and
parallel-work defaults: Luna/low for bounded mechanical support, Terra/medium for ordinary role work, and
Sol/medium only for its documented difficult/high-trust triggers.

See `docs/reference/workflow.md` for the full flow.

## Git

Do not commit or push unless Rob explicitly asks. Run `npm test` and confirm it is green before any
push. Prefer normal pushes; use `--force-with-lease` only when Rob says local should replace remote
history.

Never add `Co-authored-by:` trailers to commit messages. This repository has one author: Robert Boles.
The tracked `.githooks/commit-msg` hook rejects every co-author trailer, and `npm run install-hooks`
sets `core.hooksPath=.githooks` for this checkout.
