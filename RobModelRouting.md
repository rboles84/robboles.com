# RobModelRouting

## Guarded Model and Compute Defaults

Use the lowest model and reasoning effort that can meet the accepted role, risk, and evidence burden. Efficiency never waives RobDevPass, RobQAPass, publication, editorial, MTG, or owner-acceptance obligations.

| Work | Default route | Boundary |
| --- | --- | --- |
| Mechanical inventories, link/data diffs, candidate lists | `gpt-5.6-luna` / `low` | Output is untrusted input for a Terra-or-better decision maker; it cannot make factual, editorial, scope, or QA conclusions. |
| Analyst, Scrum, Dev, QA, writing, documentation | `gpt-5.6-terra` / `medium` | Normal governed work. Keep retrieval and output bounded to the card. |
| Materially difficult Dev or QA work | `gpt-5.6-sol` / `medium` | Use only for conflicting evidence, current MTG verification, shared generator/data contracts, difficult debugging, complex interactive artifacts, or high public-trust blast radius. Record one concise reason in the card or handoff. |

The routing is a guarded default, not a hard pin. No role autonomously selects high, xhigh, max, or Pro mode; Rob may authorize one bounded exception when a measured quality need justifies it.

## Context and concurrency

- Keep ordinary work to one active implementation stream. Run at most two agents only when their files and decisions are independent.
- Do not send several agents through the same preflight. RobAnalyst's compact packet may be shared; RobQA independently verifies the material changed-risk claims.
- Retrieve the owning source and immediate consumers first. Reuse evidence already gathered in the current task; do not reread broad history without a risk-based reason.
- Use focused checks and bounded handoffs. Record an efficiency note only when a meaningful escalation or deliberate narrowing explains the result.

The model labels and effort defaults follow OpenAI's current GPT-5.6 guidance: Terra balances capability and cost, Luna is for cost-sensitive high-volume work, and Sol is the flagship option for harder work. See <https://developers.openai.com/api/docs/guides/latest-model>.
