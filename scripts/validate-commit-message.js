#!/usr/bin/env node

const fs = require("node:fs");

const commitMessagePath = process.argv[2];

if (!commitMessagePath) {
  console.error("Commit rejected: missing commit message path.");
  process.exit(2);
}

let message;
try {
  message = fs.readFileSync(commitMessagePath, "utf8");
} catch (error) {
  console.error(`Commit rejected: could not read commit message (${error.message}).`);
  process.exit(2);
}

const coAuthorLine = message
  .split(/\r?\n/)
  .find((line) => /^\s*co-authored-by\s*:/i.test(line));

if (coAuthorLine) {
  console.error("Commit rejected: this repository does not use co-author trailers.");
  console.error("Remove the co-author line and commit again. Robert Boles is the sole author.");
  process.exit(1);
}
