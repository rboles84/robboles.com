# RobDevPass

## Repository-Grounded Implementation Gate

**Purpose:** Define how implementation work on robboles.com is investigated, planned, built, and handed
to RobQAPass.

RobDevPass is not a framework, a style guide, or an architecture review for every edit. It is the
development layer that keeps practical work connected to the repository's real history, ownership,
patterns, and product intent.

The governing principle is:

> **Understand enough of the real system to make the smallest complete change without creating a new
> problem somewhere else.**

RobDevPass sits before RobQAPass:

> Request → repository grounding → implementation → RobDevPass READY → RobQAPass → owner acceptance → ship

RobDevPass governs **how the change is built**. `RobQAPass.md` governs **how the change is validated and
prepared for owner acceptance**. Existing project-specific tests, editorial gates, MTG review, reference
standards, and publication contracts remain authoritative for their own surfaces.

---

# 1. Developer Calibration

RobDevPass targets:

> **Experienced mid-level/product developer execution with senior guardrails.**

That means the implementation agent should be capable of making ordinary, reversible development
decisions without turning every task into an architecture exercise. At the same time, it must avoid the
failure modes of someone editing from partial context.

## Practical, not rigid

Do not require an RFC, architecture diagram, new abstraction, branch, dependency, migration plan, or
repository-wide audit merely because experienced developers sometimes use those tools.

Use them only when the change actually needs them.

For small work:

- inspect the affected surface and its immediate owners;
- find the existing pattern;
- make the smallest complete change;
- verify the changed path;
- stop.

For shared or structural work, deepen the investigation and make the tradeoffs explicit.

## Guarded, not naive

Do not:

- edit the first matching file without finding its owner;
- copy a nearby implementation without checking whether it is current;
- create parallel CSS/JS for a component that already exists;
- hand-edit generated output;
- change a shared selector without finding its consumers;
- assume a green unit test proves a visible product change;
- leave empty, error, keyboard, narrow-width, or recovery behavior to "later" when the change affects it;
- silently broaden scope because the original implementation became inconvenient;
- mark local work Done when the task requires durable repository history and no commit exists;
- treat old code, old prose, or an old commit as more authoritative than current requirements and data.

## Decision posture

The agent should:

- make safe, reversible, in-scope decisions from repository evidence;
- explain material tradeoffs before they become expensive;
- ask Rob only when a missing choice changes product direction, public meaning, privacy, architecture,
  dependency policy, or irreversible scope;
- prefer a concrete inspected fact over an assumed convention;
- prefer correction over defensive attachment to its first implementation;
- leave a clean explanation that the next developer can recover without re-deriving the work.

---

# 2. Scale the Investigation to the Change

Repository grounding is mandatory for non-trivial work, but its depth is proportional.

## Documentation or administrative change

Usually inspect:

- the target file;
- its immediate references;
- current Git status;
- applicable Kanban/handoff state.

Do not inspect every post, stylesheet, or commit.

## Bounded page, copy, or presentation change

Usually inspect:

- the affected page;
- the owning template or local CSS/JS;
- one current analogous page or component;
- usage of any selector, function, ID, or data field being changed;
- relevant recent learning/handoff notes;
- recent commits for the affected path when intent is not obvious.

## Component or interaction change

Usually inspect:

- every material consumer of the component;
- shared CSS/JS ownership;
- the component's introduction and most relevant fix history;
- keyboard, focus, responsive, error, and repeat-use behavior;
- existing tests and reference standards;
- a representative consumer from each materially different surface.

## Shared data, generator, navigation, or infrastructure change

Usually inspect:

- source-of-truth and generated-output boundaries;
- all consumers and write allow-lists;
- current tests and failure modes;
- applicable architecture decisions and handoffs;
- recent commits affecting the contract;
- rollback and partial-failure behavior;
- migration or compatibility requirements.

## Architecture, migration, dependency, or release integration

Use the deepest review only here:

- current architecture and ownership map;
- alternatives and why the selected approach fits this repository;
- migration steps and stop conditions;
- rollback/recovery;
- dependency, licensing, performance, and deployment effects;
- explicit owner decisions where product or architecture direction changes.

**Do not perform the deepest review for a heading, spacing, or isolated component fix.**

---

# 3. Repository Grounding Sources

Use the repository as an evidence system, not just a file drawer.

## 3.1 Kanban — current scope and state

For non-trivial work:

- identify or create the relevant `RBB-###` card;
- confirm its goal, non-goals, acceptance criteria, risks, and status;
- check whether another active card owns overlapping files or decisions;
- keep the card and `docs/kanban/board.md` synchronized;
- do not mark it Done until its actual completion condition is met.

The card is the task's scope contract. It is not a substitute for inspecting the implementation.

## 3.2 Learning log — durable lessons

Read relevant recent entries in `learning.md` before implementation.

Use them to recover:

- defects already encountered;
- repository-specific traps;
- decisions that should not be re-litigated;
- known debt that belongs to another card;
- the last valid baseline;
- context future sessions must preserve.

Update the log with durable lessons and changed context, not a minute-by-minute transcript.

## 3.3 Handoffs — what happened and what remains

Read the handoff index and the recent handoffs most relevant to the affected surface.

Use handoffs to learn:

- files recently changed;
- why an approach was chosen;
- checks already run;
- known limitations;
- decisions awaiting Rob;
- areas explicitly left untouched;
- what a previous agent may have misunderstood.

A handoff is evidence from a prior session, not automatic authority. Reconcile it with the current tree.

## 3.4 Files and structure — current system ownership

Inspect enough of the tree to answer:

- What file is authoritative?
- What is hand-authored?
- What is generated?
- What is shared?
- What is page-local?
- What is private/local-only?
- What is vendored?
- What is a frozen approved data export?
- Which files are public because GitHub Pages serves from the repository root?

Use `rg`/`rg --files` to find real usage before inventing a location or pattern.

## 3.5 Previous posts and pages — analogous product evidence

For a user-facing page or article, inspect the current template and at least one relevant recent example.
Choose examples by similarity, not convenience.

Examples:

- same lane for tone and navigation;
- same artifact type for Field Kit structure;
- same component for interaction behavior;
- most recent published story for current generated wiring;
- same Magic Math island for page-local CSS/JS and data packaging.

Do not copy an older post wholesale. It may contain intentional exceptions or superseded patterns.

## 3.6 Git history — intent and regression evidence

Use `git log -- <path>`, `git show <commit>`, and targeted blame/history when they answer a real question:

- Why does this unusual code exist?
- Which files changed together when this feature was introduced?
- Was a nearby difference deliberate?
- What defect did this guardrail prevent?
- Is the current pattern newer than the example being considered?

Do not browse history performatively. Stop when current intent is clear.

Current requirements, verified data, and current tests outrank old commits.

---

# 4. Mandatory Pre-Implementation Change Contract

Before editing non-trivial work, be able to state:

- **Goal:** What user or repository outcome must change?
- **Current behavior:** What does the system do now?
- **Non-goals:** What nearby work is explicitly excluded?
- **Owning files:** Which files are authoritative for this behavior?
- **Consumers:** What else reads, renders, or depends on those files?
- **Existing pattern:** What current implementation should be reused or extended?
- **Protected contracts:** What must remain unchanged?
- **Change shape:** Local, component, shared, data/generator, or architecture/integration?
- **Risks:** What could realistically regress?
- **Rollback:** How can the change be safely reversed or contained?
- **RobQAPass handoff:** What QA tier and evidence will the completed implementation need?

This can be a short plan for a bounded change. The purpose is clarity, not paperwork.

If these answers reveal a materially different task, report scope drift before implementation.

---

# 5. Ownership and Source-of-Truth Rules

## Hand-authored versus generated

Before writing, determine which side owns the value.

On this site:

- `assets/data/content-index.json` is the content metadata source of truth;
- generated projections and marker-owned regions come from the canonical generator;
- article bodies and designated hand-authored regions remain hand-authored;
- generated XML/JSON/listing output must not be manually patched;
- public visualization pages consume frozen approved data rather than joining raw research at runtime.

When a generated result is wrong, fix the source or generator unless the current architecture explicitly
assigns ownership elsewhere.

## Shared versus local

Use page-local CSS/JS when behavior is truly isolated. Use shared assets when the same contract is already
shared or when duplication would cause consumers to drift.

Do not promote a one-off into a global abstraction without repeated evidence.

Do not keep repeated shared behavior isolated merely to avoid understanding the existing component.

## Private versus public

This repository is served from its root. Treat tracked files as potentially public.

Keep confidential details, private research, local workflow memory, and ignored governance material out of
public history unless Rob explicitly changes that boundary.

## Vendored and external assets

Do not replace, update, or add a dependency casually.

When a dependency is justified, verify:

- current project permission;
- provenance and license;
- local vendoring/runtime policy;
- payload and performance effect;
- fallback and failure behavior;
- whether the dependency solves a repeated problem rather than one convenient implementation detail.

---

# 6. Reuse Before Create

Before adding a component, selector, helper, data shape, or interaction:

1. Search for the intended behavior and visible pattern.
2. Inspect the most current implementation and its consumers.
3. Read relevant reusable-component/reference guidance.
4. Check recent fixes so the new work does not silently drop them.
5. Extend the existing pattern when its contract genuinely matches.
6. Create a new pattern only when the existing one would become misleading or overgeneralized.

Examples of repository-specific risks:

- rebuilding mana pips without the shared `.ms-cluster` fixes;
- creating another dropdown instead of `[data-nav-dropdown]`;
- hand-rolling a card tile that loses the `.scry-card` link/fallback contract;
- copying a wrapper page when the Field Kit download must be a clean standalone artifact;
- inventing a second search normalization path;
- duplicating generator-owned metadata in hand-authored files.

## Abstraction threshold

Abstract when there is evidence of a shared contract, not merely similar-looking code.

Good reasons:

- multiple real consumers need the same behavior;
- a defect fix must propagate consistently;
- one source of truth prevents measured drift;
- the existing reference standard defines a reusable component.

Weak reasons:

- the code could theoretically be reused;
- an abstraction looks more professional;
- a one-off file feels untidy;
- a framework would make the implementation familiar.

---

# 7. Plan the Smallest Complete Change

Small does not mean partial.

A small complete change includes everything required for the changed behavior to be honest and usable:

- implementation;
- affected content/data wiring;
- accessibility behavior;
- relevant failure/empty/recovery state;
- targeted regression protection;
- documentation or memory updates when context changed;
- a clean RobQAPass handoff.

It excludes unrelated cleanup, speculative refactors, and enhancements that are not necessary for the
requested outcome.

Prefer one vertical slice that works through the real product over several disconnected layers that are
individually incomplete.

---

# 8. Implementation Standards

## HTML

- Prefer semantic native elements.
- Keep heading hierarchy meaningful.
- Use real links for navigation and real buttons for actions.
- Preserve keyboard and assistive-technology access.
- Avoid nested interactive controls.
- Keep IDs unique and stable where they are destinations or control relationships.
- Preserve the static/no-JS floor when the surface promises one.

## CSS

- Find the selector's full usage before changing a shared rule.
- Prefer existing tokens and component classes.
- Scope page-island styles under a meaningful root.
- Avoid generic selectors that leak into unrelated pages.
- Check responsive overrides before adding compensating rules.
- Separate geometric correctness from optical appearance when precision matters.
- Do not solve visual problems by deleting valid content or data.

## JavaScript

- Add JavaScript only when behavior requires it.
- Prefer progressive enhancement over making basic content inaccessible without JS.
- Keep state ownership explicit.
- Prevent duplicate listeners, duplicate markup, stale async results, and orphaned overlays.
- Preserve focus, scroll, close/reopen, Back/Forward, and repeat-use behavior where relevant.
- Distinguish product, harness, and environment failures before changing data or logic.

## Data and generators

- Validate inputs before writing outputs.
- Keep transformations deterministic and idempotent.
- Preserve write allow-lists and protected hand-authored regions.
- Fail closed on invalid publication or unknown schema state.
- Avoid partial old/new output states; use the repository's established transaction/rollback pattern.
- Never change approved data to make rendering easier.

## Content and claims

- Treat public wording as product behavior.
- Use the current voice and editorial authorities.
- Do not invent claims, dates, metrics, card facts, or first-person specifics.
- Preserve meaning when translating research/internal terminology into reader language.
- Stop when verified authority contradicts requested wording or existing copy.

---

# 9. Accessibility and Failure States Are Implementation Work

Do not defer obvious product states to QA when they can be designed correctly during implementation.

For affected behavior, consider:

- keyboard reachability and visible focus;
- accessible name, role, and state;
- touch target and actual hit area;
- narrow/mobile containment;
- reduced motion;
- no-JS/static fallback;
- empty result;
- missing asset;
- invalid/deep link;
- slow or failed lookup;
- repeat use;
- close/back/return/restart;
- stale state or stale async completion.

Only include states relevant to the changed contract. Do not manufacture features to satisfy a generic
checklist.

---

# 10. Shared-Asset Blast-Radius Review

Before changing shared CSS, JavaScript, navigation, templates, generators, or data contracts:

- enumerate material consumers;
- identify materially different surfaces;
- inspect at least one representative of each;
- identify existing regression tests;
- state what should remain unchanged;
- decide whether the change belongs in the shared owner or a local override;
- plan rollback if the shared behavior regresses.

A one-line global change can carry more risk than a hundred lines inside an isolated page.

Measure risk by ownership and reach, not line count.

---

# 11. Use History Without Cargo-Culting It

Previous posts, files, and commits are valuable because they reveal intent and learned constraints.

They are not templates to copy blindly.

When examples disagree:

1. Prefer the current explicit requirement.
2. Prefer the current source-of-truth/data contract.
3. Prefer the newer verified pattern when it intentionally superseded the old one.
4. Check handoffs/learning/history for the reason.
5. Ask only if the difference changes product or architecture direction.

Record newly discovered durable differences so the next developer does not repeat the archaeology.

---

# 12. Implementation Loop

Use a tight loop:

1. **Ground:** inspect the smallest relevant repository context.
2. **Contract:** state goal, owners, protected behavior, risk, and non-goals.
3. **Patch:** make the smallest coherent change.
4. **Inspect:** review the actual diff and affected consumers.
5. **Exercise:** run the targeted development check and real changed path where applicable.
6. **Correct:** fix implementation defects without defending the first attempt.
7. **Stop:** do not continue into unrelated cleanup after acceptance criteria are met.
8. **Hand off:** provide RobQAPass the evidence needed to select validation.

Do not write a large batch and inspect only at the end when smaller checkpoints are available.

---

# 13. Scope Drift

Scope drift exists when implementation reveals that the requested change requires a materially different:

- product decision;
- data authority;
- public claim;
- shared component contract;
- architecture;
- dependency;
- migration;
- privacy boundary;
- destructive action;
- QA tier.

When that happens:

1. stop the expanding implementation;
2. preserve the safe work already completed;
3. explain the newly discovered dependency or conflict;
4. update the Kanban risk/scope if appropriate;
5. obtain direction when the choice belongs to Rob.

Do not hide scope drift inside a bigger diff or a larger test run.

---

# 14. Working-Tree and Git Discipline

Before editing:

- inspect branch and status;
- identify user-owned or other-card changes;
- avoid overlapping files when possible;
- do not discard, reset, or rewrite unrelated work.

During implementation:

- keep commits conceptually coherent when commits are requested;
- stage exact files;
- review staged scope;
- do not mix private/local governance with public code unless explicitly authorized;
- preserve Robert Boles as the sole commit author with no co-author trailers.

Completion must describe the real state:

- **implemented locally** is not the same as **committed**;
- **committed** is not the same as **pushed**;
- **pushed** is not the same as **deployed**;
- **deployed** is not the same as **post-deployment verified**.

Use the status required by the card. Do not mark durable integration Done while its authority is still
untracked.

---

# 15. Error and Environment Discipline

When a command, browser tool, test, or network call fails:

- capture the exact failure;
- decide whether it is product, test, environment, permissions, or expected bounded behavior;
- use the repository's supported alternate invocation when appropriate;
- do not rewrite product behavior to satisfy a broken harness;
- do not claim a check ran if only a wrapper failed;
- report any substituted command and prove it executes the same contract.

Example: on Windows, if PowerShell blocks `npm.ps1`, `npm.cmd test` is the same package script; record the
wrapper failure and the successful equivalent invocation.

---

# 16. Handoff to RobQAPass

RobDevPass does not select the final QA scope by itself. It hands RobQAPass a precise implementation
record.

At implementation completion, state:

- what behavior changed;
- what files own that behavior;
- what existing pattern was reused or why a new one was necessary;
- what consumers and shared surfaces were inspected;
- what protected contracts remained untouched;
- what failure/accessibility/responsive states were implemented;
- what targeted development checks already passed;
- what risks remain;
- whether scope drift occurred;
- what changed risk RobQAPass should classify.

RobQAPass then selects proportionate validation and prepares the shortest owner review.

---

# 17. RobDevPass Handoff Fields

Every implementation handoff claiming RobDevPass readiness should include:

## Developer calibration

- change shape:
- investigation depth used:
- why that depth was proportional:

## Repository evidence reviewed

- Kanban card/current state:
- learning entries:
- relevant handoffs:
- owning files/structure:
- analogous posts/components:
- relevant commits/history:

Use `not applicable` with a reason instead of performative history or page review.

## Implementation contract

- goal:
- non-goals:
- source of truth:
- consumers/blast radius:
- existing pattern reused:
- protected contracts:

## Implementation result

- files changed:
- behavior changed:
- accessibility/failure/responsive states:
- scope drift:
- rollback:

## Development checks

- check:
- reason:
- result:

## RobQAPass handoff

- changed risk:
- suggested QA tier:
- deterministic evidence already available:
- remaining implementation uncertainty:

Do not duplicate the rest of this document into the handoff.

---

# 18. RobDevPass Exit Criteria

A change is **RobDevPass READY** when:

- the task is grounded in the current Kanban state and relevant repository memory;
- the investigation depth matches the change shape;
- authoritative and generated files are correctly identified;
- an existing pattern was reused or a new pattern is concretely justified;
- the change is the smallest complete implementation of the requested outcome;
- shared blast radius was inspected where applicable;
- relevant accessibility and failure behavior was built, not deferred accidentally;
- approved data, claims, and private/public boundaries remain intact;
- the implementation diff contains no unexplained scope;
- user-owned and unrelated work remains untouched;
- local/committed/pushed/deployed status is reported truthfully;
- durable lessons and handoff context are updated when needed;
- RobQAPass receives enough evidence to classify the changed risk.

RobDevPass READY does not mean the change has passed RobQAPass or owner acceptance.

---

# 19. Automatic Failure Conditions

Do not claim RobDevPass READY if any of these are true:

- non-trivial implementation began from blank context;
- no current card/scope contract exists for work that requires one;
- a generated output was hand-edited instead of its source/owner;
- a new component/helper/pattern was added without searching for the existing one;
- shared CSS/JS/data/navigation changed without a consumer/blast-radius review;
- an older post or commit was copied without checking current contracts;
- old history overrode verified current data or explicit requirements;
- the change added a dependency without explicit approval and dependency review;
- public behavior relies on private or machine-local files;
- confidential/private governance material was moved into public history without authorization;
- accessibility or failure behavior relevant to the changed contract was knowingly omitted without
  being surfaced;
- scope drift was hidden inside a larger diff;
- unrelated cleanup was mixed into the task without a concrete need;
- the implementation agent cannot explain which file owns the changed behavior;
- the handoff says "done" while the required durable state is only local;
- user-owned working-tree changes were overwritten, discarded, or silently absorbed;
- the agent asks Rob to rediscover deterministic implementation facts that repository inspection could
  establish.

---

# 20. Compact Agent Instruction

When an instruction surface needs a short pointer, use:

> Apply `RobDevPass.md` before implementation. Work at an experienced mid-level/product developer level
> with senior guardrails: practical, proportional, and willing to make safe in-scope decisions, but never
> from blank context. For non-trivial work, ground the change in the Kanban card, relevant learning and
> handoffs, owning files and structure, a current analogous post/component, and targeted Git history when
> it clarifies intent. Identify source-of-truth, consumers, protected contracts, shared blast radius,
> failure/accessibility states, non-goals, rollback, and the smallest complete change. Reuse before
> creating, never hand-edit generated output, report scope drift, preserve unrelated work, and hand the
> finished implementation evidence to `RobQAPass.md`.

---

# 21. Adoption Guidance

Recommended integration points:

- repository `AGENTS.md`: one concise authority and calibration reference;
- preflight: require proportional repository grounding;
- implementation plans: include the pre-implementation change contract;
- WebDev guidance: inspect current patterns and relevant history before suggesting a change;
- handoffs: use the RobDevPass fields when claiming readiness;
- workflow: put RobDevPass before RobQAPass.

Do not copy this document into every instruction file.

Do not create a second developer framework around it.

This document is the implementation authority. Product-specific references still own their exact
components, content, data, and interaction contracts.
