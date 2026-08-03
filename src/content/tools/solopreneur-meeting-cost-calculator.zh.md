---
engine_ref: 'solopreneur-meeting-cost-calculator'
category_id: 'E'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'Atlassian State of Teams 2024'
    url: 'https://www.atlassian.com/blog/state-of-teams'
  - name: 'Asana Anatomy of Work Index 2024'
    url: 'https://asana.com/anatomy-of-work'
  - name: 'Harvard Business Review — The Cost of Meetings'
    url: 'https://hbr.org/2017/08/the-cost-of-meetings'
---

## 这个计算器衡量什么

会议是独立创业者日历上最大、最可控的成本。本工具把会议的成本（参会
人数 × 小时费率 × 时长 × 频次）翻译成单次会议美元成本、周/季/年
烧钱、人时浪费，并叠加 1.5× 的**上下文切换惩罚**（Atlassian State
of Teams 2024）呈现真实生产力拖累。可用于砍掉不再划算的例会，或者
为「用 Loom + 异步串替代每周 $500 的同步会」提供数据支撑。

## 计算方法

我们使用的 v3 标准公式：

```
costPerMeeting      = attendees × avgHourlyRate × (meetingMinutes / 60)
weeklyCost          = costPerMeeting × meetingsPerWeek
quarterlyCost       = (weeklyCost × 48) / 4
annualCost          = weeklyCost × 48                // 48 个工作周
trueCostWithContext = annualCost × 1.5               // 恢复 + 收尾损失
annualHours         = attendees × (meetingMinutes / 60) × meetingsPerWeek × 48
contextSwitchMult   = 1.5                              // Atlassian 2024 基准
asyncCost           = weeklyCost × 0.1                 // Slack/Loom/Notion 代理
```

| 变量              | 含义                                            |
| ----------------- | ----------------------------------------------- |
| `attendees`       | 在场人数（高管 + 基层分别算）                   |
| `avgHourlyRate`   | fully-loaded 小时成本（年薪 ÷ 2,080）           |
| `meetingMinutes`  | 整块时长，含超时（向上取整）                    |
| `meetingsPerWeek` | 频次 —— 例会默认 1×                            |
| `contextSwitch`   | 1.5× 倍数 = 30 分钟会议附 30 分钟聚焦损失       |
| `annualHours`     | 该会议每年消耗的人时                            |

48 周年度扣除 4 周带薪假/节假日（BLS 美国中位数）。1.5× 上下文切换
overhead 是下限；Microsoft Workplace Analytics 把深度工作被打断时
该数字放在 2×。异步成本是有意保守的估计（仅 license + 写作者时间），
实操中良好运行的异步工作能以 5-10% 成本还原 90% 的会议价值。

## 局限性 / 何时不适用

本模型假设**全员同步在场**。若是「一人讲、10 人听」的宣讲型会议，
异步等价物（5 分钟 Loom）可还原 90% 价值、近零成本。计算器只取一个
`avgHourlyRate`；高管密集型会议应按真实机会成本上调 30-50%
（Atlassian 2024 引用：科技公司资深工程师约 $1,200/hr）。面向客户、
销售会议不在范围内 —— 那是产生收入的，不是成本。

## 案例走读

假设一个 30 分钟、6 人、$75/hr fully-loaded 的周会：

1. `costPerMeeting` = 6 × $75 × (30/60) = **$225/次**。
2. `weeklyCost` = $225 × 1 = **$225/周**（3 人时）。
3. `annualCost` = $225 × 48 = **$10,800/年**（144 人时）。
4. **含上下文切换（×1.5）= $16,200/年** 真实生产力拖累。
5. **年度 FTE 等效** = 144 / 2,080 = **0.07 FTE**。
6. **异步替代**约 $22/周（Loom + Slack），**省 $9,720/年**。

工具的 What-If 段模拟：参会减半（省 $5,400/年）、时长砍 25%（省
$2,700/年）、30 分钟默认改 25 分钟（省 $1,836/年）、完全异步（省
全部 $10,800/年）。搭配 **Employee Cost Calculator** 看每位参会者
的真正小时成本。