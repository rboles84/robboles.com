const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'content-index.json'), 'utf8'));
const QA_FIELD_GUIDE_SIGNATURE = '<p class="promise">Better tests. Better releases. Less theater.</p>';

function routeToFile(route) {
  const relative = route.endsWith('/') ? path.join(route.slice(1), 'index.html') : route.slice(1);
  return path.join(ROOT, relative);
}

test('every QA Field Guide post uses the exact green-bar sign-off', () => {
  const failures = [];

  for (const record of MANIFEST.records) {
    if (record.content_type !== 'post' || record.section !== 'QA Field Guide') continue;

    const file = routeToFile(record.route);
    const html = fs.readFileSync(file, 'utf8');

    if (!html.includes(QA_FIELD_GUIDE_SIGNATURE)) {
      failures.push(`${record.route} is missing the exact QA Field Guide signature`);
    }

    if (/Better tests\. Better releases\. Less (?!theater\.)/u.test(html)) {
      failures.push(`${record.route} has a mutated QA Field Guide signature`);
    }
  }

  assert.deepEqual(failures, []);
});

test('Field Kit downloads point to standalone artifact files, not wrapper index pages', () => {
  const failures = [];

  for (const record of MANIFEST.records) {
    if (record.content_type !== 'field_kit') continue;

    const wrapper = routeToFile(record.route);
    const wrapperDir = path.dirname(wrapper);
    const html = fs.readFileSync(wrapper, 'utf8');
    const downloads = [...html.matchAll(/href="([^"]+)"[^>]*download="([^"]+)"/g)];

    for (const [, href] of downloads) {
      const resolved = path.resolve(wrapperDir, href);
      const relativeHref = href.replace(/\\/g, '/');

      if (path.basename(relativeHref).toLowerCase() === 'index.html') {
        failures.push(`${record.route} downloads its wrapper page: ${href}`);
      }

      if (!resolved.startsWith(wrapperDir) || !fs.existsSync(resolved)) {
        failures.push(`${record.route} download does not resolve to a real local artifact: ${href}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});
