#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'assets', 'data', 'site-config.json');
const EXCLUDED_ROOT_DIRS = new Set([
  '.git',
  '.codex',
  '.claude',
  'docs',
  'node_modules',
  'tests',
]);

function readConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!/^\d{8}[a-z]$/.test(config.asset_version)) {
    throw new Error('site-config.json asset_version must use YYYYMMDD plus one lowercase release letter');
  }
  if (!Array.isArray(config.versioned_assets) || config.versioned_assets.length === 0) {
    throw new Error('site-config.json versioned_assets must be a non-empty array');
  }

  const seen = new Set();
  for (const asset of config.versioned_assets) {
    if (typeof asset !== 'string' || !/^assets\/(?:css|js)\/[a-z0-9./-]+$/.test(asset)) {
      throw new Error(`invalid versioned asset path: ${asset}`);
    }
    if (seen.has(asset)) throw new Error(`duplicate versioned asset path: ${asset}`);
    seen.add(asset);
    if (!fs.existsSync(path.join(ROOT, ...asset.split('/')))) {
      throw new Error(`versioned asset does not exist: ${asset}`);
    }
  }

  return config;
}

function listHtmlFiles(dir = ROOT) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === ROOT && EXCLUDED_ROOT_DIRS.has(entry.name)) continue;
      if (full === path.join(ROOT, 'assets', 'vendor')) continue;
      files.push(...listHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files.sort();
}

function assetPathFromReference(reference) {
  const withoutHash = reference.split('#', 1)[0];
  const withoutQuery = withoutHash.split('?', 1)[0];
  const marker = withoutQuery.indexOf('assets/');
  return marker === -1 ? null : withoutQuery.slice(marker);
}

function applyVersionToHtml(html, config) {
  const protectedAssets = new Set(config.versioned_assets);
  let referencesUpdated = 0;
  const output = html.replace(/((?:href|src)=["'])([^"']+)(["'])/g, (match, prefix, reference, suffix) => {
    const assetPath = assetPathFromReference(reference);
    if (!assetPath || !protectedAssets.has(assetPath)) return match;

    const hashIndex = reference.indexOf('#');
    const hash = hashIndex === -1 ? '' : reference.slice(hashIndex);
    const queryIndex = reference.indexOf('?');
    const endOfBase = queryIndex === -1
      ? (hashIndex === -1 ? reference.length : hashIndex)
      : queryIndex;
    const nextReference = `${reference.slice(0, endOfBase)}?v=${config.asset_version}${hash}`;
    if (nextReference === reference) return match;
    referencesUpdated += 1;
    return `${prefix}${nextReference}${suffix}`;
  });

  return { output, referencesUpdated };
}

function syncAssetVersions({ check = false } = {}) {
  const config = readConfig();
  const changedFiles = [];
  let changedReferences = 0;

  for (const file of listHtmlFiles()) {
    const before = fs.readFileSync(file, 'utf8');
    const { output, referencesUpdated } = applyVersionToHtml(before, config);
    if (output === before) continue;
    changedFiles.push(path.relative(ROOT, file));
    changedReferences += referencesUpdated;
    if (!check) fs.writeFileSync(file, output, 'utf8');
  }

  return { config, changedFiles, changedReferences };
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  const unknownArgs = process.argv.slice(2).filter((arg) => arg !== '--check');
  if (unknownArgs.length) {
    console.error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
    process.exit(2);
  }

  try {
    const result = syncAssetVersions({ check });
    if (check && result.changedFiles.length) {
      console.error(
        `Asset versions are stale in ${result.changedFiles.length} file(s):\n` +
        result.changedFiles.map((file) => `- ${file}`).join('\n')
      );
      process.exit(1);
    }
    const verb = check ? 'verified' : 'updated';
    console.log(
      `Asset version ${result.config.asset_version}: ${verb} ${result.changedReferences} reference(s) ` +
      `across ${result.changedFiles.length} file(s).`
    );
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

module.exports = {
  CONFIG_PATH,
  ROOT,
  applyVersionToHtml,
  assetPathFromReference,
  listHtmlFiles,
  readConfig,
  syncAssetVersions,
};
