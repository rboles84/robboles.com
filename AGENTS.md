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
4. Add metadata to `assets/data/posts.json`.
5. Link related posts.
6. Confirm the search page still works.

## Design tone

Direct, practical, credible, calm, and useful.
Avoid hype, buzzword-heavy claims, and generic thought-leadership filler.
