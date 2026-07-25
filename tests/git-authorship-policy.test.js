const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const validator = path.join(repoRoot, "scripts", "validate-commit-message.js");

function validateMessage(message) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "commit-message-policy-"));
  const messagePath = path.join(tempDir, "COMMIT_EDITMSG");
  fs.writeFileSync(messagePath, message, "utf8");

  try {
    return spawnSync(process.execPath, [validator, messagePath], {
      cwd: repoRoot,
      encoding: "utf8",
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("commit-message policy rejects any co-author trailer", () => {
  const result = validateMessage("Add site guard\n\nCo-authored-by: Someone Else <other@example.com>\n");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not use co-author trailers/i);
});

test("commit-message policy rejects co-author trailers regardless of casing or indentation", () => {
  const result = validateMessage("Add site guard\n\n  co-AUTHORED-by: Someone Else <other@example.com>\n");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Robert Boles is the sole author/i);
});

test("commit-message policy allows ordinary commit prose without co-author trailers", () => {
  const result = validateMessage("Document AI-related release risks without attribution metadata\n");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});
