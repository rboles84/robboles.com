'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  ROOT,
  assetPathFromReference,
  listHtmlFiles,
  readConfig,
  syncAssetVersions,
} = require('../scripts/sync-asset-versions');

function staticReferences(html) {
  return [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map((match) => match[1]);
}

test('site asset-version authority is valid and every configured asset exists', () => {
  const config = readConfig();
  assert.match(config.asset_version, /^\d{8}[a-z]$/);
  assert.equal(new Set(config.versioned_assets).size, config.versioned_assets.length);
  for (const asset of config.versioned_assets) {
    assert.ok(fs.existsSync(path.join(ROOT, ...asset.split('/'))), asset);
  }
});

test('all protected asset references use the one configured cache version', () => {
  const config = readConfig();
  const protectedAssets = new Set(config.versioned_assets);
  const failures = [];
  const foundAssets = new Set();

  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    for (const reference of staticReferences(html)) {
      const assetPath = assetPathFromReference(reference);
      if (!assetPath || !protectedAssets.has(assetPath)) continue;
      foundAssets.add(assetPath);
      if (!reference.includes(`?v=${config.asset_version}`)) {
        failures.push(`${path.relative(ROOT, file)} -> ${reference}`);
      }
    }
  }

  assert.deepEqual(failures, []);
  assert.deepEqual([...foundAssets].sort(), [...protectedAssets].sort());
});

test('asset-version sync is idempotent and leaves page-local release keys independent', () => {
  const result = syncAssetVersions({ check: true });
  assert.deepEqual(result.changedFiles, []);

  const partnerPage = fs.readFileSync(
    path.join(ROOT, 'magic-math', 'partner-isnt-one-mechanic', 'index.html'),
    'utf8'
  );
  assert.match(partnerPage, /partner-four-choices\.css\?v=20260803b/);
  assert.match(partnerPage, /partner-four-choices\.js\?v=20260803b/);
});
