#!/usr/bin/env node
// P155: sync-pricing bot 的 "Open or update Pull Request" 步骤守卫。
//
// 为什么存在这个守卫
// ------------------
// 2026-10-26 的 schedule run（run 40322393158 / job 121570327819）里，
// 同步、重新生成、提交、推分支全绿，唯独 "Open or update Pull Request"
// 挂了 —— 33 秒后 "Process completed with exit code 1."。
//
// 失败原因至今取不到，因为：
//   - GitHub Actions 的 job log 需要登录态；本机 gh 未登录、API 无 token；
//   - 公开 API 只能证明"分支推了、PR 没建"（bot 分支 chore/pricing-sync
//     存在、领先 master 1 个提交，而 head=chore/pricing-sync 的 PR 数量 = 0）。
//
// 所以旧写法有两处结构缺陷，它们让"下一次失败同样查不出原因"：
//
//   1. `gh pr view "$BOT_BRANCH" ... 2>/dev/null` —— stderr 被直接丢掉。
//      gh 的真实报错（403 / 权限 / 配额 / 参数错）一行都不会出现在任何地方，
//      只剩一个裸的 exit code 1。
//   2. 用 `gh pr view` 的退出码当"有没有 PR"的判据。gh 在"没有 PR"和
//      "API 拒绝访问"两种情况下的退出码无法区分，于是"API 报错"会被
//      误判成"没有 PR"，继而走进 `gh pr create`，再撞一次墙。
//
// 这个守卫把这些修复后的性质钉住，防止有人把步骤改回"吞掉 stderr +
// 靠退出码猜"的老形状：
//
//   1. job 必须声明 pull-requests: write（否则 GITHUB_TOKEN 建不了 PR）
//   2. gh 的 stderr 不得被丢进 /dev/null
//   3. 令牌 / 仓库权限诊断必须写进 job summary（summary 在 Actions 页面
//      直接可见，不需要读 log）
//   4. "有没有已存在的 PR" 必须用 API 列表判定，且不得再靠 gh pr view 的退出码
//   5. 建完 PR 必须用 API 回读确认它真的可见，确认不了就非零退出
//   6. 创建失败时必须留下人工可点的 compare 链接（每周的定价同步不能静默丢）
//
// source-only：不依赖构建产物，所以 `pnpm check` 也会跑它。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const WORKFLOW = resolve(root, '.github', 'workflows', 'sync-pricing.yml');
const STEP_NAME = 'Open or update Pull Request';

function workflowText(): string {
  assert.ok(existsSync(WORKFLOW), `${relative(root, WORKFLOW)} does not exist`);
  return readFileSync(WORKFLOW, 'utf8');
}

/**
 * 取出指定 step 的 `run: |` 脚本正文。
 *
 * 不用 YAML 解析器：这个仓库的 node_modules 没有把 `yaml` 提升到顶层
 * （只在 .pnpm 里），测试里 import 会 ERR_MODULE_NOT_FOUND。按缩进切块
 * 足够稳 —— run 正文缩进 10 空格，下一个 step 出现在 6 空格 + "- "。
 */
function extractRunScript(yaml: string, stepName: string): string {
  const nameIdx = yaml.indexOf(`- name: ${stepName}`);
  assert.ok(nameIdx >= 0, `step "${stepName}" not found in ${relative(root, WORKFLOW)}`);

  const runIdx = yaml.indexOf('run: |', nameIdx);
  assert.ok(runIdx > nameIdx, `step "${stepName}" has no "run: |" block`);

  const bodyStart = yaml.indexOf('\n', runIdx) + 1;
  const out: string[] = [];
  for (const line of yaml.slice(bodyStart).split('\n')) {
    // 新 step（6 空格 + "- "）或新的 job 级 key（<=6 空格）都结束本块。
    if (/^ {0,6}(-|[A-Za-z_])/.test(line)) break;
    out.push(line);
  }
  return out.join('\n');
}

function prStepScript(): string {
  return extractRunScript(workflowText(), STEP_NAME);
}

/**
 * 脚本里真正会被执行的行（去掉整行注释）。
 *
 * 这两条判据针对的是"步骤实际怎么跑"，不是"文档怎么写"——步骤里的说明性
 * 注释本来就要提到被移除的老写法（`2>/dev/null`、`gh pr view`），
 * 把注释算进来会让守卫红在自己的散文上。
 */
function executableLines(script: string): string[] {
  return script
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));
}

test('sync job asks for pull-request write permission', () => {
  const yaml = workflowText();
  const perms = yaml.match(/permissions:\n([\s\S]*?)\n\s{4}\S/);
  assert.ok(perms, 'sync-pricing.yml has no job-level `permissions:` block');
  assert.match(
    perms[1],
    /pull-requests:\s*write/,
    'the sync job must request `pull-requests: write` — without it GITHUB_TOKEN ' +
      'cannot open a pull request and the weekly pricing sync dies at this step.',
  );
});

test('the PR step does not discard gh stderr into /dev/null', () => {
  const offenders = executableLines(prStepScript()).filter(
    (line) => /\bgh\s/.test(line) && /2>\/dev\/null/.test(line),
  );
  assert.deepEqual(
    offenders,
    [],
    'the PR step must not send gh output to /dev/null — that is exactly why the ' +
      '2026-10-26 failure was undiagnosable (bare "exit code 1", no reason).\n' +
      offenders.map((l) => `    ${l}`).join('\n'),
  );
});

test('the PR step writes token and repo permission diagnostics into the job summary', () => {
  const script = prStepScript();
  assert.match(
    script,
    /actions\/permissions\/workflow/,
    'the PR step must query repos/$REPO/actions/permissions/workflow — its ' +
      'can_approve_pull_request_reviews flag is the repo-level switch that decides ' +
      'whether GITHUB_TOKEN may create pull requests at all.',
  );
  assert.match(
    script,
    /GITHUB_STEP_SUMMARY/,
    'the diagnostics must be written to $GITHUB_STEP_SUMMARY — the summary is ' +
      'visible on the Actions run page, while the raw job log needs a signed-in session.',
  );
});

test('the PR step decides "does a PR already exist" through the API, not gh pr view exit codes', () => {
  const script = prStepScript();
  assert.match(
    script,
    /pulls\?state=open&head=/,
    'the existence probe must list PRs through the API — the API returns an empty ' +
      'array (exit 0) for "no PR" and a non-zero exit for a real API error, so the ' +
      'two cases are finally distinguishable.',
  );
  const usesPrView = executableLines(script).filter((line) => /\bgh pr view\b/.test(line));
  assert.deepEqual(
    usesPrView,
    [],
    'the PR step must not use `gh pr view` as the existence probe: its exit code ' +
      'cannot tell "no PR" from "API refused", which sends real API failures down ' +
      'the create path.',
  );
});

test('the PR step filters PRs by owner:branch, not owner/repo:branch', () => {
  const script = prStepScript();
  // Measured against the live API on 2026-10-27: `head=wlz679/forgeflow:branch`
  // does NOT error — it returns HTTP 200 with an empty array, i.e. it silently
  // claims "no PR exists" every single time, and the step would then walk into
  // `gh pr create` and die on "a pull request already exists". The `head`
  // filter is `owner:branch`, so the owner half must be
  // $GITHUB_REPOSITORY_OWNER — never $REPO (which is `owner/repo`).
  const code = executableLines(script);
  assert.ok(
    code.some((line) => /GITHUB_REPOSITORY_OWNER/.test(line)),
    'the PR step must build the head filter from $GITHUB_REPOSITORY_OWNER — the ' +
      '`head` query parameter is `owner:branch`, not `owner/repo:branch`.',
  );
  assert.ok(
    !code.some((line) => /head=\$REPO:/.test(line)),
    'the PR step must not build the head filter from $REPO — that yields ' +
      '`owner/repo:branch`, which the API accepts and answers with an EMPTY ' +
      'array, so the probe would silently report "no PR" forever.',
  );
});

test('the PR step verifies through the API that the pull request really exists', () => {
  const script = prStepScript();
  // NOTE: 断言的是「读取动作」本身，不是 `VERIFY_URL` 这个标识符 ——
  // 变异台子实测：只删掉 VERIFY_URL 的赋值行、留下
  // `if [ -z "$VERIFY_URL" ]` 时，标识符照样出现在脚本里，
  // 查标识符的判据会恒绿，守卫等于没有牙。
  assert.match(
    script,
    /VERIFY_URL="\$\(gh api[^\n]*pulls\?state=open/,
    'the PR step must read the PR back through the API after create/update — ' +
      'reporting success on the create call\'s own output is trusting a string, not a state.',
  );
  assert.match(
    script,
    /exit 1/,
    'the PR step must exit non-zero when the PR cannot be confirmed — a silent ' +
      'success would let the weekly pricing sync rot without anyone noticing.',
  );
});

test('the PR step leaves a manual pull-request link when creation fails', () => {
  const script = prStepScript();
  assert.match(
    script,
    /\/compare\/master\.\.\./,
    'when `gh pr create` fails, the branch IS already pushed — the step must leave ' +
      'a compare link in the job summary so a human can open the PR in one click ' +
      'instead of the week\'s pricing delta being lost silently.',
  );
});
