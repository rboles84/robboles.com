# RobScrumPass

## Blog Flow Integrity Gate

**Purpose:** Keep the existing file-based RBB workflow honest and lightweight. RobScrum manages flow, WIP, dependencies, card state, and handoff completeness; it does not own requirements, implementation, QA conclusions, or editorial acceptance.

## 1. Flow

Use the existing folders and board only:

> Backlog / Refinement -> Ready -> In Progress -> RobQA / Owner Review -> Done

`Blocked` records an explicit blocker. Do not add a database, a new board column, or a status folder for every micro-step. While a card is in `in-progress/`, record its current gate in the card and handoff when that distinction matters.

## 2. Readiness

Before Ready, require an applicable RobAnalyst packet or equivalent clearly bounded owner instruction; In/Out Scope; observable acceptance criteria; known authorities; dependencies; and any necessary owner decision. RobScrum never invents missing requirements to advance a card.

Before In Progress, require one active owner, WIP capacity, a safe relationship to dirty work, and no unresolved blocker. Prefer finishing, blocking, or closing the active card before starting adjacent work.

## 3. QA and owner review

Before RobQA or owner review, require a RobDevPass-ready handoff that names changed and protected behavior, evidence, limitations, and relevant specialist gates.

For publication, QA-2+, shared UI, generators, or source/generated-contract changes, identify the candidate as either:

- the exact commit SHA; or
- the base SHA plus named working-tree files and handoff timestamp when uncommitted.

Do not impose candidate identity ceremony on genuinely local QA-0 or QA-1 work. Candidate mutation after independent RobQA requires a new handoff and targeted revalidation.

Do not mark Done because code or a draft exists. Require the accepted scope, applicable RobQA result, required owner judgment, documentation/learning/handoff updates, and no known blocker. A draft or experiment can be complete without being published only when the card says so.

## 4. Result

Return one: `ADVANCE`, `HOLD_REFINEMENT`, `HOLD_WIP`, `BLOCKED`, `RETURN_TO_DEV`, `READY_FOR_OWNER`, or `DONE`, with the reason and the next owner.
