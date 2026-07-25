#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  encoding: "utf8",
  stdio: "pipe",
});

if (result.status !== 0) {
  const stderr = result.stderr ? result.stderr.trim() : "unknown error";
  console.error(`Unable to configure Git hooks: ${stderr}`);
  process.exit(result.status ?? 1);
}

console.log("Git hooks configured: core.hooksPath=.githooks");
