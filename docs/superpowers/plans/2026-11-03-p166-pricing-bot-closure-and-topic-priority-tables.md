# P166 Implementation Plan — 定价 bot 闭环 + 主题页「修复优先级表 / 达标清单」试点

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`[-]`) syntax for tracking.

**Goal:** (A) 让每周的定价 bot PR 永远 CI 绿 —— 新模型落地后由 bot 自动做「进不进交互态」的决定（默认排除）；(B) 把主题页 B2 形态落地：基准页做「**修复优先级表**」、指南页做「**达标清单**」，先试点 3 个主题（1 个 B 类 + 1 个 C 类 + 1 个 R 类），跑通形态与守卫后再铺其余 42 个。

**Architecture:**

- **A（定价 bot 闭环）**：新增 `scripts/curate-pricing-models.mjs`（纯 node，零依赖，无 TS 注解），在 `.github/workflows/sync-pricing.yml` 里夹在 `scripts/sync-pricing.mjs` 之后、codegen 之前；它只改 `src/data/ai-pricing-popular.json` 的**排除侧**（新模型 → 默认排除 + 族覆盖 + 剪掉陈旧排除记录与死族），**永不碰策展侧**（策展是人的决定）。守卫把写死的计数（245/44/201/42）换成 **bot 安全形态**：声明值 == 实际值 + 完整划分 + 下限 floor + 「bot 是否被接进 workflow」的接线守卫。
- **B（B2 试点）**：**不改** `src/data/topic-content.ts`（2,900 行 / 980 KB 单文件）—— 它被 `scripts/audit-gemini-extractability.mjs` 与 `src/data/price-claim-surface-ledger.ts` **按文本解析**，拆它会连带改两处依赖（详见 Task 6 的改案说明）。新形态的内容放进**独立的一层** `src/data/topic-priority/`：`types.ts` + `index.ts` + 每主题一个 `<topic-id>.ts`（本批 3 个，下一批 42 个 ⇒ 每批都可并行写、互不冲突）。两个 astro 模板**按数据存在与否**渲染新区段 ⇒ 非试点页产物字节不变；新守卫分 **source-only**（数据形状）与 **build-dep**（渲染形状）两个文件。

**Tech Stack:** Node 20 · TypeScript 5.6（strict）· Astro 4 · `node:test` · pnpm 9 · tsx 4（仅测试/工具用，运行时零依赖）

## Global Constraints

- **宪法**：AI 不得擅自改 Roadmap / Phase；`src/engines/**` 属 calc 层，**本批一个字节都不许动**（连注释都不许）⇒ bot 必须永不改变策展侧（`popularModelKeys`），因为 `tests/ai-cost-scope-guard.test.ts` 把 18/13/8/5 = 44 写死，且 `src/engines/ai-cost/*` 的静态文案也写死「Cost Comparison (18 Models)」。
- **不改 `src/data/topic-content.ts` / `src/data/price-claim-surface-ledger.ts` / `scripts/audit-gemini-extractability.mjs`** —— 这三个按**文本**解析 `topic-content.ts`，改它们会把本批变成「重构月」而不是「形态试点」。新形态一律放新目录。
- **仓库换行符**：`.gitattributes` = `* text=auto eol=lf` ⇒ 新写文件一律 **LF**；改既有文件前先确认其换行符。
- **commit**：**改完代码先问用户**再 `git add` + `git commit`（用户规则）；commit message 走 `git commit -F <utf8 file>`；**绝不含** `[CI Skip]` / `[Skip CI]` / `[CF-Pages-Skip]`。
- **push**：先 `git fetch` + `git status -sb` 确认 0 behind，再推 origin（Gitee）与 github（GitHub）两端；**禁止 force-push**。
- **守卫纪律**：期望值必须是**独立写死的字面量**（不许从被测模块导出）；一条断言只守一件事；断言按**失败模式**枚举；「守卫全绿」≠「守卫真的在测」⇒ 收集器能力本身要自检；跨对象断言要**一次报出全部问题**。
- **变异台子纪律**：快照落盘 + 启动先还原 + SIGINT/SIGTERM/SIGHUP 处理；**还原必须无条件执行** + sha256 逐字节校验；无效变异（no-op）不算 KILLED/SURVIVED；锚点必须唯一；**必须用函数式替换** `replace(find, () => to)`；**变异必须保持模块可导入**；**还原列表必须包含每条变异的全部目标文件**。
- **工具入库**：产出验收数字的脚本一律进 `tests/scripts/`（本项目约定），**不许只留在 gitignore 的 `tmp/`**；文件名**不得**带 `.test.ts`（否则套件计数漂移）。
- **维度 3 scan**：本批的 spec / plan 必须含声明 —— 见本文件末尾「维度 3 scan 声明」一节。

---

## 文件结构（先锁定，再动手）

### 新建

| 文件 | 职责 |
|---|---|
| `scripts/curate-pricing-models.mjs` | 定价 bot 的策展侧闭环：新模型默认排除 + 族覆盖 + 剪陈旧排除 + 剪死族 + 刷新 `_rule` 计数。纯 node，零依赖。 |
| `tests/pricing-bot-wiring-guard.test.ts` | **source-only**：bot 是否真的接进了 workflow（跑到了吗 / diff 了吗 / add 了吗 / paths 过滤里有吗）。 |
| `tests/topic-priority-content-guard.test.ts` | **source-only**：试点主题的新数据段形状 + 试点名单与数据派生名单**集合相等**。 |
| `tests/topic-priority-shape-guard.test.ts` | **build-dep**：渲染产物里新区段真的出现了（H2 + 表格 + 每格非空），带**收集器自检**。 |
| `tests/scripts/p166-pricing-bot-selftest.mjs` | bot 自测：喂合成 fixture，断言 6 种行为 + glob 匹配器与真值实现等价。 |
| `tests/scripts/mutate-p166-pricing-bot.mjs` | 变异台子：证明上面那些守卫真的在测。 |
| `tests/scripts/p166-topic-priority-scan.ts` | 试点形态的实测工具（字段完整性 / 长度 / 与 `howToApply` 的 Step 编号对齐 / 价格是否走 token / 与试点名单集合相等）。 |
| `src/data/topic-priority/types.ts` | 两个新形态的 interface（`TopicFixPriorityTable` / `TopicReadinessChecklist` / `TopicPriorityContent`）。 |
| `src/data/topic-priority/index.ts` | 装配 + 导出 `PILOT_PRIORITY_TOPICS` 与 `TOPIC_PRIORITY_CONTENT`。 |
| `src/data/topic-priority/<topic-id>.ts` × 3（本批） | 每主题一份：`export const priority`（`fixPriority` + `readinessChecklist`，各带 en/zh）。下一批铺其余 42 个 ⇒ **一主题一文件 ⇒ 可并行写**。 |

### 修改

| 文件 | 改动 |
|---|---|
| `.github/workflows/sync-pricing.yml` | 加策展步骤；diff 路径加 `ai-pricing-popular.json`；`git add` 加 `ai-pricing-popular.json`；`push.paths` 加两个新文件。 |
| `src/data/ai-pricing-popular.json` | `_rule` 加 `datasetModelCount` + `autoCuration` 说明；计数刷新。 |
| `tests/popular-models-rule-guard.test.ts` | 写死计数 → floor + 声明值相等 + 划分等式。 |
| `src/data/topic-content.ts` | **不改**（审计脚本 + 价格台账按文本解析它；新形态放独立层 `src/data/topic-priority/`）。 |
| `src/pages/[lang]/[letter]/[topic]-benchmark.astro` | 渲染 `fixPriority` 段（仅当数据存在）。 |
| `src/pages/[lang]/[letter]/[topic]-guide.astro` | 渲染 `readinessChecklist` 段（仅当数据存在）。 |
| `src/locales/en.json` / `src/locales/zh.json` | 新增 9 个 i18n key。 |
| `src/data/topic-priority/<topic-id>.ts` × 3 | 试点主题的 `fixPriority` + `readinessChecklist` 内容。 |
| `CHANGELOG.md` / 规格 §19 / `AGENTS.md` | 文档。 |

---

## Task 1: 定价 bot 策展脚本 `scripts/curate-pricing-models.mjs`

**Files:**

- Create: `scripts/curate-pricing-models.mjs`
- Modify: `src/data/ai-pricing-popular.json`

**Interfaces:**

- Consumes: `src/data/ai-pricing.json`（`llm.<provider>.models`）、`src/data/ai-pricing-popular.json`。
- Produces: CLI `node scripts/curate-pricing-models.mjs [--dry-run] [--dataset <p>] [--popular <p>] [--report <p>]`；退出码 0 = 已应用 / 1 = 拒绝写（策展模型消失）。报告写到 `--report` 指定的路径（默认 `tmp/p166-curation-report.md`）。

**为什么 bot 只能动「排除侧」**：`tests/ai-cost-scope-guard.test.ts` 把交互态规模写死为 openai 18 / anthropic 13 / google 8 / deepseek 5 = 44，且 `src/engines/ai-cost/*` 的静态文案写死「Cost Comparison (18 Models)」⇒ 任何改变策展数的动作都会撞上「引擎层不许本批动」的宪法红线 ⇒ **策展 = 人的决定，bot 只做排除侧的记账**。

**glob 匹配器**：族规则的语义（* 匹配任意子串、含空串；. 是字面量）由 `src/data/ai-pricing-popular.ts` 的 `matchesExcludedFamily` 定义。bot 是零依赖的纯 node，**不能 import TS** ⇒ 实现一份**不依赖正则**的等价版本（按 * 切段做前缀/后缀/子串判定），并由 **Task 5 的自测**断言它与真值实现（在真实 42 个族 × 245 个 key 上）**逐例一致** —— 不许只靠「看起来一样」。

- [ ] **Step 1: 写脚本骨架 + 无正则的 glob 匹配器**

```js
#!/usr/bin/env node
// P166 —— 定价 bot 的「进不进交互态」闭环。
//
// 问题（实测 2026-11-03）：每周 bot 把新模型同步进 src/data/ai-pricing.json，
// 但 ai-pricing-popular.json 只有清单、没有「谁来决定」⇒ 新模型静默地只进数据集、
// 不进交互态 ⇒ 用户在计算器里选不到它，而唯一会红的东西是 popular-models-rule-guard
// （写死了 245/44/201/42）⇒ 每周 PR 必然红。
//
// P166 的决定（用户拍板）：**新模型默认排除**。bot 只改 popular.json 的排除侧，
// 永不碰策展侧（策展是人的决定，且引擎静态文案把 18/13/8/5 写死了）。
//
// 六种行为：
//   1. 新模型（数据集有、策展与排除都没有）→ 进 excludedModelKeys
//   2. 新模型能被已有排除族命中 → 挂上去，不新建族
//   3. 新模型谁也命中不了 → 新建一个精确匹配（pattern = key）的族
//   4. 排除清单里有、数据集里没了 → 剪掉（陈旧排除记录）
//   5. 排除族一个排除记录都命中不了 → 剪掉（死族）
//   6. 策展模型从数据集消失 → 拒绝写文件并退出 1（bot 不替人做策展决定）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATASET_DEFAULT = path.join(ROOT, 'src', 'data', 'ai-pricing.json');
const POPULAR_DEFAULT = path.join(ROOT, 'src', 'data', 'ai-pricing-popular.json');
const REPORT_DEFAULT = path.join(ROOT, 'tmp', 'p166-curation-report.md');

/**
 * 族规则匹配：* 匹配任意子串（含空串），其余字符按字面量。
 *
 * 语义与 src/data/ai-pricing-popular.ts 的 matchesExcludedFamily 一致，
 * 但**不使用正则**（零依赖 + 不用处理字符类转义）。
 * 等价性由 tests/scripts/p166-pricing-bot-selftest.mjs 在真实数据上断言。
 */
function matchesExcludedFamily(pattern, key) {
  if (!pattern.includes('*')) return pattern === key;
  const parts = pattern.split('*');
  if (!key.startsWith(parts[0])) return false;
  if (!key.endsWith(parts[parts.length - 1])) return false;
  let pos = parts[0].length;
  for (const part of parts.slice(1, -1)) {
    const idx = key.indexOf(part, pos);
    if (idx < 0) return false;
    pos = idx + part.length;
  }
  return true;
}
```

- [ ] **Step 2: 实现主流程（6 种行为）**

```js
function curate(dataset, popular) {
  const dsKeys = {};
  for (const [provider, group] of Object.entries(dataset.llm ?? {})) {
    dsKeys[provider] = Object.keys(group?.models ?? {});
  }
  const curated = popular.popularModelKeys ?? {};
  const excluded = popular.excludedModelKeys ?? {};
  const families = popular.excludedFamilies ?? [];

  const added = [];        // 'provider/key' 新进排除
  const pruned = [];       // 'provider/key' 从排除剪掉
  const famAdded = [];     // 'provider/pattern'
  const famPruned = [];    // 'provider/pattern'
  const failures = [];     // 拒绝写的原因

  // 行为 1/2/3 —— 新模型默认排除 + 族覆盖
  for (const [provider, keys] of Object.entries(dsKeys)) {
    const curatedSet = new Set(curated[provider] ?? []);
    const excludedSet = new Set(excluded[provider] ?? []);
    const fresh = keys.filter((k) => !curatedSet.has(k) && !excludedSet.has(k));
    if (fresh.length === 0) continue;
    excluded[provider] = [...(excluded[provider] ?? []), ...fresh];
    for (const key of fresh) {
      const covered = families.some(
        (f) => f.provider === provider && matchesExcludedFamily(f.pattern, key),
      );
      if (!covered) {
        const pattern = key;                       // 精确匹配，零猜测
        families.push({
          provider,
          pattern,
          reason:
            'P166 自动排除：' + provider + '/' + key + ' 随 LiteLLM 同步落地数据集，' +
            '尚未人工策展，默认不进交互态（人工策展后请并入对应产品线族）',
        });
        famAdded.push(provider + '/' + pattern);
      }
      added.push(provider + '/' + key);
    }
  }

  // 行为 4 —— 剪掉数据集里已消失的排除记录
  for (const [provider, keys] of Object.entries(excluded)) {
    const avail = new Set(dsKeys[provider] ?? []);
    excluded[provider] = keys.filter((k) => {
      if (avail.has(k)) return true;
      pruned.push(provider + '/' + k);
      return false;
    });
  }

  // 行为 5 —— 剪掉死族（族不再命中任何排除记录）
  popular.excludedFamilies = families.filter((f) => {
    const hit = (excluded[f.provider] ?? []).some((k) => matchesExcludedFamily(f.pattern, k));
    if (!hit) { famPruned.push(f.provider + '/' + f.pattern); return false; }
    return true;
  });

  // 行为 6 —— 策展模型消失 = 需要人做决定 ⇒ 拒绝写
  for (const [provider, keys] of Object.entries(curated)) {
    const avail = new Set(dsKeys[provider] ?? []);
    const gone = keys.filter((k) => !avail.has(k)).map((k) => provider + '/' + k);
    if (gone.length) failures.push('策展模型从数据集消失：' + gone.join(', '));
  }

  const curatedTotal = Object.values(curated).reduce((n, a) => n + a.length, 0);
  const excludedTotal = Object.values(excluded).reduce((n, a) => n + a.length, 0);
  const datasetTotal = Object.values(dsKeys).reduce((n, a) => n + a.length, 0);

  popular.popularModelKeys = curated;
  popular.excludedModelKeys = excluded;
  popular._rule = {
    ...popular._rule,
    updatedAt: (dataset.lastUpdated ?? '').slice(0, 10) || popular._rule?.updatedAt,
    curatedModelCount: curatedTotal,
    excludedModelCount: excludedTotal,
    datasetModelCount: datasetTotal,
    autoCuration:
      'P166 起每周 bot 自动做「进不进交互态」的决定：新模型默认进排除侧，' +
      '并保证每个排除记录都被一个排除族命中。策展侧（popularModelKeys）永远只由人改。',
  };

  return { added, pruned, famAdded, famPruned, failures, curatedTotal, excludedTotal, datasetTotal };
}
```

- [ ] **Step 3: 写文件 + 报告 + 退出码**

```js
function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const opt = (name, dflt) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
  };
  const datasetPath = opt('--dataset', DATASET_DEFAULT);
  const popularPath = opt('--popular', POPULAR_DEFAULT);
  const reportPath = opt('--report', REPORT_DEFAULT);

  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const popular = JSON.parse(fs.readFileSync(popularPath, 'utf8'));
  const before = JSON.stringify(popular);
  const r = curate(dataset, popular);
  const after = JSON.stringify(popular);

  const lines = [];
  lines.push('### 定价策展（popular-models 闭环）');
  lines.push('');
  lines.push('- 数据集模型总数：**' + r.datasetTotal + '**');
  lines.push('- 策展（进交互态）：**' + r.curatedTotal + '**（bot 不动）');
  lines.push('- 排除（不进交互态）：**' + r.excludedTotal + '**');
  lines.push('- 新增排除：**' + r.added.length + '**');
  lines.push('- 剪掉陈旧排除记录：**' + r.pruned.length + '**');
  lines.push('- 新建排除族：**' + r.famAdded.length + '**');
  lines.push('- 剪掉死族：**' + r.famPruned.length + '**');
  if (r.added.length) { lines.push(''); lines.push('**新增排除模型**'); r.added.forEach((x) => lines.push('- ' + x)); }
  if (r.famAdded.length) { lines.push(''); lines.push('**新建排除族**'); r.famAdded.forEach((x) => lines.push('- ' + x)); }
  if (r.pruned.length) { lines.push(''); lines.push('**剪掉陈旧排除记录**'); r.pruned.forEach((x) => lines.push('- ' + x)); }
  if (r.famPruned.length) { lines.push(''); lines.push('**剪掉死族**'); r.famPruned.forEach((x) => lines.push('- ' + x)); }
  if (r.failures.length) {
    lines.push(''); lines.push('**拒绝自动处理（需要人工决定）**');
    r.failures.forEach((x) => lines.push('- ' + x));
    lines.push(''); lines.push('bot 不会替人改策展侧（popularModelKeys）。请人工调整后重跑。');
  }
  const report = lines.join('\n') + '\n';
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf8');
  process.stdout.write(report);

  if (r.failures.length) { process.exit(1); }
  if (dryRun) { console.log('（dry-run：未写文件）'); return; }
  if (before === after) { console.log('（popular.json 无变化）'); return; }
  fs.writeFileSync(popularPath, JSON.stringify(popular, null, 2) + '\n', 'utf8');
  console.log('已写入 ' + popularPath);
}

main();
```

- [ ] **Step 4: 用 PR #4 的两个新模型做只读验证（不改工作区）**

把 `tmp/p166-pr-ai-pricing.json`（PR #4 的数据集快照）喂给 `--dry-run`，期望：
`added = ['openai/gpt-6-rosalind', 'openai/gpt-6-astra-law']`、`famAdded = []`（两者都被已有族 `openai | gpt-6*` 命中）、`failures = []`、`excludedTotal = 203`。

- [ ] **Step 5: 验证「真写」路径**

```powershell
node scripts/curate-pricing-models.mjs --dry-run
node scripts/curate-pricing-models.mjs
git diff --stat src/data/ai-pricing-popular.json
git diff src/data/ai-pricing-popular.json
```

期望：当前 master 数据集 245 模型全部已决 ⇒ `added = 0`、`pruned = 0`，只有 `_rule` 的字段变了（`datasetModelCount: 245` 新增、`autoCuration` 新增、`updatedAt` 可能变）。

---

## Task 2: 把 bot 接进 workflow

**Files:**

- Modify: `.github/workflows/sync-pricing.yml`

- [ ] **Step 1: 加策展步骤**（放在「Sync pricing from LiteLLM」之后、codegen 之前）

```yaml
      - name: Curate new models into the interactive set (P166)
        id: curate
        run: |
          # set -e would abort before the report lands in the summary, so the
          # exit status is captured explicitly and re-raised at the end.
          set -uo pipefail
          node scripts/curate-pricing-models.mjs
          STATUS=$?
          if [ -f tmp/p166-curation-report.md ]; then
            cat tmp/p166-curation-report.md >> "$GITHUB_STEP_SUMMARY"
            echo "" >> "$GITHUB_STEP_SUMMARY"
          fi
          echo "status=$STATUS" >> "$GITHUB_OUTPUT"
          exit $STATUS
```

- [ ] **Step 2: diff 路径加上 popular.json**

```yaml
      - name: Check for changes
        id: diff
        run: |
          if git diff --quiet src/data/ai-pricing.json src/data/ai-pricing-popular.json src/engines/; then
            echo "changed=false" >> $GITHUB_OUTPUT
          else
            echo "changed=true" >> $GITHUB_OUTPUT
          fi
```

- [ ] **Step 3: `git add` 加上 popular.json**

把 `git add src/data/ai-pricing.json src/engines/` 改成 `git add src/data/ai-pricing.json src/data/ai-pricing-popular.json src/engines/`。

> ⚠️ 这正是 P166 的根因所在：bot 提交了 popular.json 的**变化**，但从没提交过 popular.json 本身 ⇒ 「新模型进数据集 → 没人做决定」永远无人知晓。

- [ ] **Step 4: `push.paths` 加上两个新文件**

在 `paths:` 列表里加 `- 'src/data/ai-pricing-popular.json'` 与 `- 'scripts/curate-pricing-models.mjs'`。

- [ ] **Step 5: 提交信息里带上策展摘要**（从 `tmp/p166-curation-report.md` 读「新增排除」数量附在 MSG 末尾）。

---

## Task 3: 守卫改造（bot 安全形态）

**Files:**

- Modify: `tests/popular-models-rule-guard.test.ts`

- [ ] **Step 1: 把写死计数换成 floor**

删掉 `DATASET_MODEL_COUNT = 245` / `CURATED_COUNT = 44` / `EXCLUDED_COUNT = 201` / `FAMILY_COUNT = 42`，换成：

```ts
/**
 * 独立写死的下限（不是期望值）。
 *
 * 为什么从「精确相等」改成「下限」：P166 起 bot 每周会自动增删**排除侧**，
 * 数据集总数也会随 LiteLLM 增删 ⇒ 任何写死的精确值都会让**每周的 PR 必然红**
 * （实测 PR #4 就是这么红的：数据集 245 → 247，两条写死计数的断言当场炸）。
 *
 * 下限只挡「灾难性塌缩」；真正的完整性由下面三条恒等式守：
 *   · 策展 + 排除 == 数据集全集（完整划分）
 *   · _rule.datasetModelCount == 数据集总数（bot 跑过了吗）
 *   · _rule.<x>Count == 对应清单的实际长度（声明与实际一致吗）
 */
const DATASET_MODEL_COUNT_FLOOR = 200;
const CURATED_COUNT_FLOOR = 44;
const FAMILY_COUNT_FLOOR = 30;
```

- [ ] **Step 2: 新增「bot 跑过了吗」断言**

```ts
test('P166: _rule.datasetModelCount 必须等于数据集模型总数（bot 没跑就会红）', () => {
  assert.equal(
    popularFile._rule?.datasetModelCount,
    datasetTotal(),
    '数据集模型数变了但 popular.json 的 datasetModelCount 没跟上 —— ' +
      '说明定价 bot 的策展步骤没跑（本周 PR 的 CI 会红）。' +
      '本地修法：node scripts/curate-pricing-models.mjs',
  );
});
```

- [ ] **Step 3: 把「策展 + 排除 == 数据集总数」那条改成读实际值**

```ts
test('P166: 策展数 + 排除数 == 数据集模型总数（完整划分），且三个数都在下限之上', () => {
  const curatedTotal = Object.values(popular).reduce((n, a) => n + a.length, 0);
  const excludedTotal = Object.values(excluded).reduce((n, a) => n + a.length, 0);
  assert.equal(
    curatedTotal + excludedTotal,
    datasetTotal(),
    '策展 + 排除 必须等于数据集全集 —— 否则有模型两边都没有，或两边都有',
  );
  assert.ok(datasetTotal() >= DATASET_MODEL_COUNT_FLOOR, '数据集模型数塌缩到下限以下');
  assert.ok(curatedTotal >= CURATED_COUNT_FLOOR, '交互态模型数塌缩到下限以下 —— 策展是人的决定，bot 永不削减它');
  assert.ok(families.length >= FAMILY_COUNT_FLOOR, '排除族数量塌缩到下限以下');
});
```

- [ ] **Step 4: `_rule` 契约那条改成「声明 == 实际」**

```ts
  assert.equal(rule.curatedModelCount, curatedTotal(), '_rule.curatedModelCount 与实际策展数不符');
  assert.equal(rule.excludedModelCount, excludedTotal(), '_rule.excludedModelCount 与实际排除数不符');
```

- [ ] **Step 5: 删掉「族数量 == 42」那条里的写死值**（改成 floor）

- [ ] **Step 6: 跑测试**

```powershell
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/popular-models-rule-guard.test.ts
```

---

## Task 4: 接线守卫（bot 真的被接进 workflow 了吗）

**Files:**

- Create: `tests/pricing-bot-wiring-guard.test.ts`

- [ ] **Step 1: 写守卫**（source-only）

四条断言，一条守一件事：

1. workflow 里存在执行 `scripts/curate-pricing-models.mjs` 的步骤；
2. diff 检查包含 `src/data/ai-pricing-popular.json`；
3. `git add` 包含 `src/data/ai-pricing-popular.json`；
4. `push.paths` 包含 `src/data/ai-pricing-popular.json` 与 `scripts/curate-pricing-models.mjs`。

⚠️ 判据要**落在 workflow 文件的对应片段上**，不许把整个文件拼起来查（整页查会被别处的同域正确值当挡箭牌 —— P165 实测过的坑）。

- [ ] **Step 2: 跑测试**（先红：workflow 还没改 ⇒ 应红；改完 Task 2 后 ⇒ 应绿）

---

## Task 5: bot 自测 + 变异台子

**Files:**

- Create: `tests/scripts/p166-pricing-bot-selftest.mjs`
- Create: `tests/scripts/mutate-p166-pricing-bot.mjs`

- [ ] **Step 1: 自测脚本**（合成 fixture，7 条断言）

用 `--dataset` / `--popular` 指向 `tmp/` 下的合成文件，跑完断言：

1. 新模型进排除清单；
2. 能被已有族命中的新模型**不新建族**；
3. 谁也命不中的新模型**新建一个精确匹配族**；
4. 数据集里没了的排除记录被剪掉；
5. 命不中任何记录的族被剪掉；
6. 策展模型消失 ⇒ 退出码 1 且 popular.json **一个字节没变**；
7. **glob 匹配器与真值实现等价**：在真实数据（42 个族 × 245 个 key）上，bot 的无正则匹配器与 `src/data/ai-pricing-popular.ts` 的 `matchesExcludedFamily` **逐例同结果**（不一致就报出具体 pattern/key 对）。

- [ ] **Step 2: 变异台子**（≥ 6 条变异，全部必须 KILLED）

- M1：从 `popularModelKeys` 删一个 key ⇒ 划分等式红；
- M2：从 `excludedModelKeys` 删一个 key（不删对应族）⇒ 孤儿红；
- M3：把 `_rule.excludedModelCount` 改成别的数 ⇒ 声明≠实际红；
- M4：把 `_rule.datasetModelCount` 改成别的数 ⇒ 「bot 没跑」红；
- M5：把 workflow 里的策展步骤整段删掉 ⇒ 接线守卫红；
- M6：把 workflow 的 `git add` 里的 popular.json 删掉 ⇒ 接线守卫红；
- M7：把 `excludedModelKeys` 整块删掉 ⇒ 划分等式 + floor 红。

台子纪律：启动先还原 → 变异 → 跑测试 → 还原（**无条件执行**）→ sha256 逐字节校验；锚点必须唯一；用函数式替换；变异必须保持文件可解析。

- [ ] **Step 3: 跑台子**，期望 **7/7 KILLED**

---

## Task 6: 新形态数据层 `src/data/topic-priority/`

**Files:**

- Create: `src/data/topic-priority/types.ts`
- Create: `src/data/topic-priority/index.ts`
- Create: `src/data/topic-priority/<topic-id>.ts` × 3（本批）
- Create: `tests/scripts/p166-topic-priority-scan.ts`

**⭐ 计划改案（2026-11-03 执行前取证）**：原计划是把 2,900 行 / 980 KB 的 `src/data/topic-content.ts` 拆成每主题一文件。执行前取证发现它有**两个按文本解析它**的依赖，拆它会连带改两处：

1. `scripts/audit-gemini-extractability.mjs` —— 用 `txt.indexOf('export const TOPIC_GUIDE_CONTENT:')` 在**文本**里切块、再用正则抓每个主题的对象。拆了它就抓不到；而这个工具是审计报告的产出源，**悄悄少报几个主题比直接报错更坏**。
2. `src/data/price-claim-surface-ledger.ts` —— 价格主张台账把 `file: 'src/data/topic-content.ts'` 记成**价格入口**；`tests/price-claim-surface-ledger-guard.test.ts` 会去读那个文件、找锚点，并且**反向**要求「全仓扫出的每个价格入口都必须登记在台账里」。拆了它要同时改台账 3 行 + 守卫的硬编码清单（价格会散进 N 个新文件）。

⇒ **改案：新形态不寄生在既有内容上，而是放进独立的一层 `src/data/topic-priority/`**：

- `src/data/topic-content.ts` **一个字节都不改**（审计脚本 ✅ 价格台账 ✅ 既有守卫 ✅）
- 新形态的内容按主题存成**每主题一个文件** ⇒ 下一批铺其余 42 个时**天然可并行、互不冲突**
- 两个 astro 模板从 `TOPIC_PRIORITY_CONTENT` 取新区段 ⇒ 非试点页产物字节不变

- [ ] **Step 1: 写 `src/data/topic-priority/types.ts`**

```ts
/**
 * P166 —— 「修复优先级表」：多个指标同时不达标时，先修哪个。
 *
 * 与既有 howToUse 的区别（P165 取证结论：做「定位表」会与已有散文重复）：
 *   · howToUse = 「选哪一行 → 单一动作」（一个指标 → 一件事）
 *   · fixPriority = 「多个指标都不达标 → 先修哪个 → 它会带动谁 → 什么时候会反过来拖累另一个」
 *                   （多个指标之间的排序与联动）
 */
export interface TopicFixPriorityRow {
  priority: number;   // 1 = 最先修；必须 1..N 连续
  metric: string;
  fixFirst: string;
  alsoMoves: string;
  backfire: string;
}

export interface TopicFixPriorityTable {
  intro: string;
  rows: TopicFixPriorityRow[];
}

/** P166 —— 「达标清单」：每一步的达标线；不达标就别往下走。 */
export interface TopicReadinessItem {
  step: number;      // 对应 howToApply 的第几步
  label: string;     // 这一步在做什么（短）
  gate: string;      // 达标线
  blockIf: string;   // 不达标时卡在哪
}

export interface TopicReadinessChecklist {
  intro: string;
  items: TopicReadinessItem[];
}

/** 一个主题的新形态内容（两种语言各一份）。 */
export interface TopicPriorityContent {
  fixPriority: { en: TopicFixPriorityTable; zh: TopicFixPriorityTable };
  readinessChecklist: { en: TopicReadinessChecklist; zh: TopicReadinessChecklist };
}
```

- [ ] **Step 2: 写 3 个主题骨架文件 + `src/data/topic-priority/index.ts`**

每个 `src/data/topic-priority/<topic-id>.ts`：

```ts
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: { en: { intro: '', rows: [] }, zh: { intro: '', rows: [] } },
  readinessChecklist: { en: { intro: '', items: [] }, zh: { intro: '', items: [] } },
};
```

`src/data/topic-priority/index.ts`（显式 import + 装配，**顺序 = 试点名单顺序**）：

```ts
import type { TopicPriorityContent } from './types';
import { priority as llmApiCostOptimization } from './llm-api-cost-optimization';
import { priority as customerAcquisitionCost } from './customer-acquisition-cost';
import { priority as netRevenueRetention } from './net-revenue-retention';

/** P166 试点名单（3 个：1 个 B 类 + 1 个 C 类 + 1 个 R 类）。铺开到 42 个时只改这里 + 加文件。 */
export const PILOT_PRIORITY_TOPICS = [
  'llm-api-cost-optimization',
  'customer-acquisition-cost',
  'net-revenue-retention',
] as const;

export const TOPIC_PRIORITY_CONTENT: Record<string, TopicPriorityContent> = {
  'llm-api-cost-optimization': llmApiCostOptimization,
  'customer-acquisition-cost': customerAcquisitionCost,
  'net-revenue-retention': netRevenueRetention,
};
```

- [ ] **Step 3: 写 `tests/scripts/p166-topic-priority-scan.ts`（实测工具，**必须入库**）

它必须能一次性报出：每个试点主题每个语言的 ① `fixPriority.rows.length` 与每行 4 个字段的长度；② `readinessChecklist.items.length` 与每项 4 个字段的长度；③ `priority` 是否 1..N 连续；④ `step` 是否与 `TOPIC_GUIDE_CONTENT[topicId][lang].howToApply` 里出现的 `Step N` **集合相等**；⑤ 价格类片段是否都含 `{{live` token（不许手写价格）；⑥ `PILOT_PRIORITY_TOPICS` 与「实际带 priority 内容的 topic 集合」是否**集合相等**。输出是**人可读的报告**，不是一句 pass/fail。

---

## Task 7: 页面渲染 + i18n

**Files:**

- Modify: `src/pages/[lang]/[letter]/[topic]-benchmark.astro`
- Modify: `src/pages/[lang]/[letter]/[topic]-guide.astro`
- Modify: `src/locales/en.json` / `src/locales/zh.json`

- [ ] **Step 1: 加 9 个 i18n key**

en：`topic.benchmark.h2.fix_priority` = "What to fix first"、`topic.benchmark.table.priority` = "Order"、`topic.benchmark.table.metric` = "Metric"、`topic.benchmark.table.fix_first` = "Fix this first"、`topic.benchmark.table.also_moves` = "Also moves"、`topic.benchmark.table.backfire` = "Watch out"、`topic.guide.h2.readiness_checklist` = "Readiness checklist"、`topic.guide.checklist.gate` = "Pass line"、`topic.guide.checklist.block_if` = "If you fail"。

zh：对应「先修哪个」/「顺序」/「指标」/「先修它」/「会带动」/「反噬风险」/「达标清单」/「达标线」/「不达标别往下走」。

- [ ] **Step 2: 基准页渲染 `fixPriority`（仅当数据存在 ⇒ 非试点页字节不变）**

在 `src/pages/[lang]/[letter]/[topic]-benchmark.astro` 的 frontmatter 里加：

```astro
import { TOPIC_PRIORITY_CONTENT } from '../../../data/topic-priority';
...
const fixPriority = TOPIC_PRIORITY_CONTENT[topic.id]?.fixPriority?.[lang as 'en' | 'zh'];
```

在 `how_to_use` 段之后加一个 section（**5 列**：顺序 / 指标 / 先修它 / 会带动 / 反噬风险），整段由 `{fixPriority && ( ... )}` 包住 —— 数据不存在时**连 H2 都不渲染**（否则 42 个非试点页会多出一个空标题）。

- [ ] **Step 3: 指南页渲染 `readinessChecklist`（仅当数据存在）**

在 `src/pages/[lang]/[letter]/[topic]-guide.astro` 里同理取 `readinessChecklist`，在 `how_to_apply` 段之后渲染一个 4 列的表（步骤 / 这一步在做什么 / 达标线 / 不达标别往下走）。

- [ ] **Step 4: 跑 build + 确认非试点页没变**

```powershell
$env:SKIP_INDEXNOW='1'; pnpm build:full
git diff --stat dist/
```

期望：**只有** 3 个试点主题的 6 个页面（3 主题 × 2 语言 × 2 模板）产物变化；其余 39 个 tier-1 主题的 156 个页面**零变化**。


## Task 8: 试点内容（3 个主题）

**Files:**

- Create/Modify: `src/data/topic-priority/llm-api-cost-optimization.ts`
- Create/Modify: `src/data/topic-priority/customer-acquisition-cost.ts`
- Create/Modify: `src/data/topic-priority/net-revenue-retention.ts`

**试点选择与理由**：B = `llm-api-cost-optimization`（价格重 ⇒ 必须走 live token 派生）、C = `customer-acquisition-cost`、R = `net-revenue-retention`。三者都是「多指标天然共存」的主题。

- [ ] **Step 1: 先由主控写完 B 类的样板**（en + zh 的 `fixPriority` + `readinessChecklist`），作为另外两个主题的**形态参照**

- [ ] **Step 2: 并行派 3 个 worker**（B 类样板已存在 ⇒ 三个 worker 各写一个主题，文件互不重叠）

每个 worker 的 brief 必须写明：

- 目标文件（独占）
- 精确的类型形状（`fixPriority` 5 字段 / `readinessChecklist` 4 字段，见 Task 6 Step 1）
- **不许与既有 `howToUse` / `howToApply` 重复**（前者是「单指标→单动作」，后者是「Step N 编号链」）—— 新段落的独有价值是「多指标之间的排序与联动」与「每一步的达标线」
- B 类：价格必须走 live token（`{{live:...}}` / `{{liveName:...}}` / `{{liveIn:...}}` / `{{liveOut:...}}` / `{{liveRatioIn:...}}` / `{{liveDate}}`），**一个字的价格都不许手写**
- zh 与 en 语义对齐（不是直译，要对齐到同一个决策）
- `priority` 必须 1..N 连续；`readinessChecklist.items` 的 `step` 必须与该主题 `howToApply` 的 Step 编号一一对应
- 每字段长度下限：en/zh 各 ≥ 150 字符（与既有 coverage guard 的口径一致）

- [ ] **Step 3: 主控逐个 review**（重点查：是否与 `howToUse`/`howToApply` 重复、价格是否走 token、priority 是否连续、zh 与 en 是否对齐、`step` 是否对得上）


## Task 9: 新守卫（source-only + build-dep）

**Files:**

- Create: `tests/topic-priority-content-guard.test.ts`
- Create: `tests/topic-priority-shape-guard.test.ts`

- [ ] **Step 1: source-only 守卫**（数据形状，**不得**被 `RUN_BUILD_TESTS` 门挡住 —— P153-G1 的教训）

断言（一条守一件事）：

1. `PILOT_PRIORITY_TOPICS`（3 个）与「实际带 priority 内容的 topic 集合」**集合相等**（不是子集）；
2. 每个试点主题的 en + zh 都有 `fixPriority` 与 `readinessChecklist`；
3. `fixPriority.rows.length >= 3`；
4. `priority` 是 1..N 连续且无重复；
5. 每行的 4 个文本字段非空且长度达标；
6. `readinessChecklist.items.length >= 4`；
7. `step` 与该主题 `howToApply` 里出现的 `Step N` 编号**集合相等**（不许凭空多一步，也不许漏一步）；
8. 每项的 `gate` 与 `blockIf` 非空。

- [ ] **Step 2: build-dep 守卫**（渲染形状 + **收集器自检**）

- 每个试点主题 × 语言：benchmark 产物含 fix_priority 的 H2 文本 + 一张 ≥ 3 行 × 5 列且每格非空的表；guide 产物含 readiness_checklist 的 H2 文本 + ≥ 4 个清单项（每项的达标线与「不达标别往下走」都出现）。
- **收集器自检**：造一个**嵌套/带属性的**合成 HTML 样本，断言收集器看得见它（防止收集器只认自己写的形态 —— P165 实测过「只扫一层 ⇒ 30/30 页误判」）。
- 一次报出全部问题（不首个失败即抛）。

- [ ] **Step 3: 跑测试**

```powershell
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/topic-priority-content-guard.test.ts
```


## Task 10: 文档

- [ ] `CHANGELOG.md` 新增 `### [P166]` 条目 + 头部摘要（含实测数字）
- [ ] 规格新增 §19（19.1–19.x）
- [ ] `AGENTS.md` 数字修正
- [ ] **维度 3 scan 声明**（见下）

---

## 维度 3 scan 声明

> **维度 3 scan: 基于信号 AX / AY / AZ。**
>
> - **AX（市场信号 · 模型供给）**：LiteLLM 的模型供给在持续扩张 —— 实测 2026-11-02 那周的同步就把 2 个新模型（`openai/gpt-6-rosalind`、`openai/gpt-6-astra-law`）带进了数据集（245 → 247），而交互态策展是**人工**流程 ⇒ 每周必然产生「数据集有、交互态没有」的缺口。⭐ 更糟的是这个缺口的**唯一反馈信号本身是坏的**：PR #4 的 CI run **#317 = action_required**（从未真正跑起来，0 个 job）⇒ 「每周 PR 必然红」这件事**从来没有被任何人看见**，直到本批取证才把它挖出来。⇒ **P166-A 把这条信号接上**：bot 每周自动做决定（默认排除）⇒ 缺口不再产生，PR 不再红。
> - **AY（市场信号 · 内容供给形态）**：主题页的既有散文（`howToUse` = 单指标 → 单动作；`howToApply` = Step 1..8 编号链）已经覆盖了「定位表」要表达的东西 ⇒ 「再加一张定位表」= 站内自我重复。而「多指标同时不达标时先修哪个」与「每一步的达标线」这两件事**在任何现有段落里都不存在** ⇒ 那是真缺口。⇒ **P166-B 的形态按此定案**：基准页做「修复优先级表」、指南页做「达标清单」。
> - **AZ（市场信号 · 依赖形态）**：主题内容大量依赖 live-price token（`liveName` × 102、`liveDate` × 39、`liveGpuRange` × 26 …）⇒ 任何涉及价格的表述都**必须走 token 派生**，否则每周随 bot 同步漂移。⇒ 试点三主题的内容纪律：B 类主题的价格全部走 token，守卫里加一条「新增价格片段必须含 token」的自检。
> - **AI 不擅自改 Roadmap / Phase**：本批只做用户已拍板的三项，不新增分类、不改引擎、不动 Phase。

---

## 自查（写完计划后逐条过）

1. **Spec 覆盖**：三项拍板（bot 闭环 / 修复优先级表 / 先试点 3 个）分别落在 Task 1–5、Task 7–9、Task 8 ✓
2. **占位符扫描**：无 TBD / TODO / 「类似 Task N」 ✓（Task 8 的 Step 2 给了完整的 worker brief 形状 + 文件所有权 + 验收判据）
3. **类型一致**：`TopicFixPriorityTable` / `TopicReadinessChecklist` 在 types、页面、守卫三处同名同形状 ✓
4. **宪法红线**：无任何 `src/engines/` 改动；bot 不碰策展侧 ✓
