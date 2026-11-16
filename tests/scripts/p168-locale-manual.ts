// P168 B3-8 —— **手工补的分支专属模板**（静态推导与运行时探针都够不到的那几个）。
//
// ⭐ 为什么需要它
//   25 个分支专属 token 里，有 2 个是**死分支**：
//     · calc_out.safe_convertible_note.row.type_custom
//     · calc_out.safe_convertible_note.row.type_discount_only
//   它们的 fallback 是**运行时变量**（`type`），而 `type` 来自 safeType() 的**字面量枚举**：
//     safeType(postMoneyCap, discountRate) 只返回 4 个固定字符串：
//       'Post-Money SAFE (YC Standard)' / 'Post-Money SAFE with Discount'
//       / 'Discount-Only SAFE (Pre-Conversion)' / 'Custom SAFE'
//   ⇒ 每个分支的 fallback **恒定** ⇒ 模板就是那个字面量。
//
// ⚠️ 为什么探针跑不到（不是「跑得少」，是**根本到不了**）
//   服务端 calculateSafe 在 postMoneyCap <= investment 时**提前返回错误行**
//   （error_cap_not_exceeding_investment）⇒ postMoneyCap=0 的两条分支永远走不到；
//   客户端 customFn 的守卫 `if(c>0&&c<=i)` 完全一致 ⇒ 两端同样到不了。
//   ⇒ 死分支（与 stockout_cost.row.break_even_max_days_na 等同类）。
//
// ⚠️ 为什么写「字面量」而不是「{type} 占位符」
//   这两个 token **没有 params**（makeToken(code, type) 只传两个实参）
//   ⇒ 模板里写 {type} 不会被回填 ⇒ 页面会显示字面量 "{type}" ⇒ 必须是字面量。

export const MANUAL_BRANCH_TEMPLATES: Record<string, string> = {
  'calc_out.safe_convertible_note.row.type_discount_only': 'Discount-Only SAFE (Pre-Conversion)',
  'calc_out.safe_convertible_note.row.type_custom': 'Custom SAFE',
};
