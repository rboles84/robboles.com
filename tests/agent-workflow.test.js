const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const SKILLS = ['robdev', 'robqa', 'robanalyst', 'robscrum'];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('repo-local Rob workflow skills have valid metadata and live authority links', () => {
  for (const skill of SKILLS) {
    const file = `.agents/skills/${skill}/SKILL.md`;
    const text = read(file);
    assert.match(text, /^---\r?\nname: [a-z]+\r?\ndescription: .+\r?\n---/u, `${file} metadata`);
  }

  assert.match(read('.agents/skills/robdev/SKILL.md'), /RobDevPass/u);
  assert.match(read('.agents/skills/robqa/SKILL.md'), /RobQAPass/u);
  assert.match(read('.agents/skills/robanalyst/SKILL.md'), /RobAnalystPass/u);
  assert.match(read('.agents/skills/robscrum/SKILL.md'), /RobScrumPass/u);
});

test('workflow authorities remain singular and skills route to them rather than copying them', () => {
  const authorities = ['RobDevPass.md', 'RobQAPass.md', 'RobAnalystPass.md', 'RobScrumPass.md'];
  for (const authority of authorities) {
    assert.ok(fs.existsSync(path.join(ROOT, authority)), `${authority} exists`);
  }

  const devGuide = read('.agents/skills/robdev/robdev.md');
  const qaGuide = read('.agents/skills/robqa/robqa.md');
  assert.ok(devGuide.length < read('RobDevPass.md').length, 'RobDev guide stays smaller than its authority');
  assert.ok(qaGuide.length < read('RobQAPass.md').length, 'RobQA guide stays smaller than its authority');

  assert.doesNotMatch(devGuide, /^# RobDevPass/mu, 'RobDev guide does not clone its authority');
  assert.doesNotMatch(qaGuide, /^# RobQAPass/mu, 'RobQA guide does not clone its authority');
});

test('role and generator routing is discoverable from the workflow entry points', () => {
  const publicRoutes = [
    'AGENTS.md',
    '.agents/skills/robdev/SKILL.md',
    '.agents/skills/robdev/robdev.md',
    '.agents/skills/robqa/SKILL.md',
    '.agents/skills/robqa/robqa.md',
    '.agents/skills/robanalyst/SKILL.md',
    '.agents/skills/robscrum/SKILL.md',
  ];
  const optionalLocalRoutes = [
    '.codex/prompts/preflight.md',
    '.codex/prompts/plan.md',
    '.codex/prompts/board.md',
    '.codex/prompts/test.md',
    '.codex/prompts/writing.md',
    '.codex/prompts/json.md',
    'docs/reference/workflow.md',
    'docs/handoffs/templates/agent-handoff-template.md',
  ].filter((file) => fs.existsSync(path.join(ROOT, file)));
  const routes = [...publicRoutes, ...optionalLocalRoutes].map(read).join('\n');

  assert.match(routes, /RobAnalystPass/u);
  assert.match(routes, /RobScrumPass/u);
  assert.match(routes, /RobModelRouting/u);
  assert.match(routes, /content-index\.json/u);
  assert.match(routes, /generated projections/u);
});

test('model routing preserves bounded Luna work and guarded Sol escalation', () => {
  const routing = read('RobModelRouting.md');
  assert.match(routing, /gpt-5\.6-luna/u);
  assert.match(routing, /cannot make factual, editorial, scope, or QA conclusions/u);
  assert.match(routing, /gpt-5\.6-terra/u);
  assert.match(routing, /gpt-5\.6-sol/u);
  assert.match(routing, /Record one concise reason/u);
  assert.match(routing, /at most two agents/u);
});
