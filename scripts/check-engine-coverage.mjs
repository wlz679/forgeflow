#!/usr/bin/env node
// P53: NEW check-engine-coverage.mjs — closes silent 302 to home for retired
// slug redirects (Agent B P1 #7). Mirrors P49 pattern: dynamic tsx subprocess
// loads tools + engines registry, asserts every tool.slug has a registered
// engine. Any mismatch throws + exit 1.
//
// Detection:
//   - missing: tool.slug in src/data/tools/ but no engine registered
//   - orphans: engine registered but no ToolMeta entry (would 302 to home)
// Either case fails the build.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');

// Windows path adaptation: ESM imports require file:// URLs on Windows
// (absolute paths starting with drive letter like D:\ are misinterpreted
// as URL protocol schemes). Convert ROOT to file:// URL for inline TS imports.
const ROOT_URL = 'file://' + ROOT.replace(/\\/g, '/');

// Spawn a tsx subprocess with runner script (mirror check-engine-count pattern).
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-coverage-'));
const runnerPath = path.join(tmpDir, 'runner.ts');

const runnerScript = `
import { tools } from '${ROOT_URL}/src/data/tools/index.ts';
import '${ROOT_URL}/src/engines/index.ts';
import { getAllEngines, getEngine } from '${ROOT_URL}/src/core/engines/registry.ts';

// Layer 1: every tool.slug must have a registered engine.
const missing = [];
for (const tool of tools) {
  if (!getEngine(tool.slug)) {
    missing.push(tool.slug);
  }
}
if (missing.length) {
  throw new Error('Missing engine registrations for slugs: ' + missing.join(', '));
}

// Layer 2: every registered engine must have a ToolMeta entry (orphan = silent 302 to home).
const toolsBySlug = new Set(tools.map(t => t.slug));
const allEngines = getAllEngines();
const orphans = [];
for (const engine of allEngines) {
  if (!toolsBySlug.has(engine.slug)) {
    orphans.push(engine.slug);
  }
}
if (orphans.length) {
  throw new Error('Engine registered but no ToolMeta entry: ' + orphans.join(', '));
}

console.log(JSON.stringify({ ok: true, engines: allEngines.length, tools: tools.length }));
`;

fs.writeFileSync(runnerPath, runnerScript, 'utf8');

import { spawnSync } from 'node:child_process';
const tsxBin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
const result = spawnSync(tsxBin, [runnerPath], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

fs.rmSync(tmpDir, { recursive: true, force: true });

if (result.status !== 0) {
  console.error('[check-engine-coverage] FAIL:');
  if (result.stdout) console.error('stdout:', result.stdout);
  if (result.stderr) console.error('stderr:', result.stderr);
  process.exit(1);
}
console.log(result.stdout.trim());
process.exit(0);