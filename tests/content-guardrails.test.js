const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'content-index.json'), 'utf8'));
const QA_FIELD_GUIDE_SIGNATURE = '<p class="promise">Better tests. Better releases. Less theater.</p>';
const CURRENT_IDENTITY = 'Quality Engineering &amp; Technology Leader';

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

test('current professional identity is consistent while historical career language is retained', () => {
  const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const about = fs.readFileSync(path.join(ROOT, 'about', 'index.html'), 'utf8');
  const failures = [];

  if (!home.includes(`I'm Robert Boles — a ${CURRENT_IDENTITY}`)) {
    failures.push('home lede does not use the current identity');
  }
  if (!home.includes(`<div class="role">${CURRENT_IDENTITY} · builder</div>`)) {
    failures.push('home role does not use the current identity and builder label');
  }
  if (!about.includes('"jobTitle": "Quality Engineering & Technology Leader"')) {
    failures.push('About Person schema does not use the current identity');
  }
  if (!about.includes(`I'm Robert Boles — a ${CURRENT_IDENTITY}`)) {
    failures.push('About opening does not use the current identity');
  }
  if (!about.includes('from automation tester to senior SDET and QA architect')) {
    failures.push('About no longer retains the historical career progression');
  }

  const linkedIn = about.indexOf('<a class="button accent" href="https://www.linkedin.com/in/robert-boles-qa/"');
  const github = about.indexOf('<a class="button secondary" href="https://github.com/rboles84"');
  if (linkedIn === -1 || github === -1 || linkedIn > github) {
    failures.push('About does not present LinkedIn first as the primary professional link');
  }

  const authorBioFiles = MANIFEST.records
    .filter((record) => record.content_type === 'post')
    .map((record) => routeToFile(record.route))
    .concat(path.join(ROOT, 'content', 'templates', 'article-template.html'));

  for (const file of authorBioFiles) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes(`<p>${CURRENT_IDENTITY} with 14 years`)) {
      failures.push(`${path.relative(ROOT, file)} author bio does not use the current identity`);
    }
  }

  assert.deepEqual(failures, []);
});
