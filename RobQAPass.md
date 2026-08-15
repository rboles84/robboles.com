# RobQAPass

## Rob QA Pass — Risk-Proportional Owner QA Gate

**Purpose:** Codify the way Rob actually tests software so implementation agents can perform the right QA before asking for owner review.

This gate is not a replacement for unit, integration, accessibility, or regression testing. It is the final product-facing quality layer that asks:

> Does the changed product actually work, look right, read naturally, preserve the intended state, and give the user what the interface promises?

The governing principle is:

> **Use the smallest deterministic QA set that gives sufficient confidence for the risk introduced by the change. More tests are not automatically better QA.**

A presentation fix does not justify an exhaustive engine certification. A placement-engine change does.

---

# 1. The Rob QA Model

Rob's QA behavior consistently combines five modes:

1. **Use the product like a real user.**
2. **Read the product like an editor and product owner.**
3. **Inspect the rendered UI like a frontend tester.**
4. **Inspect the DOM/HTML when the visual result needs proof.**
5. **Convert every meaningful manual finding into a reusable regression invariant.**

A feature can be technically functional and still fail Rob QA.

Examples of failure classes that automation commonly misses:

- a heading is technically present but needlessly repeated;
- a destination loads but does not land on the thing the user clicked;
- a modal opens but teaches nothing beyond the tile that launched it;
- a glyph is geometrically centered but looks visibly high;
- a card is factually valid but is a poor player-facing example;
- a result is internally consistent but strands the user in a loop;
- a page uses correct words so often that it feels mechanically generated;
- a label exposes implementation language that a player should never see;
- an interaction works with a mouse but loses focus, scroll position, or state;
- an automated review passes while the actual rendered product obviously looks wrong.

**Rob QA evaluates product truth, not merely test truth.**

---

# 2. Mandatory Pre-QA Classification

Before running tests, classify the change.

Do not choose tests until the changed behavior and protected contracts are identified.

## QA-0 — Documentation / comments / non-runtime metadata

Examples:

- documentation correction;
- handoff text;
- comments;
- non-runtime planning files.

Required QA:

- targeted file/content validation;
- formatting or schema checks if applicable;
- `git diff --check`;
- confirm no runtime files changed.

Do not run browser, journey, synthetic, mutation, or full regression suites unless the change unexpectedly touched runtime behavior.

---

## QA-1 — Copy / presentation / styling

Examples:

- wording;
- heading cleanup;
- card-detail content;
- modal text;
- spacing;
- alignment;
- color;
- typography;
- icon or mana-pip rendering;
- display label changes.

Required QA:

- focused rendered browser case(s);
- affected viewport(s);
- affected DOM/content assertions;
- relevant accessibility interaction;
- lint/source guards;
- targeted visual checks.

Normally prohibited:

- 5,000-journey placement runs;
- synthetic placement suites;
- mutation suites;
- recovery-journey suites;
- exhaustive routing simulation;
- unrelated all-system stress tests.

A QA-1 change is not allowed to become QA-4 simply because a heavy test already exists.

---

## QA-2 — Component interaction

Examples:

- modal;
- popup;
- hover preview;
- accordion;
- tabs;
- card details;
- form control;
- focus behavior;
- one-step undo/return;
- local UI state.

Required QA:

- affected functional path;
- pointer behavior;
- keyboard behavior;
- focus/scroll restoration;
- responsive containment;
- failure/close/reopen behavior;
- relevant state persistence;
- targeted regression around the component class.

Add broader tests only if the component is shared across materially different surfaces.

---

## QA-3 — Navigation / routing / state transitions

Examples:

- Back/Forward;
- deep links;
- query parameters;
- result-to-detail navigation;
- focus/scroll destination;
- invalid URL recovery;
- refresh behavior;
- return-to-previous-state behavior.

Required QA:

- deterministic state-transition cases;
- expected URL;
- expected destination;
- expected focus/scroll;
- Back/Forward;
- refresh;
- safe invalid-state behavior;
- targeted mobile path.

Do not confuse "URL loaded" with "navigation passed." The destination must actually be activated and visible as promised.

---

## QA-4 — Decision logic / placement / scoring / qualification

Examples:

- answer mappings;
- scoring;
- ranking;
- qualification;
- placement thresholds;
- refinement selection;
- state-machine behavior affecting result meaning;
- recommendation ranking logic.

Required QA may include:

- deterministic witnesses;
- relevant confusion/boundary pairs;
- targeted synthetic cases;
- journey simulation;
- mutation testing;
- recovery testing;
- full engine certification when the protected behavior actually changed.

This is the tier where large computational suites can be justified.

---

## QA-5 — Integration / deployment / production-critical change

Examples:

- merge candidate;
- deployment;
- shared production dependency;
- data migration;
- production configuration;
- release integration involving multiple protected surfaces.

Required QA is based on the combined risk of the integrated changes.

A broad regression pass may be appropriate, but it still must be justified by the release scope.

---

# 3. CPU and Test-Cost Gate

Before any CPU-heavy or long-running suite, the agent must answer:

1. **What changed that this suite protects?**
2. **What defect could this suite catch that the targeted tests cannot?**
3. **Has the protected behavior already been certified at the current unchanged baseline?**
4. **Is this suite proportionate to the current change?**

If the agent cannot give a concrete answer, do not run the suite.

## Explicit rule

For QA-0, QA-1, and ordinary QA-2 work:

> **Do not run exhaustive journey, synthetic, mutation, recovery, enumeration, or equivalent engine stress suites solely because they exist.**

Preserve the last valid certification for untouched protected behavior.

If implementation unexpectedly touches a higher-risk protected area:

> **Stop and report scope drift. Do not compensate for scope drift by silently running a larger test suite.**

## Heavy-suite handoff requirement

If a heavy suite is justified, the handoff must state:

- suite name;
- why it was required;
- protected behavior changed;
- approximate scope;
- whether it is CPU-heavy;
- result.

"Ran the full suite because it is standard" is not sufficient justification.

---

# 4. How Rob Performs Manual Product QA

## 4.1 Start with the real rendered product

Source code passing is not the same as the product passing.

Open the actual affected route or deterministic review case and inspect the rendered state.

Before drilling into implementation details:

- look at the whole page;
- understand what the page is telling the user;
- follow the intended journey;
- observe hierarchy;
- observe what draws the eye;
- notice whether the next action is obvious;
- notice whether anything feels duplicated, stiff, unfinished, misleading, or out of place.

The first question is not "does the selector exist?"

It is:

> **Does this look and behave like a finished product?**

---

## 4.2 Read from top to bottom

Rob reads substantial user-facing text rather than assuming copy is correct because a snapshot contains it.

For changed content, read the actual rendered copy in order.

Ask:

- Does each section add something new?
- Does the next paragraph logically follow the previous one?
- Is the same idea being stated repeatedly?
- Is the identity/product name repeated mechanically?
- Does the page sound written for a player or for an auditor/developer?
- Is internal methodology leaking into public copy?
- Does a heading merely repeat its parent label?
- Does a modal repeat what was already visible?
- Is a sentence technically correct but unnatural?
- Does the explanation answer the question the user would actually have?
- Is the product making a stronger claim than the underlying system can defend?
- Is an uncertainty statement helpful, or does it read like defensive process language?
- Does the text sound like something a real person would say?

When useful, **read the copy aloud**.

This is especially important for:

- questions;
- answer choices;
- headings;
- result explanations;
- help text;
- empty states;
- error messages;
- modal explanations;
- navigation labels.

---

# 5. How to Interpret Rob's Raw QA Notes

Rob often records findings quickly while testing.

They are evidence, not polished bug tickets.

Common forms include:

- `Error:`
- `Fail:`
- `ERROR:`
- `EPIC FAIL:`
- "this is broken"
- "why are we showing this?"
- "how did this pass QA?"
- "this makes no sense"
- "this is the same thing"
- "we don't need to say this"
- "can we not..."
- "I think..."
- "not sure if it matters or if I'm being picky"

Agents must interpret the underlying product expectation.

## `Error:` / `Fail:`

Treat as a concrete observed defect unless repo/browser evidence proves it is an environment or harness failure.

Required response:

1. reproduce the exact observed path;
2. identify expected versus actual;
3. determine the defect class;
4. distinguish product failure from harness/environment failure;
5. propose the smallest systemic correction.

Do not dismiss the finding because an automated suite previously passed.

---

## Strong wording such as `EPIC FAIL`

This communicates high owner confidence that the rendered result violates the product intent.

Do not convert emotional emphasis directly into engineering severity.

Classify severity based on user impact, but investigate the finding immediately.

---

## Questions such as "why are we showing this?"

This usually means:

> The owner sees a mismatch between the purpose of the surface and the information being presented.

Do not answer only with technical correctness.

Determine whether the content actually serves the surface.

Example principle:

A card may be factually valid, but if the surface is supposed to help a player understand an identity, the card must be useful for that purpose.

---

## Suggestions embedded in findings

Rob frequently gives example wording to communicate direction.

Unless explicitly stated as exact required copy:

> **Treat example wording as intent, not mandatory text.**

If the note says "for example" or "do not just copy this," preserve the idea and write the best product copy for the context.

---

## "I might be picky" / "not sure if this matters"

Treat this as a **product-choice signal**, not an automatic defect.

Determine:

- Is correctness affected?
- Is user understanding affected?
- Is consistency materially affected?
- Is it purely aesthetic preference?

If it is preference only, say so clearly and do not let it reopen a completed correctness scope without an explicit owner decision.

---

# 6. The Rob Copy and Product-Language Gate

Public copy must be:

- clear before poetic;
- useful before clever;
- natural to the intended user;
- specific enough to teach;
- honest about uncertainty;
- confident without pretending certainty;
- free of implementation/audit language;
- free of mechanical repetition;
- free of generic AI/template cadence.

## Hard review questions

### Repetition

Look for:

- same heading repeated at two hierarchy levels;
- product/identity name repeated in label + heading + first sentence;
- same rationale repeated in a modal;
- same sentence stem across multiple sections;
- same concept restated without new information;
- tags repeating the heading;
- "name spam" that is technically correct but visually exhausting.

A global string count is not enough.

Review **adjacent composition**.

---

### Natural language

Flag wording that is:

- overly formal;
- analytical when the user expects conversational clarity;
- metaphor-only;
- vague;
- internally procedural;
- unnatural when spoken aloud;
- technically precise but not useful;
- falsely certain;
- defensive rather than explanatory.

Examples of the kinds of questions Rob asks:

- Would a Commander player actually say this?
- What does this tell me that I did not already know?
- Why does this card fit this reading?
- Why did clicking this take me here?
- Why is this word repeated again?
- Does this button do what its label promises?

---

### Internal-language leakage

Player-facing surfaces should not expose terms whose purpose is internal governance or implementation unless the product genuinely teaches that concept.

Examples of suspicious categories:

- audit;
- provenance;
- routing;
- mapping;
- taxonomy;
- guardrail;
- support-only;
- verification status;
- source-bound/source-bounded;
- implementation proof;
- internal classification language.

Do not globally ban normal English words.

Context matters.

---

### Claims and trust

If the backend cannot defend the implication of a word or number, change the presentation.

Examples:

- heuristic score presented as statistical probability;
- ranking presented as neutral browsing;
- inferred preference presented as proven fact;
- editorial selection presented as objective best.

A technically accurate implementation can still fail if the user-facing claim overstates what the system knows.

---

# 7. Visual QA: Geometry and Human Optics Are Separate

Rob does not accept "the bounding box is centered" as proof that an icon looks centered.

Use two passes when alignment/spacing is materially changed.

## Pass A — Geometric / DOM pass

Run at deterministic browser conditions when collecting measurements:

- browser zoom: 100%;
- fixed viewport;
- fixed device scale;
- fonts fully loaded;
- animations/transitions disabled where necessary;
- stable state before measuring.

Inspect:

- target element;
- parent container;
- relevant child;
- `::before` / `::after` computed styles when used;
- width/height;
- line-height;
- padding/margin;
- transforms;
- flex/grid alignment;
- clipping/overflow;
- DOMRect center deltas when relevant.

Do not claim a pseudo-element has its own ordinary DOMRect.

For pseudo-element artwork:

- inspect computed pseudo-element styles;
- measure the owning element;
- use screenshot/crop evidence for the visible artwork.

---

## Pass B — Optical / human pass

After geometry passes, look at the actual rendered result.

Check:

- normal viewing size;
- relevant desktop/mobile sizes;
- a highly magnified inspection, including **500% zoom/magnification when needed**;
- spacing around the object;
- visible artwork center, not merely the element box;
- text baseline;
- perceived balance;
- neighboring elements.

A control can pass geometry and still fail optical QA.

When Rob zooms to 500%, the purpose is to expose subtle:

- off-centering;
- one-pixel drift;
- uneven spacing;
- clipping;
- inconsistent gaps;
- line-height problems;
- borders that do not meet cleanly;
- icon or glyph asymmetry;
- text that is visually shifted inside its container.

**Do not use a 500% browser zoom as the deterministic geometric environment.**
Use it as an optical inspection technique. Keep automated geometry measurements at a pinned normal zoom.

---

# 8. Responsive and Zoom Review

Do not test responsiveness only by resizing until nothing overflows.

At each relevant width, verify:

- hierarchy remains understandable;
- important content is still visible at the right moment;
- no horizontal scrolling;
- headings wrap intentionally;
- buttons remain usable;
- footer actions remain reachable;
- focus/scroll lands where expected;
- modals stay within the viewport;
- cards/panels do not become awkwardly tall or narrow;
- spacing still looks intentional;
- sticky headers do not obscure destinations.

Representative widths should come from the product's existing test contract.

Do not mechanically add every historical viewport to every small change.

Use the widths that can expose the changed risk.

For accessibility zoom, test the required product level (commonly 200%) where relevant.

For optical inspection, Rob may magnify substantially further, including 500%, to inspect pixel/spacing quality.

---

# 9. HTML, DOM, CSS Selector, and XPath Inspection

When a visual or interaction defect is unclear, inspect the actual rendered DOM.

The purpose is to answer:

> **What element is the user actually seeing and interacting with?**

## Inspect the exact target

Capture or inspect as useful:

- element tag;
- text;
- ID;
- class list;
- `data-*` attributes;
- ARIA role/name/state;
- parent/child structure;
- sibling structure;
- visibility;
- bounding rectangle;
- computed styles;
- pseudo-element styles;
- event target;
- stacking context / z-index;
- overflow/clipping;
- current focus;
- scroll position.

## CSS selector / XPath use

Use a stable CSS selector or XPath to prove which rendered node owns the behavior.

Useful for:

- duplicate text appearing in multiple nodes;
- wrong element receiving a click/hover;
- hidden stale elements;
- duplicate modal markup;
- nested interactive controls;
- wrong panel being activated;
- multiple copies of the same ID/label;
- unexpected wrapper spacing;
- proving that the element inspected is the element the user sees.

XPath is an inspection locator, not a reason to rewrite the product around XPath.

Prefer stable semantic selectors for automation.

Add `data-qa` only when there is no suitable stable production selector.

## Text inspection

Choose the right representation:

- `innerText` when visual/visibility-aware text matters;
- `textContent` when testing emitted textual content;
- `outerHTML` when structure/attributes matter.

Do not assert visible-text rules against `outerHTML` when accessibility attributes legitimately preserve machine-readable/raw values.

Example: a rendered mana glyph may correctly have an accessible label containing a raw token while no raw brace notation is visible to the user.

---

# 10. Click, Hit-Area, Hover, and Trigger QA

Rob tests what actually responds, not merely whether an event handler exists.

For every changed interaction, ask:

- What exact visible area is clickable?
- Does the pointer change in the correct area?
- Does hover trigger from the intended target only?
- Does clicking surrounding text accidentally trigger the control?
- Does one click produce one action?
- Does rapid pointer movement expose stale state?
- Does leaving before async completion show old content?
- Does a disabled or hidden control still react?
- Does the hit area match what the visual design implies?

If the contract says "image-only hover," test:

- image triggers;
- adjacent title does not;
- description does not;
- tile padding does not;
- stale hover is cleared;
- rapid A → B → C movement cannot end on A or B.

---

# 11. Popup, Preview, and Modal QA

A modal is not considered correct merely because it opens.

## Launch

Verify:

- correct trigger opens it;
- wrong surrounding area does not;
- exactly one modal instance appears;
- repeated opens do not duplicate markup;
- correct card/item/context is loaded.

## Content value

Ask:

> **Why did the user click this?**

The modal must answer that question.

For an educational/detail modal:

- do not merely repeat the tile;
- do not make raw source/Oracle text the only added value when the user can already read it;
- provide meaningful context appropriate to the invoking surface;
- canonical facts should agree with the rendered item;
- deeper explanation should add information rather than paraphrase the same sentence.

If the surface promises "View details," the detail view must contain actual detail.

## Data consistency

Where applicable, verify:

- displayed image;
- name;
- printing;
- set/collector;
- mana cost;
- type;
- rules text;
- flavor text;
- source link;

all refer to the intended canonical record.

Do not let image A + flavor text B + source link C pass because the card name is the same.

## Close behavior

Verify:

- close button;
- Escape;
- overlay click when intended;
- click inside does not close;
- focus returns to the trigger;
- body scrolling is restored;
- no orphaned overlay remains.

## Keyboard

Verify:

- trigger is reachable;
- dialog receives meaningful focus;
- Tab/Shift+Tab behavior is correct;
- Escape closes;
- focus restoration is correct.

## Responsive containment

Verify:

- no horizontal overflow;
- close control remains reachable;
- content can scroll;
- image does not force unusable width;
- text remains readable;
- sticky/global UI does not cover the modal.

---

# 12. Navigation, Focus, Scroll, and State QA

A link passes only when the promised destination is actually delivered.

For navigation changes verify:

- expected route;
- expected state;
- expected target;
- expected heading;
- expected focus;
- expected scroll;
- Back;
- Forward where relevant;
- refresh;
- restart/reset;
- invalid/deep-link recovery.

## Important distinction

These are different assertions:

- URL is correct.
- Page loaded.
- Correct panel is active.
- Correct content is visible.
- Focus is meaningful.
- Scroll position shows the intended destination.

Do not mark the navigation passed after the first two if the user clicked a specific lesson/action and the page opens at an unrelated hero.

---

# 13. State and Recovery QA

Rob frequently tests what happens after the "happy path."

For affected stateful work, test:

- back;
- return;
- restart;
- refresh;
- repeat action;
- invalid input;
- partial state;
- unexpected state;
- stale state;
- state after closing/reopening;
- state after selecting then changing a selection.

When a user is offered a refinement/recovery action:

- it must improve or truthfully preserve the state;
- it must not silently broaden uncertainty;
- it must not trap the user in a loop;
- it must not promise a resolution the system cannot produce;
- there must be an understandable way back when the product promises one.

---

# 14. Error, Empty, Failure, and Network-State QA

Do not test only successful data.

Where relevant, test:

- no results;
- missing image;
- failed lookup;
- slow lookup;
- network unavailable;
- invalid data;
- unsupported metadata;
- malformed URL;
- failed async response;
- stale async completion.

A failure state must:

- tell the truth;
- not masquerade as a product/content defect if the test environment caused it;
- preserve a usable path forward;
- avoid an infinite spinner/shell;
- avoid corrupting previous valid state.

Distinguish:

1. **Product defect**
2. **Test harness defect**
3. **Environment/network limitation**
4. **Expected bounded behavior**

Never rewrite product data to "fix" a harness/environment failure without proving the defect exists in the rendered product.

---

# 15. Finding Classification

Use four owner-facing severities unless the project already has a stricter model.

## BLOCKER

Examples:

- broken primary route;
- inaccessible required control;
- impossible or misleading result;
- dead-end state with no viable continuation;
- central action does not deliver its promised destination;
- material correctness failure.

## MAJOR

Examples:

- wrong semantic mapping;
- misleading UI state;
- major mobile/focus failure;
- incorrect recovery behavior;
- important explanation contradicts user input;
- interaction materially misleads or strands the user.

## MINOR

Examples:

- repeated copy;
- awkward hierarchy;
- poor spacing;
- centering;
- weak visual affordance;
- non-blocking responsiveness;
- inconsistent styling;
- unnecessary divider;
- wording that weakens polish but does not break the flow.

## NOTE / PRODUCT CHOICE

Examples:

- preference;
- aesthetic concern;
- future enhancement;
- intentional MVP limitation;
- technically correct choice the owner may or may not prefer.

A NOTE must not silently become mandatory remediation.

---

# 16. The Finding-to-Invariant Rule

When Rob finds a defect manually, do not fix only the exact string, identity, card, route, or viewport.

Ask:

> **What general test did Rob just perform that found this?**

Then preserve that invariant at the smallest useful scope.

Examples:

### Manual finding
WUBRG appears repeatedly in adjacent headings and sentences.

Bad regression:

- assert the exact old phrase is absent.

Good regression:

- opening composition cannot repeat the identity name across label, heading, tag, and immediate body copy.

---

### Manual finding
A card detail modal repeats the tile explanation.

Bad regression:

- Dina text is not equal to one exact sentence.

Good regression:

- an identity-linked detail modal must provide additive explanatory value beyond its invoking tile.

---

### Manual finding
A refinement advertised as Green vs Witherbloom introduces Naya.

Bad regression:

- Naya absent in one saved fixture.

Good regression:

- refinement cannot introduce a public identity outside the displayed frontier.

---

### Manual finding
A mana glyph box is centered but the medallion looks high.

Bad regression:

- one CSS offset added for one color.

Good regression:

- geometry plus optical review is required; shared correction first; specific exception only when measured and reproducible.

---

# 17. Do Not Overgeneralize Owner Findings

Systemic does not mean global.

Before adding a global rule, ask:

- Is the defect truly cross-product?
- Is this word/behavior legitimate elsewhere?
- Would the rule ban valid content?
- Can the invariant be contextual?

Examples:

- do not globally ban `proof` because one internal phrase used `placement proof`;
- do not globally ban `WUBRG` because one section repeated it;
- do not require every Witherbloom example to be BG if a mono-G card is explicitly native and serves the surface;
- do not rewrite every dossier because one shared fallback leaks audit language.

Prefer the **narrowest systemic rule that prevents the defect class**.

---

# 18. Agent Self-QA: "Test It Like Rob"

Before handing a UI/content change to Rob, the implementation agent must perform a short product-reading pass.

This is not a new automation framework.

It is a disciplined final review of the deterministic changed cases.

## Required self-review questions

### Whole product

- What is the page trying to tell me?
- Is the next action obvious?
- Does anything look unfinished?
- Is hierarchy coherent?
- Is any internal machinery exposed?

### Copy

- Did I read the changed rendered text top to bottom?
- Did I read important choices/explanations aloud?
- Is anything repeated?
- Does each section add new information?
- Does wording sound like a real user/player?
- Did I accidentally preserve a technically valid but useless explanation?

### Interaction

- Did I click the actual controls?
- Did I click around the edges of the control?
- Did I test close/back/return/restart where applicable?
- Did I verify focus and scroll?
- Did I inspect modal/popup content rather than only open/close?

### Visual

- Did I inspect desktop and the relevant narrow/mobile width?
- Did I check spacing and centering?
- If precision changed, did I inspect magnified output?
- Did I confirm the actual DOM node/style responsible for any suspicious visual?

### State

- Did I test the changed state transition?
- Did I verify the old state is not stranded/stale?
- Did I verify repeat use?

### Truth

- Does every public claim match the data/logic it represents?
- Did canonical facts remain consistent?
- Did I distinguish product failure from environment/harness failure?

---

# 19. Required Self-QA Evidence

For UI/content remediation, a final handoff should not report only:

> PASS

It should include enough actual rendered evidence to sanity-check the result.

For the affected deterministic cases, provide as appropriate:

- exact rendered heading/summary sequence;
- changed modal explanation;
- changed error/empty-state text;
- active focus/view;
- key DOM assertion;
- representative screenshot/crop path;
- exact expected vs actual for any remaining limitation.

This requirement exists because a test can enforce the wrong contract and still pass.

---

# 20. Owner Review Should Be Short

The agent is responsible for deterministic facts.

Rob is responsible for final judgment.

## Agent should verify

- canonical card facts;
- exact official text;
- exact printing IDs;
- generated transformations;
- URL resolution;
- selectors;
- DOM state;
- data parity;
- repeatable formatting;
- accessibility mechanics;
- deterministic responsive containment;
- regression suites appropriate to the risk.

## Rob should verify

- product feel;
- visual balance;
- natural wording;
- whether the explanation is actually useful;
- whether the flow makes intuitive sense;
- genuine ambiguity;
- high-impact product choices;
- final visual acceptance.

Do not make Rob manually re-verify hundreds of deterministic facts.

---

# 21. Owner Deterministic Review Contract

When a change is ready for owner review, provide the **shortest deterministic set of cases that exercises the changed risk**.

Good:

- three named review commands;
- one exact route;
- one exact saved state;
- one modal;
- one responsive case.

Bad:

- "click around";
- "test all 37";
- "rerun the questionnaire randomly";
- "review every card";
- "manually confirm 155 links";
- "try to reproduce the 5,000 journeys."

If the owner finds a new defect:

1. capture raw note;
2. repo-ground the reproduction;
3. classify product vs harness/environment;
4. identify the defect class;
5. add the smallest systemic regression;
6. rerun only the necessary QA tier;
7. return to the shortest owner recheck.

---

# 22. QA Selection Decision Tree

Use this before implementation handoff.

## Step 1 — What changed?

- Docs only → QA-0.
- Copy/style/presentation only → QA-1.
- Component interaction → QA-2.
- Navigation/state transition → QA-3.
- Placement/scoring/ranking/qualification → QA-4.
- Release/integration → QA-5.

## Step 2 — What protected contracts were touched?

List them explicitly.

If a protected contract was not touched, do not rerun its exhaustive certification merely for reassurance.

## Step 3 — What could realistically regress?

Build the test list from those risks.

## Step 4 — What existing machinery already proves unchanged behavior?

Reuse existing certification when the authority and protected code are unchanged.

## Step 5 — What does Rob still need to judge?

Create deterministic owner cases for those points only.

---

# 23. RobQAPass Required Handoff Fields

Every implementation handoff that claims RobQAPass readiness should include:

## Change classification

- QA tier:
- changed behavior:
- protected behavior intentionally untouched:

## Tests selected

For each:

- test:
- reason:
- result:

## Tests intentionally skipped

Especially record expensive suites:

- suite:
- why it was not required:
- last valid baseline/certification if relevant:

## CPU-heavy validation

Choose one:

- `NOT REQUIRED`
- `REQUIRED`

If required:

- exact reason;
- protected behavior changed;
- suite executed;
- result.

## Self-QA rendered evidence

- deterministic case:
- viewport:
- actual rendered result:
- interaction checked:
- visual/copy verdict:

## Manual findings converted to invariants

- finding:
- defect class:
- regression invariant:

## Remaining owner judgment

List only items that genuinely require human product judgment.

## Owner review commands / routes

Keep this bounded and deterministic.

---

# 24. RobQAPass Exit Criteria

A change is **RobQAPass READY** when:

- the QA tier was selected based on risk;
- no unjustified heavy suite was run;
- required targeted automation is green;
- the implementation agent exercised the real rendered changed path;
- changed copy was actually read;
- changed interactions were actually clicked;
- relevant responsive state was reviewed;
- DOM/HTML was inspected where needed;
- modal/popup value was reviewed where relevant;
- known manual defect classes have regressions;
- environment/harness failures are not disguised as product failures;
- owner review has been reduced to a small deterministic judgment set;
- no known correctness blocker remains.

A change is **RobQAPass PASS** when:

- Rob completes the short deterministic owner review;
- no blocker or major product defect remains;
- any remaining minor issue is explicitly accepted or separately deferred;
- acceptance is tied to the tested candidate/version/SHA when repository governance requires it.

---

# 25. Automatic Failure Conditions

Do not claim RobQAPass READY if any of these are true:

- the agent ran only source/unit tests for a visible UI change;
- the agent did not open the changed rendered product;
- a changed modal was never opened;
- a changed navigation target was not actually reached;
- a changed responsive surface was never viewed at a relevant narrow width;
- an automated visual rule passes but obvious visible misalignment remains;
- the same copy appears in parent/child hierarchy without intentional value;
- a popup/detail view repeats the launcher content without adding value;
- a recovery/refinement action can broaden, loop, or strand the user;
- a known environment failure is being reported as a product-content failure;
- a heavy suite was run without a risk-based reason;
- the agent asks the owner to manually verify deterministic facts the machine can prove;
- the owner is asked to "test all 37" for a narrow presentation change;
- the agent creates a new audit/research/certification phase instead of using existing machinery;
- a prior owner finding was patched only as one string/identity/card without considering the defect class;
- a contextual owner finding was turned into an unsafe global ban.

---

# 26. House Rules Derived From Rob's QA Style

1. **Rendered behavior outranks green test theater.**
2. **A technically valid result can still be a bad product result.**
3. **Read the text. Do not merely assert that text exists.**
4. **Click what the user clicks.**
5. **A destination is not correct until the intended content is visible.**
6. **A modal must justify the click.**
7. **Geometry and optical appearance are separate tests.**
8. **Zoom exposes polish defects that normal viewing can hide.**
9. **Use DOM/XPath/HTML inspection to prove what the browser actually rendered.**
10. **Expected vs actual must describe user-visible behavior, not implementation intent.**
11. **Raw owner notes are valid evidence even when they are informal.**
12. **Owner example wording communicates intent unless explicitly locked.**
13. **Manual findings become systemic regressions, but only at the correct scope.**
14. **Do not turn one defect into a global content ban.**
15. **Do not confuse environment/harness failures with product defects.**
16. **Do not make the owner re-prove machine-verifiable facts.**
17. **Owner time is for product judgment.**
18. **QA effort must scale with change risk.**
19. **CPU-heavy validation needs a concrete reason.**
20. **The goal is confidence sufficient to ship, not infinite proof.**

---

# 27. Compact Agent Instruction

When repository instructions need a short pointer instead of this full document, use:

> Apply `RobQAPass.md`. Classify the change by risk before selecting tests. Use the smallest deterministic QA set that protects the changed behavior. Do not run exhaustive engine/journey/synthetic/mutation/recovery suites for presentation-only changes. Exercise the real rendered changed path, read the copy, click affected interactions, inspect relevant responsive states, and use DOM/HTML evidence when needed. For precision visuals, separate deterministic 100% geometry checks from human optical inspection, including high magnification when useful. Treat raw owner `Error:`/`Fail:` notes as product evidence, distinguish product defects from harness/environment failures, and convert each real manual finding into the narrowest systemic regression invariant. Before owner handoff, perform a short "test it like Rob" pass and provide only the smallest deterministic owner-review cases.

---

# 28. Adoption Guidance

This file should become a reusable QA authority after the current active work is safely closed.

Recommended integration points:

- repository `AGENTS.md`: short reference to `RobQAPass.md`;
- preflight instructions: require QA-tier classification;
- implementation plans: list selected QA tier and protected contracts;
- handoffs: use the required RobQAPass fields;
- owner visual-acceptance contract: point to the manual-product sections of this file.

Do not duplicate the full document into every instruction file.

Do not create another QA framework around it.

This document **is the gate**.

Future refinements should come from repeated real owner behavior or demonstrated gaps—not from adding process for its own sake.
