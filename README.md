robboles.com

Professional portfolio, technical publication platform, and software engineering laboratory by Robert Boles.

Live site: https://robboles.com

Overview

This repository powers robboles.com, a static website focused on software quality, automation, engineering leadership, and independent product development.

The site combines long-form technical writing, interactive resources, case studies, and production-quality engineering practices without relying on a traditional CMS or backend.

What You'll Find
QA Field Guide

Practical guidance on:

QA strategy
Release readiness
Risk-based testing
Automation
Metrics
Engineering leadership
Learning Lab

Evergreen notes, experiments, and technical deep dives covering software engineering and quality.

Automation Cookbook

Patterns, examples, and reusable techniques for building maintainable automation systems.

Projects

Engineering case studies including:

Vox Mana
Test Case Generator
Additional independent software projects
Search

A dependency-free search experience powered by a local JSON index.

Technical Highlights
Static HTML, CSS, and JavaScript
No server-side code
No database
No CMS
Accessible, responsive design
GitHub Pages deployment
Local search
RSS and Atom feeds
XML sitemap
Structured metadata
Automated validation and regression tests
Local Development

Clone the repository and start a local server:

python -m http.server 8080

Open:

http://localhost:8080
Repository Structure
about/
articles/
assets/
automation-cookbook/
field-kit/
learning-lab/
magic-math/
posts/
projects/
qa-field-guide/
search/
tests/
Testing

Run the automated validation suite:

npm test
Design Goals

The site emphasizes:

Fast loading
Accessibility
Searchability
Long-term maintainability
Static deployment
Clear technical communication
Live Website

https://robboles.com

License

Commit Authorship

Robert Boles is the sole author. Do not add `Co-authored-by:` trailers to commits.

Run `npm run install-hooks` after cloning to enable the tracked commit-message hook. The hook rejects every co-author trailer before Git creates the commit.
