// P165 —— 分类 R（Retention & Customer Success / 留存与客户成功）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const R: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Six calculators, three different units of measurement, and an order that matters: split the revenue story apart, add it back together, then find out which accounts are driving the number.',
    zh: '这六个计算器量的是三件不同的事，顺序错了，留存的讨论就会跑偏：先把收入的故事拆开，再合回去看总分，最后才去找是哪些账户在拖累这个数字。',
  },
  chain: [
    {
      slugs: ['solopreneur-grr-calculator'],
      purpose: {
        en: 'Start with the leak, not the total. GRR strips expansion out entirely, so it tells you how much of the revenue you began the period with would still be there if nobody ever bought more. That number is the floor everything else sits on, and it is the only clean way to separate customers leaving from you simply not growing.',
        zh: '先看漏桶，别先看总分。GRR 把扩展整个剔掉，告诉你假设现有客户再也不加购，期初那笔收入还能剩下多少。这个数是其它所有结论的地板 —— 只有把它单独拿出来，才能把「客户在走」和「我们没长」分开。',
      },
    },
    {
      slugs: ['solopreneur-expansion-revenue-calculator'],
      purpose: {
        en: 'Now measure the other half: what existing accounts add on their own, through upgrades and extra purchases. Once you know how fast the bucket refills, you can hold the leak and the refill side by side and see which one is actually doing the damage.',
        zh: '接着量另一半：现有客户自己加出来的钱 —— 升级、多买，一共有多少。知道桶补得多快，才好把漏的那一半和补的那一半并排放着看，看清楚是哪一头在拖后腿。',
      },
    },
    {
      slugs: ['solopreneur-nrr-calculator'],
      purpose: {
        en: 'Put the two halves together and you get the single number most teams are asked for: what share of the starting revenue is still there once churn, contraction and expansion are netted off. Only now is the result diagnosable, because a shortfall traces back to the leak, the refill, or both.',
        zh: '把两半合起来，就是大多数团队被追问的那个数：扣掉流失、收缩，再加上扩展之后，期初的收入还剩多少。到这一步结论才可诊断 —— 差距能追回到漏的那一半、补的那一半，或者两头都占。',
      },
    },
    {
      slugs: [
        'solopreneur-logo-churn-rate-calculator',
        'solopreneur-renewal-rate-calculator',
        'solopreneur-customer-health-score-calculator',
      ],
      purpose: {
        en: 'Finally translate the revenue story into names. Pick the unit your business actually churns in — accounts, contracts, or a per-account risk score — because losing an account and losing revenue are different events, and chasing the wrong one sends the team after the wrong customers.',
        zh: '最后把收入的故事翻译成名字。按你的生意真正流失的那个单位来选 —— 账户、合同、还是单个账户的风险分 —— 因为「少了一个账户」和「少了一块钱」本来就是两件事，追错方向，团队就会去救错的那批客户。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-nrr-calculator',
      answers: {
        en: 'How much of the revenue you started the period with is still here once churn, contraction and expansion are netted off?',
        zh: '扣掉流失和收缩、加上扩展之后，你期初那笔收入还剩多少？',
      },
      useWhen: {
        en: 'Reach for this when the question is the headline number and expansion is genuinely part of your model. Do not reach for it to diagnose the cause, because a weak NRR tells you nothing about whether customers are leaving or whether you simply stopped upselling; send that to GRR and expansion revenue first, and to account-level churn when the loss is concentrated in a few logos.',
        zh: '要一个对外的总分、而且扩展确实存在时用它。但别拿它做归因 —— NRR 低了只说明结果，不说明是客户在走还是你不再加购了；归因先走 GRR 和扩展收入，如果是少数几个大账户造成的，再去看账户口径的流失。',
      },
    },
    {
      slug: 'solopreneur-grr-calculator',
      answers: {
        en: 'If no existing customer bought anything extra, how much of the starting revenue would you still have?',
        zh: '假设现有客户一分钱都不加购，期初那笔收入最后还能剩下多少？',
      },
      useWhen: {
        en: 'Use it when you want the leak isolated from growth, especially when you suspect expansion is masking a leaky base. Do not use it as the headline retention figure: in a business with strong upsell it flatters you, and in a business without upsell it hides the absence of growth. It also cannot stand in for contract renewal, which counts contracts rather than money.',
        zh: '想把「漏」和「长」分开时用它 —— 尤其当你怀疑扩展收入正在掩盖一个漏水的底子。但别把它当对外的留存分数：加购强的业务里它会替你说好话，加购弱的业务里它会把「根本没有增长」盖住。它也替代不了续约率 —— 那个数的是合同，不是钱。',
      },
    },
    {
      slug: 'solopreneur-expansion-revenue-calculator',
      answers: {
        en: 'How much revenue do current accounts add through upgrades and extra purchases, and what expansion rate would it take to reach the retention target you were given?',
        zh: '现有客户通过升级和多买能加出多少钱？要达到既定留存目标，又需要多高的扩展率？',
      },
      useWhen: {
        en: 'Use it when there is a real upsell or cross-sell motion and you need to argue for a specific expansion rate. Do not use it when expansion barely exists, because then the gap is a retention problem and time spent here only hides it. And keep new-customer revenue out of it; this one counts only what existing accounts add on top.',
        zh: '当你确实有升级或交叉销售的动作、需要论证「扩展率得提到多少」时用它。扩展几乎不存在时别用 —— 那时候差距是留存问题，在这里花时间只会把它盖住。另外别把新客首单算进来：这个工具只数老客户额外加出来的部分。',
      },
    },
    {
      slug: 'solopreneur-logo-churn-rate-calculator',
      answers: {
        en: 'What share of the accounts you started with are gone this period, no matter how much each one was worth?',
        zh: '期初那批账户里，这一期走掉了多少 —— 不管每个账户原来值多少钱？',
      },
      useWhen: {
        en: 'Use it for self-serve or product-led products where the account count is the unit, or when a handful of large customers distort your revenue-based churn figure. Do not use it to size revenue loss: the account rate and the revenue rate answer different questions, and treating them as one is the classic sizing error. For revenue-weighted leakage use GRR; for the contract moment use renewal rate.',
        zh: '自助或产品驱动的产品里，账户数才是单位，用它；或者当少数几个大客户把你的收入口径流失率拉歪时，也用它。但别拿它推算损失金额 —— 账户流失率和金额流失率回答的是两个问题，把它们当同一个数是典型的规模错判。想看金额口径的漏，用 GRR；想看合同到期那一刻，用续约率。',
      },
    },
    {
      slug: 'solopreneur-renewal-rate-calculator',
      answers: {
        en: 'Of the contracts that came up for renewal, what share will renew, and how much revenue is sitting on that outcome?',
        zh: '到期需要续的合同里，有多少会真的续下来，有多少收入压在这个结果上？',
      },
      useWhen: {
        en: 'Use it when you sell on contracts and the renewals land in a known window, because the denominator is known in advance, which makes the rate unusually trustworthy. Do not use it for month-to-month self-serve, where there is no renewal event to measure; use logo churn there. And do not read a renewal rate as NRR: one counts contracts, the other counts money moving.',
        zh: '按合同销售、续约落在已知窗口里时用它 —— 分母是提前就知道的，这会让比率格外可信。月付自助式产品别用：那里根本没有「续约」这个动作可量，改用账户流失率。还有，别把续约率当 NRR 读 —— 一个数合同，一个数钱的进出。',
      },
    },
    {
      slug: 'solopreneur-customer-health-score-calculator',
      answers: {
        en: 'Which accounts are drifting toward churn before they actually leave, and which single signal would move them back?',
        zh: '哪些客户在真正离开之前就开始下滑了？改哪一个信号能把他们拉回来？',
      },
      useWhen: {
        en: 'Use it as an early warning when you have usage, support and sentiment signals per account and need a triage list for customer success. Do not use it as a retention rate: it is a composite score with no denominator, so it cannot be compared with GRR or NRR. And do not build it from signals you do not actually have, because a weighted score over guesswork is worse than a plain usage check.',
        zh: '当你手上有每个账户的使用、支持、情绪信号，需要一份客户成功的干预名单时，用它做预警。但别把它当留存率 —— 它是一个没有分母的综合分，跟 GRR、NRR 不可比。也别拿手上没有的信号去凑权重：在猜测上做的加权评分，不如老老实实看一眼使用量。',
      },
    },
  ],
};
