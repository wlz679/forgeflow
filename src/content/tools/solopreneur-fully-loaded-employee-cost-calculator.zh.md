---
slug: 'solopreneur-fully-loaded-employee-cost-calculator-zh'
engine_ref: 'solopreneur-fully-loaded-employee-cost-calculator'
category_id: 'H'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'BLS — 雇主对员工补偿成本（ECEC）2024'
    url: 'https://www.bls.gov/news.release/ecec.toc.htm'
  - name: 'SHRM — 2024 员工福利调研'
    url: 'https://www.shrm.org/topics-tools/news/talent-acquisition/2024-benefits-survey'
  - name: 'Pave — 2024 薪酬基准'
    url: 'https://www.pave.com/compensation-benchmarks'
---

## 这个计算器衡量什么

完全装载成本（fully-loaded cost）是一个员工除底薪之外的**真实**年度
成本——它把雇主承担的福利（医保、牙科、退休匹配、带薪假期计提）、
雇主侧的 payroll tax（FICA、FUTA、SUTA）以及人均 overhead（笔记本、
软件席位、办公空间、管理层分摊）一次性算进来。结果同时给出美元总额
和相对底薪的**倍数**（multiplier）——这样你就能跨角色、跨团队、跨
headcount 计划比较「组织效率」，而不会被岗位级别本身的高底薪干扰。
对一家年收入 $10M–$50M 的中端 B2B SaaS 来说，这就是 CFO 和人事负责人
在批 hire 申请时实际对线的数字。

## 计算方法

```
完全装载 = 底薪
         + 底薪 × 福利比例 / 100
         + 底薪 × PayrollTax 比例 / 100
         + 底薪 × Overhead 比例 / 100

倍数 = 完全装载 / 底薪
```

| 变量            | 含义                                                        |
| --------------- | ----------------------------------------------------------- |
| `底薪`          | 年度总底薪，不含奖金和股权                                  |
| `福利比例`      | 医保 + 401k + 带薪假 占底薪百分比（中端 SaaS 典型 20–30%） |
| `PayrollTax`    | FICA 7.65% + FUTA/SUTA 0.5–2.5% 占底薪比例（典型 8–10%）     |
| `Overhead`      | 设备 + 软件 + 管理层分摊 占底薪比例（典型 10–20%）          |
| `倍数`          | 完全装载 / 底薪（BLS 美国私营平均约 1.30x）                 |

倍数区间（数值越低越精简）：🟢 ≤1.25x — 精简，完全贴合 BLS 平均 ·
🟡 1.25–1.40x — 中端 SaaS 典型水平，留有小优化空间 · 🟠 1.40–1.60x
— 高于市场，需要审视福利供应商或管理层臃肿 · 🔴 >1.60x — 每次 hire
都比底薪高出 60% 以上，结构性 overhead 失衡。所有输入会被截断为非负。
给 `底薪 = 0` 时仍可计算倍数上限，便于 headcount 计划阶段的预算封顶。

## 局限性 / 何时不适用

这是以 BLS ECEC 为锚的**美国私营行业**模型——**不包含**股权（RSU
或期权）、不含雇主支付的培训预算、也不分摊 sign-on bonus（股权部分
请用股权刷新计算器分别建模）。地理生活成本摆动会同时移动三项输入：
一个 SF 本地的资深工程师和一个 Remote-US 工程师都是 1.30x，但美元
总额差很多——用这个工具比较**结构**而非跨区域的绝对成本。最后，
contractor（1099-NEC）走的是完全不同的公式（无 payroll tax、无福利），
本工具不能直接拿来比较 W-2 和 1099 的经济性，请为 contractor
单建模型。

## 案例走读

假设一家中端 B2B SaaS 在招资深软件工程师，`底薪 = $120,000`，
`福利比例 = 25`，`PayrollTax = 8`，`Overhead = 15`：

1. `福利` = $120,000 × 25 / 100 = **$30,000**
2. `PayrollTax` = $120,000 × 8 / 100 = **$9,600**
3. `Overhead` = $120,000 × 15 / 100 = **$18,000**
4. `完全装载` = $120,000 + $30,000 + $9,600 + $18,000 = **$177,600**
5. `倍数` = $177,600 / $120,000 = **1.48x** → 🟠 Warning

1.48x 落在橙色带——先查 25% 的福利（改 HDHP+HSA 降到 20% 可压到
1.43x），再看 15% 的 overhead（把笔记本换机周期从 1 年延到 2 年可
压到 1.43x）。搭配 **离职成本计算器** 可以模型出这个岗位如果离职后
backfill 的美元影响，搭配 **薪酬带计算器** 可以反查 $120K 在该区域
是否在市场 P50 以上。
