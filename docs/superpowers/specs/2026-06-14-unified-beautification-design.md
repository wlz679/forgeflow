# Unified Beautification Engine — Design Spec

> 将 7 个 AI 计算器的美化逻辑统一为 `beautifySections()` 通用函数，达到 OpenAI 同等级别的 CSS 美化效果。

**版本:** v1  
**日期:** 2026-06-14  
**状态:** Design

---

## 1. 问题

当前每个计算器的 `beautifyXxx()` 只有 ~10 行，仅做了图标染色，未实现：
- CSS 柱状条（百分比宽度 + 家族色渐变）
- Detail Cards（彩色边框/背景卡片）
- Growth Projection（HTML table）
- Insights（信息卡片）
- Usage Scenarios（样式化行）

只有 OpenAI 计算器（`beautifyOpenAI`）拥有完整的 300+ 行美化逻辑。

## 2. 方案

### 2.1 通用函数签名

```typescript
function beautifySections(text: string, config: FamilyConfig): string
```

### 2.2 FamilyConfig 接口

```typescript
interface FamilyConfig {
  // 图标 → 颜色映射
  families: Record<string, {
    bg: string;      // 卡片背景色
    bar: string;     // 柱状条颜色
    border: string;  // 卡片边框色
    text?: string;   // 图标颜色（可选）
  }>;
  // 图标检测正则（匹配单行开头的家族图标）
  iconPattern: RegExp;
  // 默认家族色（fallback）
  defaultFamily: { bg: string; bar: string; border: string };
}
```

### 2.3 各计算器配置

| 计算器 | 图标集 | 配色方案 |
|--------|--------|----------|
| OpenAI | 🔵🟢🟠⚪ | 蓝#3b82f6 / 绿#22c55e / 橙#f97316 / 灰#9ca3af |
| Claude | ✦▲◆ | 紫#7c3aed / 蓝#2563eb / 灰#6b7280 |
| DeepSeek | ◆◇ | 绿#16a34a / 灰#9ca3af |
| Gemini | ●▲◆◇ | 绿#16a34a / 蓝#3b82f6 / 青#0891b2 / 灰#9ca3af |
| AI Comparison | [O][A][G][D] | 绿#10b981 / 紫#7c3aed / 蓝#3b82f6 / 琥珀#f59e0b |
| Image Gen | 按供应商 | 各自品牌色 |
| Training | 按规模 | 渐变蓝 |
| GPU Cloud | 按供应商 | 各自品牌色 |

### 2.4 Section 自动检测

通过正则匹配 section 边界：

1. **Bar Chart**: 检测 `Cost Comparison` 标题行 → 解析 `icon name spaces bars cost` 格式
2. **Detail Cards**: 检测 `Context:` / `Rate:` 等关键词 → 卡片边界检测
3. **Caching/Special**: 检测 `💾` / `🧠` / `Breakdown` → 特殊信息卡
4. **Growth Table**: 检测 `Month` + `│` 管道符 → HTML table
5. **Insights**: 检测 `Savings` / `vs` 行 → 对比信息卡
6. **Scenarios**: 检测 `→` 分隔的多档位 → 样式化行

### 2.5 实现策略

1. **Step 1**: 在 `[lang]/[slug].astro` 中编写 `beautifySections()` 通用函数
2. **Step 2**: 删除 7 个独立 `beautifyXxx()` 函数，替换为配置对象 + 调用 `beautifySections()`
3. **Step 3**: 每个计算器的实现简化为：
   ```javascript
   if (isOpenAI) {
     monoDiv.innerHTML = beautifySections(text, OPENAI_FAMILY_CONFIG);
   }
   if (isClaude) {
     monoDiv.innerHTML = beautifySections(text, CLAUDE_FAMILY_CONFIG);
   }
   // ... etc
   ```

---

## 3. 检查清单

- [ ] `beautifySections()` 通用函数实现（~300 lines）
- [ ] OpenAI 迁移到 `beautifySections()` + `OPENAI_CONFIG`
- [ ] Claude 切换到 `beautifySections()` + `CLAUDE_CONFIG`
- [ ] DeepSeek 切换到 `beautifySections()` + `DEEPSEEK_CONFIG`
- [ ] Gemini 切换到 `beautifySections()` + `GEMINI_CONFIG`
- [ ] AI Comparison 切换到 `beautifySections()` + `COMPARISON_CONFIG`
- [ ] AI Image 切换到 `beautifySections()` + `IMAGE_CONFIG`
- [ ] AI Training 切换到 `beautifySections()` + `TRAINING_CONFIG`
- [ ] GPU Cloud 切换到 `beautifySections()` + `GPU_CONFIG`
- [ ] 静态示例美化 + 动态结果美化都走统一函数
- [ ] `pnpm build` 零错误
