#!/usr/bin/env node
// P164: 定价 bot 的 PAT 契约守卫。
//
// 为什么存在这个守卫
// ------------------
// 2026-11-02 的 schedule run 建出了 PR #4（head 383feb41），但它的 CI
// run 41377087077 的结论是 `action_required` 且 **jobs = 0** —— run 被建
// 出来了，却停在「等 maintainer 批准」，CI 一步都没跑。
//
// 根因：bot 用的是内置 `GITHUB_TOKEN`。以 GITHUB_TOKEN 推上去的分支，
// 它自己开的 PR 触发的 `pull_request` workflow run 会被引擎当成「不可信
// 来源」⇒ 需要人工批准才跑。workflow 文件自己的头部注释也写着
//「a commit pushed with GITHUB_TOKEN does NOT trigger a CI run」。
//
// 修法：改用个人访问令牌（PAT）。以 PAT 推的分支不被这样对待，同一个
// `pull_request` 事件会自己把 CI 跑起来。
//
// 但「改用 PAT」这件事本身有**六个各自独立的失败模式**，其中至少两个
// 是「改了一半看起来对了」的形状 —— 只查 `GH_TOKEN` 的守卫会绿，而故障
// 原样存在：
//
//   F1  gh 用的还是 GITHUB_TOKEN            ⇒ PR 的 CI 永远不自动跑
//   F2  gh 用 PAT，但 push 仍用 GITHUB_TOKEN ⇒ 分支还是 GITHUB_TOKEN push
//                                          ⇒ 同一个故障从另一扇门进来
//   F3  没有回退（缺 secret 就跳过）        ⇒ 每周同步静默停摆，数据管线饿死
//   F4  不报「用的哪种 token」              ⇒ 「CI 为什么没跑」再次不可诊断
//                                          （2026-10-26 失败不可查的同款教训）
//   F5  push 用 PAT 但 commit 作者仍是
//       github-actions[bot]                ⇒ 「谁推的」与「谁写的」不是同一个人
//   F6  workflow 里写死了令牌字面量         ⇒ 令牌进 git 历史
//
// source-only：不依赖构建产物，所以 `pnpm check` 也会跑它。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const WORKFLOW = resolve(root, '.github', 'workflows', 'sync-pricing.yml');

function workflowText(): string {
  assert.ok(existsSync(WORKFLOW), `${relative(root, WORKFLOW)} does not exist`);
  return readFileSync(WORKFLOW, 'utf8');
}

/**
 * 取出 job 级 `env:` 块。
 *
 * env 的**内容**缩进 6 空格，块本身在 4 空格；下一个 job 级 key
 * （`    steps:`）也是 4 空格 ⇒ 以「缩进 < 6」或「以 `- ` 开头」为结束。
 */
function jobEnvBlock(): string {
  const yaml = workflowText();
  const envIdx = yaml.indexOf('\n    env:\n');
  assert.ok(envIdx >= 0, 'sync-pricing.yml has no job-level `env:` block');
  const start = envIdx + '\n    env:\n'.length;
  const out: string[] = [];
  for (const line of yaml.slice(start).split('\n')) {
    if (line.trim() === '') {
      out.push(line);
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (indent < 6 || line.trimStart().startsWith('- ')) break;
    out.push(line);
  }
  return out.join('\n');
}

/**
 * 取出某个 step 的 `run: |` 正文（缩进 10 空格，下一个 step 在 6 空格 + "- "）。
 */
function extractRunScript(stepName: string): string {
  const yaml = workflowText();
  const nameIdx = yaml.indexOf(`- name: ${stepName}`);
  assert.ok(nameIdx >= 0, `step "${stepName}" not found in ${relative(root, WORKFLOW)}`);

  const runIdx = yaml.indexOf('run: |', nameIdx);
  assert.ok(runIdx > nameIdx, `step "${stepName}" has no "run: |" block`);

  const bodyStart = yaml.indexOf('\n', runIdx) + 1;
  const out: string[] = [];
  for (const line of yaml.slice(bodyStart).split('\n')) {
    if (/^ {0,6}(-|[A-Za-z_])/.test(line)) break;
    out.push(line);
  }
  return out.join('\n');
}

/** actions/checkout 步骤的 `with:` 块正文。 */
function checkoutWithBlock(): string {
  const yaml = workflowText();
  const useIdx = yaml.indexOf('uses: actions/checkout@v4');
  assert.ok(useIdx >= 0, 'sync-pricing.yml has no actions/checkout@v4 step');
  const withIdx = yaml.indexOf('with:', useIdx);
  assert.ok(withIdx > useIdx, 'the checkout step has no `with:` block');
  const bodyStart = yaml.indexOf('\n', withIdx) + 1;
  const out: string[] = [];
  for (const line of yaml.slice(bodyStart).split('\n')) {
    if (/^ {0,6}(-|[A-Za-z_])/.test(line)) break;
    out.push(line);
  }
  return out.join('\n');
}

/** 真正会被执行的行（去掉整行注释）—— 注释里提到旧写法不算。 */
function executableLines(script: string): string[] {
  return script
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));
}

test('F1: gh 用的令牌优先是 PAT，且保留 GITHUB_TOKEN 回退', () => {
  const env = jobEnvBlock();
  const ghToken = env.match(/GH_TOKEN:\s*(.+)/);
  assert.ok(ghToken, 'the job env block has no GH_TOKEN entry');
  assert.match(
    ghToken[1],
    /secrets\.PRICING_BOT_PAT/,
    'GH_TOKEN must prefer secrets.PRICING_BOT_PAT — with the built-in GITHUB_TOKEN the ' +
      'bot PR\'s `pull_request` run lands in `action_required` with zero jobs ' +
      '(measured 2026-11-02 on PR #4 / run 41377087077).',
  );
  assert.match(
    ghToken[1],
    /secrets\.GITHUB_TOKEN/,
    'GH_TOKEN must keep secrets.GITHUB_TOKEN as a fallback — the weekly pricing sync ' +
      'must not stop working just because a PAT secret has not been created yet.',
  );
});

test('F2: push 用的凭证也必须是 PAT（gh 用 PAT 但 push 用 GITHUB_TOKEN 仍是同一个故障）', () => {
  const withBlock = checkoutWithBlock();
  const token = withBlock.match(/token:\s*(.+)/);
  assert.ok(token, 'the checkout step has no `token:` entry');
  assert.match(
    token[1],
    /secrets\.PRICING_BOT_PAT/,
    'the checkout `token:` must be secrets.PRICING_BOT_PAT — actions/checkout persists ' +
      'the extraheader credential the push uses, so with the default `github.token` the ' +
      'branch is a GITHUB_TOKEN push even when `gh` holds a PAT, and the PR\'s CI ' +
      'lands in `action_required` again.',
  );
  assert.match(
    token[1],
    /github\.token/,
    'the checkout `token:` must keep `github.token` as a fallback so the sync still ' +
      'runs without the PAT secret.',
  );
});

test('F3: 缺 PAT secret 时不得跳过同步（回退必须是回退，不是开关）', () => {
  const yaml = workflowText();
  // 任何把整个 job / 步骤绑在 secret 上的写法，都会让「secret 没建」变成
  // 「每周定价同步静默停摆」—— 那比 CI 不自动跑更严重。
  const gates = yaml
    .split('\n')
    .filter((line) => /^\s*(if|needs|continue-on-error):/.test(line))
    .filter((line) => /PRICING_BOT_PAT/.test(line));
  assert.deepEqual(
    gates,
    [],
    'no job/step condition may depend on PRICING_BOT_PAT — a missing secret must ' +
      'degrade to GITHUB_TOKEN, not skip the weekly sync.\n' +
      gates.map((l) => `    ${l.trim()}`).join('\n'),
  );
});

test('F4: job summary 必须报出用的是哪种 token，并说清它对 PR 的 CI 意味着什么', () => {
  const script = extractRunScript('Open or update Pull Request');
  assert.match(
    script,
    /GH_TOKEN_KIND/,
    'the PR step must report which token kind it is using — "the bot PR\'s CI did ' +
      'not run" is undiagnosable without it (the same lesson as the 2026-10-26 ' +
      'failure, which produced a bare exit code and no reason).',
  );
  assert.match(
    script,
    /action_required/,
    'the summary must name `action_required` — that is the literal state a ' +
      'GITHUB_TOKEN-pushed PR\'s CI run gets stuck in, and it is what the reader ' +
      'has to recognise in order to act.',
  );
  assert.match(
    script,
    /PRICING_BOT_PAT/,
    'the summary must name the secret to add (PRICING_BOT_PAT) so the fix is ' +
      'one click away instead of a guess.',
  );
});

test('F5: 用 PAT 推分支时 commit 作者必须是 PAT 的身份，不是 github-actions[bot]', () => {
  const script = extractRunScript('Commit pricing sync to bot branch');
  const code = executableLines(script);
  assert.ok(
    code.some((line) => /gh api user/.test(line)),
    'the commit step must resolve the pushing identity through `gh api user` — a PAT ' +
      'push whose commit is still authored by `github-actions[bot]` leaves "who pushed ' +
      'this" and "who authored this" as two different principals.',
  );
  assert.ok(
    code.some((line) => /git config user\.name/.test(line)),
    'the commit step must set the author from the resolved identity, not from a ' +
      'hard-coded literal.',
  );
  // 硬编码的作者名只能作为「没有 PAT 时的默认」，不能是唯一取值
  const hardcoded = code.filter((line) => /git config user\.name\s+"?github-actions\[bot\]/.test(line));
  assert.deepEqual(
    hardcoded,
    [],
    'the commit step must not hard-code `github-actions[bot]` as the author — the ' +
      'default belongs in a variable that the PAT path overrides.\n' +
      hardcoded.map((l) => `    ${l.trim()}`).join('\n'),
  );
});

test('F7: GH_TOKEN_KIND 必须由 secret 推导出来（否则 summary 永远显示 unknown）', () => {
  // 这一条是 F4 的上游：F4 只管「脚本里提到了 GH_TOKEN_KIND」，
  // 但如果 job env 里根本没有这个变量，脚本里的 ${GH_TOKEN_KIND:-unknown}
  // 会永远落到 unknown ⇒ summary 说的还是「不知道用的哪种 token」。
  // 只查脚本的守卫在这里会绿，而「CI 为什么没跑」再次不可诊断。
  const env = jobEnvBlock();
  const kind = env.match(/GH_TOKEN_KIND:\s*(.+)/);
  assert.ok(kind, 'the job env block has no GH_TOKEN_KIND entry');
  assert.match(
    kind[1],
    /secrets\.PRICING_BOT_PAT/,
    'GH_TOKEN_KIND must be derived from secrets.PRICING_BOT_PAT — a hard-coded ' +
      '"pat" would claim a PAT is in use when it is not, and a hard-coded ' +
      '"github-token" would hide the PAT case.',
  );
});

test('F6: workflow 里不得出现令牌字面量', () => {
  const yaml = workflowText();
  const literals = yaml.match(/\b(ghp_|github_pat_|gho_|ghu_|ghs_)[A-Za-z0-9_]+/g) ?? [];
  assert.deepEqual(
    literals,
    [],
    'the workflow must never contain a token literal — tokens belong in repository ' +
      'secrets, and a literal here would be committed to git history.\n' +
      literals.map((l) => `    ${l}`).join('\n'),
  );
});
