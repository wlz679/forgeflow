#!/usr/bin/env python3
"""P69 T1: Generate zh translations for 100 blog posts and inject into translations.ts.

Reads src/content/blog/best-*.md frontmatter, generates zh title/excerpt,
inserts 200 new keys after the existing `blog.page_title` entry in src/i18n/translations.ts.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
BLOG_DIR = ROOT / "src" / "content" / "blog"
TS_FILE = ROOT / "src" / "i18n" / "translations.ts"

# Calculator-name → zh keyword (used in title and excerpt zh)
ZH_NAME = {
    "Activation Rate": "激活率",
    "ACV Calculator": "ACV 计算器",
    "Affiliate Income Calculator": "联盟营销收入计算器",
    "AI API Cost Comparison": "AI API 成本对比",
    "AI Image Generation Cost Calculator": "AI 图像生成成本计算器",
    "AI Training Cost Estimator": "AI 训练成本估算器",
    "ARR Multiple / Valuation Multiplier Calculator": "ARR 倍数 / 估值倍数计算器",
    "Article Freshness": "文章新鲜度",
    "Article Helpfulness Score": "文章有用性评分",
    "Attrition Cost": "员工流失成本",
    "Data Breach Notification Cost": "数据泄露通知成本",
    "Break-Even Calculator": "盈亏平衡计算器",
    "BRRRR Calculator": "BRRRR 计算器",
    "Burn Multiple / Rule of 40 Calculator": "烧钱倍数 / 40 法则计算器",
    "Burn Rate Calculator": "烧钱速度计算器",
    "CAC Calculator": "CAC（客户获取成本）计算器",
    "Cap Rate Calculator": "资本化率计算器",
    "Carrying Cost Calculator": "持有成本计算器",
    "Cart Abandonment Cost Calculator": "购物车放弃成本计算器",
    "Churn Rate Calculator": "客户流失率计算器",
    "Claude API Cost Calculator": "Claude API 成本计算器",
    "CMP ROI": "CMP 投资回报",
    "Cohort Retention Calculator": "队列留存计算器",
    "Compensation Banding": "薪酬带宽",
    "Compound Interest Calculator": "复利计算器",
    "Cookie Consent Revenue Impact": "Cookie 同意收入影响",
    "Content Marketing ROI Calculator": "内容营销 ROI 计算器",
    "Cost-per-Support-Ticket": "单次客服工单成本",
    "Coupon Attribution Calculator": "优惠券归因计算器",
    "Course Pricing Calculator": "课程定价计算器",
    "CSAT (Customer Satisfaction) Calculator": "CSAT（客户满意度）计算器",
    "Customer Health Score Calculator": "客户健康度评分计算器",
    "DeepSeek API Cost Calculator": "DeepSeek API 成本计算器",
    "Deflection Quality": "自助分流质量",
    "Self-Service Deflection Rate Calculator": "自助分流率计算器",
    "Documentation ROI": "文档 ROI",
    "DPA Negotiation Cost": "DPA（数据处理协议）协商成本",
    "DSAR Processing Cost": "DSAR 处理成本",
    "DSCR Calculator (Debt Service Coverage Ratio)": "DSCR（偿债覆盖率）计算器",
    "Email Campaign ROI Calculator": "邮件营销 ROI 计算器",
    "Email List Revenue Calculator": "邮件列表收入计算器",
    "Employee Cost Calculator": "员工成本计算器",
    "Equity Dilution Calculator": "股权稀释计算器",
    "Equity Refresh Grant": "股权刷新授予",
    "Expansion Revenue Calculator": "扩展收入计算器",
    "Feature Adoption Rate": "功能采用率",
    "First Response Time SLA Calculator": "首次响应时间 SLA 计算器",
    "Freelance Rate Calculator": "自由职业费率计算器",
    "Freelance Tax Calculator": "自由职业税务计算器",
    "Order Fulfillment Cost Calculator": "订单履约成本计算器",
    "Fully-Loaded Employee Cost": "全员人力成本",
    "Funnel Step Conversion Analyzer": "漏斗步骤转化分析器",
    "Funnel Value Calculator": "漏斗价值计算器",
    "GDPR Fine Risk": "GDPR 罚款风险",
    "Gemini API Cost Calculator": "Gemini API 成本计算器",
    "GPU Cloud Cost Calculator": "GPU 云成本计算器",
    "GRR Calculator": "GRR（毛利率留存）计算器",
    "Hourly vs Fixed Rate Calculator": "时薪 vs 固定费率计算器",
    "Inventory Turnover Calculator": "库存周转计算器",
    "KB Coverage Rate": "知识库覆盖率",
    "Logo Churn Rate Calculator": "Logo 流失率计算器",
    "LTV by Channel Calculator": "渠道 LTV 计算器",
    "LTV Calculator": "LTV（客户生命周期价值）计算器",
    "Market Size Estimator": "市场规模估算器",
    "Meeting Cost Calculator": "会议成本计算器",
    "Mortgage Calculator": "按揭计算器",
    "MRR Calculator": "MRR（月经常性收入）计算器",
    "NRR Calculator": "NRR（净收入留存）计算器",
    "OpenAI Token Calculator": "OpenAI Token 成本计算器",
    "Pipeline Coverage Calculator": "销售管道覆盖率计算器",
    "Pipeline Value Calculator": "销售管道价值计算器",
    "Power User Pareto Curve": "头部用户帕累托曲线",
    "Productivity Ramp Curve": "生产力提升曲线",
    "Productivity Score Calculator": "生产力评分计算器",
    "Project Profitability Calculator": "项目盈利能力计算器",
    "Quota Attainment Calculator": "配额达成计算器",
    "Remote vs In-Office Cost Calculator": "远程 vs 办公室成本计算器",
    "Renewal Rate Calculator": "续约率计算器",
    "Rental Yield / Cash-on-Cash Calculator": "租金回报率 / 现金回报率计算器",
    "Rent vs Buy Calculator": "租 vs 买计算器",
    "Reorder Point Calculator": "再订货点计算器",
    "Resolution Time Calculator": "问题解决时间计算器",
    "SaaS Financial Forecaster": "SaaS 财务预测器",
    "ROAS Calculator": "ROAS（广告投资回报率）计算器",
    "SaaS Pricing Planner": "SaaS 定价规划器",
    "SaaS Valuation Calculator": "SaaS 估值计算器",
    "SAFE / Convertible Note Calculator": "SAFE / 可转债计算器",
    "Sales Velocity Calculator": "销售速度计算器",
    "Search Effectiveness": "搜索有效性",
    "Sponsorship Rate Calculator": "赞助费率计算器",
    "Stickiness (DAU/MAU)": "粘性 (DAU/MAU)",
    "Stockout Cost Calculator": "缺货成本计算器",
    "Stripe Fee Calculator": "Stripe 手续费计算器",
    "Supplier Performance Scorecard Calculator": "供应商绩效评分卡计算器",
    "Support Team Capacity Planning Calculator": "客服团队容量规划计算器",
    "Time to Productivity (Ramp Time)": "达到生产力的时间（上手时间）",
    "Time-to-Value (TTV)": "价值实现时间（TTV）",
    "Time Value Calculator": "时间价值计算器",
    "Unit Economics Calculator": "单位经济计算器",
    "Win Rate by Stage Calculator": "阶段胜率计算器",
}


def parse_frontmatter(md_path: Path) -> dict:
    """Pull title/excerpt from a blog markdown frontmatter block."""
    text = md_path.read_text(encoding="utf-8")
    # Frontmatter between two '---' lines
    m = re.match(r"---\n(.*?)\n---", text, re.DOTALL)
    if not m:
        raise RuntimeError(f"No frontmatter in {md_path}")
    fm = m.group(1)
    out = {}
    for line in fm.split("\n"):
        mm = re.match(r"^(\w+):\s*'(.*)'$", line)
        if not mm:
            continue
        out[mm.group(1)] = mm.group(2)
    if "title" not in out or "excerpt" not in out:
        raise RuntimeError(f"Missing title/excerpt in {md_path}: {out!r}")
    return out


def extract_keyword(title: str) -> str:
    """Strip 'Best ... for Entrepreneurs (2026)' → '...'."""
    m = re.match(r"^Best (.+) for Entrepreneurs \(2026\)$", title)
    if not m:
        raise RuntimeError(f"Unexpected title format: {title!r}")
    return m.group(1)


def make_translations(slug: str, title: str, excerpt: str) -> tuple[str, str]:
    """Return (zh title, zh excerpt) for one slug."""
    keyword_en = extract_keyword(title)
    keyword_zh = ZH_NAME.get(keyword_en)
    if keyword_zh is None:
        raise RuntimeError(f"No zh mapping for {keyword_en!r} (slug={slug})")
    title_zh = f"最佳 {keyword_zh}（2026）"

    # Verify excerpt follows the canonical pattern (case-insensitive)
    expected_prefix_lc = "discover the best "
    if not excerpt.lower().startswith(expected_prefix_lc + keyword_en.lower()):
        raise RuntimeError(
            f"Excerpt keyword mismatch in {slug}: "
            f"expected lower '{keyword_en.lower()!r}' after prefix, got excerpt head {excerpt[:80]!r}"
        )
    rest_en = excerpt[len(expected_prefix_lc + keyword_en):]  # use original-case lengths
    if not rest_en.startswith(" to grow your solo business."):
        raise RuntimeError(
            f"Excerpt 'to grow your solo business.' not found right after keyword in {slug}: "
            f"{excerpt[:120]!r}"
        )
    rest_zh = " 免费，无需注册。通过我们的分步指南掌握高效使用此工具的方法。"
    excerpt_zh = f"探索最佳{keyword_zh}，助力你的独立业务增长。{rest_zh}"
    return title_zh, excerpt_zh


def main() -> int:
    md_files = sorted(BLOG_DIR.glob("best-*.md"))
    assert len(md_files) == 100, f"Expected 100 blog files, got {len(md_files)}"

    lines_out: list[str] = []
    for md in md_files:
        slug = md.stem  # e.g. best-solopreneur-activation-rate-calculator
        fm = parse_frontmatter(md)
        title_zh, excerpt_zh = make_translations(slug, fm["title"], fm["excerpt"])
        lines_out.append((slug, fm["title"], title_zh, fm["excerpt"], excerpt_zh))

    # Verification pass: 100 unique slugs, all en/zh present
    assert len(lines_out) == 100
    slugs = {l[0] for l in lines_out}
    assert len(slugs) == 100, "duplicate slugs"

    # Build TS fragment
    block_lines: list[str] = []
    block_lines.append("")
    block_lines.append("  // ===== Blog posts (auto-generated 200 keys for 100 blog posts) =====")
    for slug, en_title, zh_title, en_excerpt, zh_excerpt in lines_out:
        block_lines.append(f"  'blog.{slug}.title': {{")
        block_lines.append(f"    en: '{en_title}',")
        block_lines.append(f"    zh: '{zh_title}',")
        block_lines.append(f"  }},")
        block_lines.append(f"  'blog.{slug}.excerpt': {{")
        block_lines.append(f"    en: '{en_excerpt}',")
        block_lines.append(f"    zh: '{zh_excerpt}',")
        block_lines.append(f"  }},")
    block = "\n".join(block_lines)

    # Inject after line containing `blog.page_title` entry
    ts_text = TS_FILE.read_text(encoding="utf-8")
    needle = "  'blog.page_title': { en: 'ForgeFlowKit Tips & Tools Blog', zh: 'ForgeFlowKit 技巧与工具博客' },\n"
    if needle not in ts_text:
        raise RuntimeError("Couldn't find blog.page_title entry to inject after")
    new_text = ts_text.replace(needle, needle + block)
    TS_FILE.write_text(new_text, encoding="utf-8")
    print(f"OK: wrote 200 new keys for {len(lines_out)} blog posts")
    print(f"File size: {len(ts_text)} → {len(new_text)} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
