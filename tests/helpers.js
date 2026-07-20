'use strict';
/* Shared, dependency-free helpers for the test suite. No npm packages —
   only Node built-ins (fs, path). Keep this file DOM-free and pure so it
   stays trivially requirable from any test. */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/* Directories that are either private (gitignored, may not exist in every
   checkout), scaffolding (not a real page), or not part of the deployed
   site, and so are excluded from sitewide crawls. */
const EXCLUDE_DIRS = new Set(['docs', '.codex', '.claude', 'content', 'node_modules', 'tests', '.git']);

function listHtmlFiles(dir = ROOT) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === ROOT && EXCLUDE_DIRS.has(entry.name)) continue;
      out.push(...listHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

/* Extracts every href="" / src="" value from an HTML/XML string. Returns
   raw (un-decoded) attribute values. */
function extractRefs(text) {
  const refs = [];
  const re = /(?:href|src)="([^"]*)"/g;
  let m;
  while ((m = re.exec(text))) {
    // Skip JS template-literal interpolation (e.g. href="${scryLink(name)}")
    // found inside inline <script> blocks — that's a runtime-built string,
    // not a static reference this checker can resolve.
    if (m[1].includes('${')) continue;
    refs.push(m[1]);
  }
  return refs;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'");
}

/* Resolves a link found in `fromFile` and returns the absolute filesystem
   path it should point to, or null if the link isn't a local file
   reference this checker can resolve (external, mailto:, bare anchor). */
function resolveLocalTarget(href, fromFile) {
  let clean = decodeEntities(href).split('#')[0].split('?')[0];
  if (!clean) return null; // pure anchor link, e.g. href="#top"
  if (/^(https?:|mailto:|tel:|\/\/)/i.test(clean)) return null;
  // Root-relative ("/assets/...") is site-root-relative, not filesystem-absolute:
  // resolve it against ROOT, not the containing directory. Without this,
  // path.resolve() would read the leading slash as a drive-root path
  // (C:\assets\...) and report every such link as broken. Used by 404.html,
  // which is served at arbitrary URL depths and so cannot use relative paths.
  const base = clean.startsWith('/') ? ROOT : path.dirname(fromFile);
  if (clean.startsWith('/')) clean = '.' + clean;
  let target = path.resolve(base, clean);
  if (clean.endsWith('/')) target = path.join(target, 'index.html');
  else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  } else if (!path.extname(target)) {
    // extension-less path with no trailing slash and no existing dir —
    // still worth checking as-is (could be a bare 404-style route)
  }
  return target;
}

/* A deliberately minimal well-formedness check: balanced open/close tags,
   in order. Good enough for our own simple, hand-authored RSS/sitemap XML
   (no CDATA, no namespaces beyond the default) without needing an XML
   parser dependency. Throws on the first mismatch. */
function assertWellFormedXml(text, label) {
  const cleaned = text
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9:_-]*)(\s[^>]*)?(\/?)>/g;
  const stack = [];
  let m;
  while ((m = tagRe.exec(cleaned))) {
    const [, closing, name, , selfClose] = m;
    if (closing) {
      const top = stack.pop();
      if (top !== name) {
        throw new Error(
          `${label}: mismatched closing tag </${name}> (expected </${top || '(nothing open)'}>) ` +
          `near "${cleaned.slice(Math.max(0, m.index - 30), m.index + 20)}"`
        );
      }
    } else if (!selfClose) {
      stack.push(name);
    }
  }
  if (stack.length) {
    throw new Error(`${label}: unclosed tag(s): ${stack.join(', ')}`);
  }
}

module.exports = {
  ROOT,
  listHtmlFiles,
  extractRefs,
  decodeEntities,
  resolveLocalTarget,
  assertWellFormedXml,
};
