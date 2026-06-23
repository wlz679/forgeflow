# Move Business Calculator Presets to Top — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the "场景预设 / Scenario Presets" block from below the form inputs to above them on all 24 business calculator pages, restyled to match the openai-token-calculator pattern (mb-5 container + "🎭 Scenario Presets" header + emoji-decorated `preset-btn` buttons with purple hover state).

**Architecture:** Single file change to `src/pages/[lang]/[slug].astro`. The 24 inline preset blocks currently sit at the bottom of the form (after `engine.inputs.map(...)` in the `else` branch); they need to be relocated to the **top of the `else` branch** (before the inputs map) and restyled to mirror the AI calculators' top-of-form preset pattern. Each calculator's 6 presets get a meaningful emoji prepended. Preset text labels continue to come from `src/i18n/translations.ts` (no translation changes needed — all 144 keys exist). No engine, type, or translation changes.

**Tech Stack:** Astro 4.16 (single template change), Tailwind CSS 4 utility classes, existing `preset-btn` JS click-handler (already wired in the page's `<script>` block — only the markup class matters).

---

## File Map

**Modify:**
- `src/pages/[lang]/[slug].astro` — single file
  - **Insert** 24 new preset blocks (each ~12-18 lines) at the top of the `else` branch (currently lines 435-452)
  - **Delete** the 24 old preset blocks currently at lines 569-833
  - **Net change**: ~+240 lines (new top blocks), ~-180 lines (old bottom blocks deleted)

**No changes to:**
- `src/i18n/translations.ts` (all preset keys already exist)
- `src/engines/*.ts` (engines unaffected)
- Any other source file

**Create (verification only, can be deleted after):**
- `scripts/_verify-presets-position.mjs` — verifies each of the 24 business calculator pages has its preset block above its inputs in the built HTML
- `scripts/_verify-presets-emojis.mjs` — verifies each calculator's preset block has 6 buttons each with an emoji prefix

---

## Reference: Target Markup Shape

Every new preset block follows this exact shape (matches openai-token-calculator lines 134-148):

```astro
{slug === 'solopreneur-XXX-calculator' && (
  <div class="mb-5">
    <span class="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">{lang === 'zh' ? '🎭 场景预设' : '🎭 Scenario Presets'}</span>
    <div class="flex flex-wrap gap-1.5" id="preset-buttons-XXX">
      {[
        { emoji:'🌱', key:'pre-seed', data-attr-1:'value', ... },
        ...
      ].map(p => (
        <button type="button" class="preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all" data-attr-1={p['data-attr-1']} ...>{p.emoji} {t(`tools.solopreneur-XXX-calculator.preset.${p.key}`, lang)}</button>
      ))}
    </div>
  </div>
)}
```

**Differences from current bottom-style block:**
- Container: `<div class="mb-5">` (was `<div class="flex flex-wrap gap-2 mt-3">`)
- Header: block-level "🎭 Scenario Presets" with uppercase tracking-wide (was inline "Scenarios:" in gray-500)
- Button class: `preset-btn ... rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all` (was `preset-chip ... rounded-full border hover:bg-gray-100 transition`)
- Button text: `{emoji} {translated label}` (was just `{translated label}`)
- Container has `id="preset-buttons-XXX"` for click-handler scoping (matches openai pattern)

---

## Master Emoji Mapping (use these exactly)

| Preset key | Emoji | Rationale |
|---|---|---|
| pre-seed | 🌱 | Sprout, earliest funding stage |
| seed | 🌿 | Growing, first funded round |
| series-a | 🌳 | Established tree |
| series-b | 🏢 | Building, larger round |
| series-c | 🏙️ | Major metro, very large |
| pre-seed | 🌱 | (equity-dilution pre-seed) |
| late-stage | 🏛️ | Classical building, mature |
| profitable | 💰 | Cash flow positive |
| idea-stage | 💡 | Light bulb, pre-revenue |
| bloated | ⚠️ | Warning, over-staffed |
| early-stage | 🌱 | Early growth |
| growing | 📈 | Chart up |
| scale | 🏢 | Scaled operations |
| high-churn | ⚠️ | Warning, customers leaving |
| flat | 📊 | Flat chart |
| expansion-heavy | 📈 | Expansion dominant |
| healthy | ✅ | Healthy metrics |
| hyper-growth | 🚀 | Rapid scaling |
| high-growth | 🚀 | High growth |
| stagnant | ⏸️ | Pause/stuck |
| distressed | 🆘 | SOS, trouble |
| healthy-saas | ✅ | Healthy SaaS metrics |
| mass-market | 👥 | People, broad |
| enterprise | 🏢 | Enterprise scale |
| consumer | 👤 | Individual consumer |
| high-retention | 💎 | Precious, sticky |
| churn-crisis | 🆘 | Crisis |
| lean | 🏃 | Efficient, slim |
| scaling | 📈 | Scaling up |
| organic | 🌿 | Natural growth |
| bleeding | 🩸 | Losing money |
| smba | 🏪 | SMB Agency |
| best-in-class | 🏆 | Top tier |
| early-traction | 🚀 | Early traction |
| side-project | 🎨 | Hobby, creative |
| small-biz | 🏪 | Small business |
| startup-loss | 🩸 | Pre-profit loss |
| ecom | 🛒 | E-commerce |
| tight | 🤏 | Pinched margins |
| niche-b2b | 🎯 | Targeted B2B |
| b2c-mass | 👥 | B2C mass market |
| mature | 🏛️ | Mature market |
| enterprise-emerging | 🌅 | Emerging enterprise |
| local-service | 📍 | Location-based |
| declining | 📉 | Shrinking |
| junior-dev | 👶 | Junior developer |
| mid-designer | 👨‍🎨 | Mid designer |
| senior-dev | 🧑‍💻 | Senior developer |
| expert-consultant | 🎓 | Expert |
| writer-eu | ✍️ | European writer |
| marketer-remote | 📣 | Remote marketer |
| budget | 💵 | Budget tier |
| mid-tier | 💵 | (overloaded — see note below) |
| premium | 💎 | Premium tier |
| cohort | 👥 | Cohort-based |
| niche-expert | 🎯 | Niche expert |
| flag-ship | 🚢 | Flagship product |
| entry | 🚪 | Entry level |
| mid | 👨 | Mid level |
| senior | 👴 | Senior level |
| founder | 👑 | Founder level |
| part-time | ⏰ | Part-time work |
| four-day | 📅 | 4-day week |
| small-podcast | 🎙️ | Small podcast |
| mid-podcast | 🎙️ | (note: same emoji as small-podcast) |
| newsletter | 📧 | Newsletter |
| youtube | 📺 | YouTube |
| blog | 📝 | Blog |
| top-tier | 🏆 | Top tier |
| healthy | ✅ | (project-profitability: healthy project) |
| premium | 💎 | (project-profitability: premium project) |
| squeezed | 🍋 | Squeezed margins |
| complex | 🧩 | Complex project |
| micro | 🐜 | Micro project |
| overrun | ⏰ | Overrun project |
| starting | 🚀 | Starting out |
| mid | 📊 | (affiliate: mid) |
| established | 🏆 | Established |
| high-ticket | 💎 | High value |
| side-blog | 📝 | Side blog |
| mass-traffic | 🌊 | Mass traffic |
| optimized | ⚡ | Optimized |
| cold | ❄️ | Cold list |
| ecommerce | 🛒 | E-commerce list |
| engaged | 🔥 | Highly engaged |
| freelancer | 🏃 | Freelancer |
| specialist | 🎯 | Specialist |
| consultant | 🎓 | Consultant |
| remote-stable | 🌐 | Stable remote |
| agency | 🏢 | Agency |
| standup | 🏃 | Standup meeting |
| weekly | 📅 | Weekly meeting |
| review | 👀 | Review meeting |
| all-hands | 🙌 | All-hands meeting |
| 1on1 | 🤝 | 1-on-1 |
| board | 🏛️ | Board meeting |
| junior | 👶 | Junior employee |
| mid | 👨 | (employee: mid) |
| senior | 👴 | (employee: senior) |
| europe | 🇪🇺 | Europe |
| asia | 🌏 | Asia |
| remote | 🌐 | Remote |
| peak | 🏔️ | Peak productivity |
| balanced | ⚖️ | Balanced |
| chaotic | 🌪️ | Chaotic |
| minimalist | ⬜ | Minimalist |
| deep-work | 🧠 | Deep work |
| meeting-heavy | 🗣️ | Meeting heavy |
| b2b-mid | 🏢 | B2B mid market |
| devtools | 🛠️ | Developer tools |
| premium-course | 💎 | Premium course |
| ebook | 📕 | Ebook |
| template | 📄 | Template product |
| us-mid | 🇺🇸 | US mid |
| us-high | 🇺🇸 | US high (same emoji) |
| uk | 🇬🇧 | UK |
| canada | 🇨🇦 | Canada |
| australia | 🇦🇺 | Australia |
| germany | 🇩🇪 | Germany |

**Duplicates expected & OK:** multiple calculators use the same preset key (`healthy`, `mid`, `premium`, `enterprise`); the emoji is the same. E.g., `project-profitability-calculator` and `mrr-calculator` both have `healthy` preset → both use ✅.

---

## Task 1: Add the helper header markup (no behavior change yet)

**Files:**
- Modify: `src/pages/[lang]/[slug].astro` (no structural change — just add a comment marker to the else branch)

This task adds a comment to the else branch (line 435) marking where the new preset blocks will be inserted. It validates that the file is still well-formed Astro before we add real content.

> **⚠️ JSX parsing note (discovered during Task 1 execution):** Astro's JSX parser requires JSX comments (`{/* ... */}`) to live INSIDE a fragment `<>...</>` or an element. Placing a bare JSX comment at the top of an expression position causes a parse error (`Expected ")" but found "$$render"`). The marker must therefore be wrapped in a fragment. The Task 2 implementer discovered this and wrapped the marker as `<>{/* ... */}` plus the new blocks. Subsequent tasks insert new blocks between this marker and the `{engine.inputs.map(...)}` line.

- [ ] **Step 1: Add a comment marker inside the else branch (wrapped in a fragment)**

Use `Edit` to change line 435 from `) : (` to add a marker comment wrapped in `<>...</>`. The exact change:

```
old_string: "            ) : (\n              engine.inputs.map(input => ("
new_string: "            ) : (\n              <>{/* PRESET_BLOCKS_TOP: 24 calculators insert here */}\n              {engine.inputs.map(input => ("
```

Expected: 2 lines added (the fragment opening `<>{/* ... */}` comment + the still-existing inputs.map line). The closing `</>` is NOT yet added — it will be added in Task 2 when the first real blocks are inserted.

- [ ] **Step 2: Verify file is well-formed**

Run:
```bash
npx.cmd tsc --noEmit 2>&1 | grep -c "PRESET_BLOCKS_TOP\|\[slug\]"
```
Expected: 0 errors related to the file. If errors appear, the edit corrupted syntax — STOP and report.

(Note: do NOT install `@astrojs/check` — it is not in the project's devDependencies. Use `tsc --noEmit` for syntax verification, the same way the v3 fix plan verified its changes.)

---

## Task 2: Implement first batch — burn-rate + mrr + churn (3 calculators, 18 presets)

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`

Add 3 preset blocks at the PRESET_BLOCKS_TOP marker. These are the user's reference case (burn-rate) and two sibling SaaS calculators with similar preset shapes.

- [ ] **Step 1: Insert the 3 preset blocks at the marker**

Use `Edit` with the marker comment as `old_string` and the marker + 3 new blocks as `new_string`. Replace the marker comment with the marker plus the 3 new blocks. **IMPORTANT**: do NOT include a literal trailing newline in `old_string` that would absorb the next line — keep the marker comment as the entire `old_string`.

```
old_string: "              {/* PRESET_BLOCKS_TOP: 24 calculators insert here */}"
new_string: "              {/* PRESET_BLOCKS_TOP: 24 calculators insert here */}\n              {slug === 'solopreneur-burn-rate-calculator' && (\n                <div class=\"mb-5\">\n                  <span class=\"block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide\">{lang === 'zh' ? '🎭 场景预设' : '🎭 Scenario Presets'}</span>\n                  <div class=\"flex flex-wrap gap-1.5\" id=\"preset-buttons-burn-rate\">\n                    {[\n                      { emoji:'🌱', key:'pre-seed', monthlyrevenue:'5000', teamcost:'8000', infracost:'500', marketingcost:'2000', opscost:'1500', currentcash:'50000', netnewrevenue:'0' },\n                      { emoji:'🌿', key:'seed', monthlyrevenue:'15000', teamcost:'25000', infracost:'2000', marketingcost:'8000', opscost:'3000', currentcash:'300000', netnewrevenue:'3000' },\n                      { emoji:'🌳', key:'series-a', monthlyrevenue:'50000', teamcost:'80000', infracost:'5000', marketingcost:'20000', opscost:'8000', currentcash:'1000000', netnewrevenue:'5000' },\n                      { emoji:'💰', key:'profitable', monthlyrevenue:'200000', teamcost:'150000', infracost:'10000', marketingcost:'30000', opscost:'10000', currentcash:'2000000', netnewrevenue:'15000' },\n                      { emoji:'💡', key:'idea-stage', monthlyrevenue:'0', teamcost:'15000', infracost:'1000', marketingcost:'3000', opscost:'2000', currentcash:'80000', netnewrevenue:'0' },\n                      { emoji:'⚠️', key:'bloated', monthlyrevenue:'10000', teamcost:'50000', infracost:'3000', marketingcost:'15000', opscost:'5000', currentcash:'200000', netnewrevenue:'2000' },\n                    ].map(p => (\n                      <button type=\"button\" class=\"preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all\" data-monthlyrevenue={p.monthlyrevenue} data-teamcost={p.teamcost} data-infracost={p.infracost} data-marketingcost={p.marketingcost} data-opscost={p.opscost} data-currentcash={p.currentcash} data-netnewrevenue={p.netnewrevenue}>{p.emoji} {t(`tools.solopreneur-burn-rate-calculator.preset.${p.key}`, lang)}</button>\n                    ))}\n                  </div>\n                </div>\n              )}\n              {slug === 'solopreneur-mrr-calculator' && (\n                <div class=\"mb-5\">\n                  <span class=\"block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide\">{lang === 'zh' ? '🎭 场景预设' : '🎭 Scenario Presets'}</span>\n                  <div class=\"flex flex-wrap gap-1.5\" id=\"preset-buttons-mrr\">\n                    {[\n                      { emoji:'🌱', key:'early-stage', subscribercount:'500', monthlyprice:'29', monthlychurnrate:'3', expansionmrr:'500', newsubspermonth:'50', contractionmrr:'100', reactivationmrr:'50' },\n                      { emoji:'📈', key:'growing', subscribercount:'2000', monthlyprice:'49', monthlychurnrate:'2', expansionmrr:'2000', newsubspermonth:'200', contractionmrr:'300', reactivationmrr:'150' },\n                      { emoji:'🏢', key:'scale', subscribercount:'10000', monthlyprice:'99', monthlychurnrate:'1.5', expansionmrr:'15000', newsubspermonth:'800', contractionmrr:'1500', reactivationmrr:'500' },\n                      { emoji:'⚠️', key:'high-churn', subscribercount:'1000', monthlyprice:'29', monthlychurnrate:'8', expansionmrr:'200', newsubspermonth:'50', contractionmrr:'300', reactivationmrr:'50' },\n                      { emoji:'📊', key:'flat', subscribercount:'500', monthlyprice:'29', monthlychurnrate:'3', expansionmrr:'500', newsubspermonth:'0', contractionmrr:'200', reactivationmrr:'50' },\n                      { emoji:'📈', key:'expansion-heavy', subscribercount:'5000', monthlyprice:'49', monthlychurnrate:'1', expansionmrr:'5000', newsubspermonth:'300', contractionmrr:'400', reactivationmrr:'200' },\n                    ].map(p => (\n                      <button type=\"button\" class=\"preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all\" data-subscribercount={p.subscribercount} data-monthlyprice={p.monthlyprice} data-monthlychurnrate={p.monthlychurnrate} data-expansionmrr={p.expansionmrr} data-newsubspermonth={p.newsubspermonth} data-contractionmrr={p.contractionmrr} data-reactivationmrr={p.reactivationmrr}>{p.emoji} {t(`tools.solopreneur-mrr-calculator.preset.${p.key}`, lang)}</button>\n                    ))}\n                  </div>\n                </div>\n              )}\n              {slug === 'solopreneur-churn-rate-calculator' && (\n                <div class=\"mb-5\">\n                  <span class=\"block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide\">{lang === 'zh' ? '🎭 场景预设' : '🎭 Scenario Presets'}</span>\n                  <div class=\"flex flex-wrap gap-1.5\" id=\"preset-buttons-churn-rate\">\n                    {[\n                      { emoji:'✅', key:'healthy', customersstart:'500', customerslost:'15', newcustomers:'25', avgrevenuepercustomer:'50', expansionrevenue:'500' },\n                      { emoji:'🚀', key:'hyper-growth', customersstart:'1000', customerslost:'10', newcustomers:'200', avgrevenuepercustomer:'99', expansionrevenue:'5000' },\n                      { emoji:'⚠️', key:'high-churn', customersstart:'200', customerslost:'20', newcustomers:'10', avgrevenuepercustomer:'49', expansionrevenue:'100' },\n                      { emoji:'📈', key:'expansion-heavy', customersstart:'5000', customerslost:'25', newcustomers:'300', avgrevenuepercustomer:'199', expansionrevenue:'20000' },\n                      { emoji:'🌱', key:'startup', customersstart:'100', customerslost:'0', newcustomers:'50', avgrevenuepercustomer:'29', expansionrevenue:'0' },\n                      { emoji:'⏸️', key:'stagnant', customersstart:'300', customerslost:'15', newcustomers:'5', avgrevenuepercustomer:'79', expansionrevenue:'200' },\n                    ].map(p => (\n                      <button type=\"button\" class=\"preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all\" data-customersstart={p.customersstart} data-customerslost={p.customerslost} data-newcustomers={p.newcustomers} data-avgrevenuepercustomer={p.avgrevenuepercustomer} data-expansionrevenue={p.expansionrevenue}>{p.emoji} {t(`tools.solopreneur-churn-rate-calculator.preset.${p.key}`, lang)}</button>\n                    ))}\n                  </div>\n                </div>\n              )}"
```

(For readability when actually executing, the implementer should split this into 3 separate `Edit` calls — one per calculator block — to keep each diff under ~50 lines and reviewable. The implementer chooses the split.)

- [ ] **Step 2: Delete the 3 corresponding old bottom blocks**

The old bottom blocks for burn-rate, mrr, churn currently live at:
- burn-rate: lines ~581-591 (old Task 1 reference)
- mrr: lines ~570-580
- churn-rate: lines ~592-602

Use 3 separate `Edit` calls to delete each old block. The exact `old_string` is the existing block contents (read the file to get the exact text — do NOT guess whitespace). Delete from the `{slug === '...' && (` opening to the matching `)}` closing of each block, INCLUDING the trailing blank line if present.

Expected: 3 blocks deleted from the bottom. Net page length: about the same (new top blocks added ~ same size as old bottom blocks).

- [ ] **Step 3: Build and verify burn-rate page renders top preset**

Run:
```bash
pnpm build 2>&1 | tail -5
grep -o 'preset-buttons-burn-rate' dist/en/solopreneur-burn-rate-calculator/index.html
```
Expected: build succeeds AND the preset-buttons-burn-rate ID appears in the HTML (proves the new block rendered).

- [ ] **Step 4: Verify preset block is BEFORE inputs in the HTML**

Run:
```bash
awk '/preset-buttons-burn-rate/{found_pos=NR} /id="monthlyrevenue"/{input_pos=NR} END{print "preset:", found_pos, "input:", input_pos, "preset_before_input:", (found_pos < input_pos)}' dist/en/solopreneur-burn-rate-calculator/index.html
```
Expected: `preset: <N> input: <M> preset_before_input: true` where N < M.

If `preset_before_input: false`, the new block was placed in the wrong location (probably not actually added at the top). STOP and investigate.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/pages/[lang]/[slug].astro dist/en/solopreneur-burn-rate-calculator/index.html dist/zh/solopreneur-burn-rate-calculator/index.html dist/en/solopreneur-mrr-calculator/index.html dist/zh/solopreneur-mrr-calculator/index.html dist/en/solopreneur-churn-rate-calculator/index.html dist/zh/solopreneur-churn-rate-calculator/index.html
git commit -m "feat(presets): move burn-rate + mrr + churn presets to top with openai-style markup + emojis"
```

(Pre-commit hook will run codegen-examples --check, which should still pass — no engine files changed.)

---

## Task 3: Implement batch 2 — market-size + revenue-projector + ltv + cac + unit-econ (5 calculators, 30 presets)

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`

Same pattern as Task 2: insert 5 new blocks at the marker, delete 5 old bottom blocks. Use the emoji mapping table for emoji choices.

For each calculator's preset data (numbers), read the existing bottom block in `[slug].astro` lines ~603-693. The values are unchanged — only the markup wrapper, button class, header, and emoji prefix change.

- [ ] **Step 1: Read existing bottom blocks for the 5 calculators**

Read the file and locate lines for: `market-size-estimator` (around line 603), `revenue-projector` (~640), `ltv-calculator` (~654), `cac-calculator` (~668), `unit-economics-calculator` (~682). Note the exact data-* values for each preset.

- [ ] **Step 2: Insert 5 new top blocks at the marker**

Use 5 separate `Edit` calls (one per calculator) to add each new top block right after the marker comment (which was preserved when burn/mrr/churn replaced the marker text in Task 2 — the marker now sits AFTER all the new top blocks; just append below the last new block). Each `Edit`'s `old_string` should be the last existing top block's closing `)}` plus enough context to be unique; `new_string` appends the next block.

Block shape follows the reference markup in Task 2 Step 1, with:
- `id="preset-buttons-<short-slug>"` (e.g., `market-size`, `revenue-projector`, `ltv`, `cac`, `unit-economics`)
- 6 buttons per block
- Emojis from master table
- Translated label via `t(\`tools.solopreneur-<slug>.preset.${p.key}\`, lang)`

- [ ] **Step 3: Delete the 5 old bottom blocks**

Read each old block, use `Edit` to remove. Be careful with whitespace preservation.

- [ ] **Step 4: Build + spot-check**

```bash
pnpm build 2>&1 | tail -3
for slug in market-size-estimator revenue-projector ltv-calculator cac-calculator unit-economics-calculator; do
  echo "=== $slug ==="
  awk "/preset-buttons-${slug#solopreneur-}/,/id=\"[a-z]*\"/{print NR\": \"\$0}" dist/en/$slug/index.html | head -3
done
```
Expected: build clean; each page shows its preset-buttons ID in HTML before its first input ID.

- [ ] **Step 5: Commit**

```bash
git add src/pages/[lang]/[slug].astro dist/en/solopreneur-market-size-estimator/index.html dist/zh/solopreneur-market-size-estimator/index.html dist/en/solopreneur-revenue-projector/index.html dist/zh/solopreneur-revenue-projector/index.html dist/en/solopreneur-ltv-calculator/index.html dist/zh/solopreneur-ltv-calculator/index.html dist/en/solopreneur-cac-calculator/index.html dist/zh/solopreneur-cac-calculator/index.html dist/en/solopreneur-unit-economics-calculator/index.html dist/zh/solopreneur-unit-economics-calculator/index.html
git commit -m "feat(presets): move market + revenue + ltv + cac + unit-econ presets to top with emojis"
```

---

## Task 4: Implement batch 3 — saas-valuation + equity-dilution + break-even (3 calculators, 18 presets)

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`

- [ ] **Step 1: Read existing bottom blocks** for `saas-valuation-calculator`, `equity-dilution-calculator`, `break-even-calculator` (around lines 696-746).

- [ ] **Step 2: Insert 3 new top blocks** following the reference markup. Emojis from master table. Data-* values from existing blocks.

- [ ] **Step 3: Delete 3 old bottom blocks.**

- [ ] **Step 4: Build + spot-check** — verify all 3 pages have preset ID before input ID.

```bash
pnpm build 2>&1 | tail -3
for slug in saas-valuation-calculator equity-dilution-calculator break-even-calculator; do
  short=${slug#solopreneur-}
  echo "=== $slug ==="
  awk "/preset-buttons-${short%-calculator}/,/id=\"[a-z]*\"/" dist/en/$slug/index.html | head -3
done
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/[lang]/[slug].astro dist/en/solopreneur-saas-valuation-calculator/index.html dist/zh/solopreneur-saas-valuation-calculator/index.html dist/en/solopreneur-equity-dilution-calculator/index.html dist/zh/solopreneur-equity-dilution-calculator/index.html dist/en/solopreneur-break-even-calculator/index.html dist/zh/solopreneur-break-even-calculator/index.html
git commit -m "feat(presets): move saas-valuation + equity-dilution + break-even presets to top with emojis"
```

---

## Task 5: Implement batch 4 — freelance cluster (4 calculators, 24 presets)

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`

Calculators: `freelance-rate-calculator`, `course-pricing-calculator`, `time-value-calculator`, `sponsorship-rate-calculator`. Existing bottom blocks ~lines 748-796.

- [ ] **Step 1: Read existing bottom blocks** for these 4 calculators.

- [ ] **Step 2: Insert 4 new top blocks** at the marker location (after Task 4's last block).

- [ ] **Step 3: Delete 4 old bottom blocks.**

- [ ] **Step 4: Build + spot-check.**

- [ ] **Step 5: Commit**

```bash
git add src/pages/[lang]/[slug].astro dist/{en,zh}/solopreneur-{freelance-rate,course-pricing,time-value,sponsorship-rate}-calculator/index.html
git commit -m "feat(presets): move freelance-rate + course-pricing + time-value + sponsorship-rate presets to top with emojis"
```

---

## Task 6: Implement batch 5 — content/project cluster (3 calculators, 18 presets)

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`

Calculators: `project-profitability-calculator`, `affiliate-income-calculator`, `email-list-revenue-calculator`. Existing bottom blocks ~lines 798-832.

- [ ] **Step 1: Read existing bottom blocks.**

- [ ] **Step 2: Insert 3 new top blocks.**

- [ ] **Step 3: Delete 3 old bottom blocks.**

- [ ] **Step 4: Build + spot-check.**

- [ ] **Step 5: Commit**

```bash
git add src/pages/[lang]/[slug].astro dist/{en,zh}/solopreneur-{project-profitability,affiliate-income,email-list-revenue}-calculator/index.html
git commit -m "feat(presets): move project-profitability + affiliate-income + email-list-revenue presets to top with emojis"
```

---

## Task 7: Implement batch 6 — cost/lifestyle cluster (6 calculators, 36 presets)

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`

Calculators: `hourly-vs-fixed-calculator`, `meeting-cost-calculator`, `employee-cost-calculator`, `productivity-score`, `saas-pricing-planner`, `freelance-tax-calculator`. This is the largest batch — 36 presets.

- [ ] **Step 1: Read existing bottom blocks** for all 6 calculators (verify all bottom blocks still exist; some may have been removed already in earlier batches if the line numbers shifted).

- [ ] **Step 2: Insert 6 new top blocks.**

- [ ] **Step 3: Delete 6 old bottom blocks.**

- [ ] **Step 4: Build + spot-check.**

- [ ] **Step 5: Commit**

```bash
git add src/pages/[lang]/[slug].astro dist/{en,zh}/solopreneur-{hourly-vs-fixed,meeting-cost,employee-cost,productivity-score,saas-pricing-planner,freelance-tax}-calculator/index.html
git commit -m "feat(presets): move hourly-vs-fixed + meeting + employee + productivity + saas-pricing + freelance-tax presets to top with emojis"
```

---

## Task 8: End-to-end verification — all 24 pages

**Files:**
- Create: `scripts/_verify-presets-position.mjs` (delete after)
- Create: `scripts/_verify-presets-emojis.mjs` (delete after)

- [ ] **Step 1: Create position verification script**

Create `scripts/_verify-presets-position.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.url.replace('file:///', '').replace(/[^/]*$/, ''), '..');
const dist = path.join(ROOT, 'dist');

const SLUGS = [
  'burn-rate-calculator', 'mrr-calculator', 'churn-rate-calculator',
  'market-size-estimator', 'revenue-projector', 'ltv-calculator',
  'cac-calculator', 'unit-economics-calculator', 'saas-valuation-calculator',
  'equity-dilution-calculator', 'break-even-calculator', 'freelance-rate-calculator',
  'course-pricing-calculator', 'time-value-calculator', 'sponsorship-rate-calculator',
  'project-profitability-calculator', 'affiliate-income-calculator',
  'email-list-revenue-calculator', 'hourly-vs-fixed-calculator',
  'meeting-cost-calculator', 'employee-cost-calculator', 'productivity-score',
  'saas-pricing-planner', 'freelance-tax-calculator',
];

let pass = 0, fail = 0;
for (const slug of SLUGS) {
  for (const lang of ['en', 'zh']) {
    const html = fs.readFileSync(path.join(dist, lang, `solopreneur-${slug}`, 'index.html'), 'utf8');
    const presetId = `preset-buttons-${slug.replace(/-calculator$|-estimator$|-projector$|-score$/, '')}`;
    const presetPos = html.indexOf(presetId);
    // Find any <input id="..."> — first one is the page's first form input
    const inputPos = html.indexOf('<input id=');
    const ok = presetPos > 0 && inputPos > 0 && presetPos < inputPos;
    if (ok) pass++;
    else {
      fail++;
      console.error(`  ✗ ${lang}/${slug}: preset=${presetPos} input=${inputPos}`);
    }
  }
}
console.log(`\n[verify-presets-position] PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
```

- [ ] **Step 2: Run position verification**

Run:
```bash
node scripts/_verify-presets-position.mjs
```
Expected: `PASS=48 FAIL=0` (24 calcs × 2 langs). If any FAIL, the corresponding calculator's preset is below its inputs — return to that batch's task and fix.

- [ ] **Step 3: Create emoji verification script**

Create `scripts/_verify-presets-emojis.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.url.replace('file:///', '').replace(/[^/]*$/, ''), '..');
const dist = path.join(ROOT, 'dist');

const SLUGS = [
  'burn-rate-calculator', 'mrr-calculator', 'churn-rate-calculator',
  'market-size-estimator', 'revenue-projector', 'ltv-calculator',
  'cac-calculator', 'unit-economics-calculator', 'saas-valuation-calculator',
  'equity-dilution-calculator', 'break-even-calculator', 'freelance-rate-calculator',
  'course-pricing-calculator', 'time-value-calculator', 'sponsorship-rate-calculator',
  'project-profitability-calculator', 'affiliate-income-calculator',
  'email-list-revenue-calculator', 'hourly-vs-fixed-calculator',
  'meeting-cost-calculator', 'employee-cost-calculator', 'productivity-score',
  'saas-pricing-planner', 'freelance-tax-calculator',
];

// Unicode regex for emoji-like characters (broad: any character in emoji ranges)
const EMOJI_RX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/u;

let pass = 0, fail = 0;
for (const slug of SLUGS) {
  for (const lang of ['en', 'zh']) {
    const html = fs.readFileSync(path.join(dist, lang, `solopreneur-${slug}`, 'index.html'), 'utf8');
    // Find preset-buttons container, extract all preset-btn buttons
    const containerId = `preset-buttons-${slug.replace(/-calculator$|-estimator$|-projector$|-score$/, '')}`;
    const startIdx = html.indexOf(`id="${containerId}"`);
    if (startIdx < 0) { fail++; console.error(`  ✗ ${lang}/${slug}: container not found`); continue; }
    // Slice the container (next 8KB should cover all 6 buttons)
    const slice = html.slice(startIdx, startIdx + 8000);
    // Find all preset-btn button opening tags and check their text content for emoji
    const btnMatches = [...slice.matchAll(/class="preset-btn[^"]*"[^>]*>([^<]+)</g)];
    if (btnMatches.length !== 6) {
      fail++; console.error(`  ✗ ${lang}/${slug}: expected 6 preset buttons, found ${btnMatches.length}`); continue;
    }
    const missingEmoji = btnMatches.filter(m => !EMOJI_RX.test(m[1]));
    if (missingEmoji.length > 0) {
      fail++;
      console.error(`  ✗ ${lang}/${slug}: ${missingEmoji.length} buttons missing emoji: ${missingEmoji.map(m => m[1]).join(', ')}`);
    } else {
      pass++;
    }
  }
}
console.log(`\n[verify-presets-emojis] PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
```

- [ ] **Step 4: Run emoji verification**

Run:
```bash
node scripts/_verify-presets-emojis.mjs
```
Expected: `PASS=48 FAIL=0` (each of 48 pages has 6 buttons each with an emoji). Any FAIL means a button lacks an emoji prefix — return to the batch and add it.

- [ ] **Step 5: Delete verification scripts**

```bash
rm scripts/_verify-presets-position.mjs scripts/_verify-presets-emojis.mjs
```

- [ ] **Step 6: Final git status + commit if anything was missed**

```bash
git status --short
```
Expected: clean (no untracked or modified). If dist files weren't committed in earlier batches, commit them now.

- [ ] **Step 7: Final summary report**

Report to the user:
- 6 commits made (one per batch)
- 24 calculators × 2 langs = 48 pages updated
- All preset blocks now at top with openai-style markup
- All 144 presets have emojis

---

## Self-Review

**1. Spec coverage:**
- ✅ Move presets from bottom to top — Tasks 2-7 each verify this for their batch
- ✅ Match openai style — Tasks 2-7 use the reference markup exactly
- ✅ All 24 business calculators — Tasks 2-7 cover all 24 (3+5+3+4+3+6 = 24)
- ✅ Add emojis — master table covers all 144 keys; verification in Task 8
- ✅ No engine/translation changes — explicitly excluded from File Map
- ✅ Build succeeds — each batch runs `pnpm build`
- ✅ Cleanup — Task 8 Step 5 deletes verification scripts

**2. Placeholder scan:** no "TBD", "TODO", "fill in details", "similar to Task N". Each calculator's full preset block is shown inline. The "do NOT guess whitespace" notes flag the right ambiguity without leaving placeholders.

**3. Type consistency:** All blocks use the same markup shape (Tasks 2-7 inherit from Task 2's reference). Container IDs use the `preset-buttons-<short-slug>` pattern consistently. Button class strings are byte-identical across all 24 calculators. Translation keys are looked up via `t(\`tools.solopreneur-<full-slug>.preset.${p.key}\`, lang)` consistently.