# Robert Boles — QA Authority + Builder Laboratory Site

This is a fully static website you can drop into a GitHub repository and host with GitHub Pages.

No build step is required.
No CMS is required.
No Node, npm, bundler, database, or server code is required.

## What is included

- Home page
- About page
- QA Field Guide landing page
- Automation Cookbook landing page
- Learning Lab landing page
- Projects landing page
- 4 project case-study pages
- 8 starter article pages
- All Articles page
- Search page powered by local JSON
- RSS feed
- Sitemap
- 404 page
- Responsive navigation
- Terminal-inspired light theme with self-hosted fonts (IBM Plex Sans, Space Grotesk, JetBrains Mono)
- GitHub Pages `.nojekyll` file
- Codex-friendly `AGENTS.md`
- Article and project templates

## Recommended GitHub Pages setup

Use one of these options:

### Option A: User site

Create a repository named:

    <your-github-username>.github.io

Put these files in the repository root.

The site will publish at:

    https://<your-github-username>.github.io/

### Option B: Project site

Create any repository name, such as:

    robboles-site

Put these files in the repository root.

The site will publish at:

    https://<your-github-username>.github.io/robboles-site/

This package uses relative links so it should work as either a user site or a project site.

## Publishing from GitHub

1. Push all files to the repository.
2. Go to repository Settings.
3. Open Pages.
4. Choose Deploy from a branch.
5. Choose the `main` branch and `/root` folder.
6. Save.

## Local preview

From the site folder, run:

    python -m http.server 8080

Then open:

    http://localhost:8080

The search page uses `fetch`, so previewing through a local server is better than opening the files directly in the browser.

## Things to customize first

Search for these values and replace them:

- `hello@robboles.com`
- `https://robboles.com`
- Any future LinkedIn, GitHub, newsletter, or contact links you want to add

Files to update when you buy the domain:

- `sitemap.xml`
- `robots.txt`
- `feed.xml`
- optional: add a `CNAME` file containing your custom domain, such as `robboles.com`

## Editing content

Article pages live in:

    posts/<slug>/index.html

Article metadata for search lives in:

    assets/data/posts.json

Project pages live in:

    projects/<slug>/index.html

Project metadata lives in:

    assets/data/projects.json

Templates live in:

    content/templates/

## Content safety rule

Keep employer and client details generalized. Do not publish private system names, internal dashboards, non-public metrics, vendor details, screenshots, claims data, customer data, or anything that could expose confidential work.
