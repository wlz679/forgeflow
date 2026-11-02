// P165 —— 分类 E（Cost & Efficiency / 成本与效率）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const E: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Cost decisions only make sense once the money on the other side is fixed. Start from what a customer is worth, move to what each hire really costs, then price the hours and the workplace that follow from those two numbers.',
    zh: '只有先把另一头的钱定住，成本决策才有意义。先看一个客户值多少，再看每招一个人实际要花多少，然后才是这两串数字带来的工时与工作地点。',
  },
  chain: [
    {
      slugs: ['solopreneur-saas-pricing-planner'],
      purpose: {
        en: 'Anchor the money coming in before you look at anything you spend. The pricing structure you choose decides what one customer is worth each month, and that number is the ceiling on what you can afford to spend on the people who serve them.',
        zh: '在看任何支出之前，先把进来的钱定住。你选的定价结构决定了一个客户每个月值多少，而这个数字就是你能为服务他们的人花的上限。',
      },
    },
    {
      slugs: ['solopreneur-employee-cost-calculator'],
      purpose: {
        en: 'Now turn a salary offer into the number that actually lands on the books: benefits, employer taxes, and the overhead that rides along with every new hire. That loaded figure is the input the next step prices, so get it before you count any hours.',
        zh: '接下来把一个薪资报价换算成真正落到账上的数字：福利、雇主税，以及每位新人都会带上的间接开销。这个全负荷数字正是下一步要定价的输入，所以要先把它算准，再去数工时。',
      },
    },
    {
      slugs: ['solopreneur-meeting-cost-calculator', 'solopreneur-productivity-score'],
      purpose: {
        en: 'Feed that loaded rate into the hours your team spends talking instead of working. Take the meeting view when you want the running cost of a specific calendar, and take the score view when you want the whole week diagnosed and ranked.',
        zh: '把这个全负荷费率填进团队「在聊而不是在做」的那些小时里。想看某一份日程表持续烧掉多少钱，就选会议那一项；想把整整一周诊断一遍并排出优先级，就选评分那一项。',
      },
    },
    {
      slugs: ['solopreneur-remote-vs-office-calculator'],
      purpose: {
        en: 'Last, settle where the work happens. Remote against office only becomes a meaningful comparison once you know what each headcount costs and how much productive time the meeting load has already taken away from the week.',
        zh: '最后再定工作地点在哪。只有当你既知道每个编制要花多少，又知道会议负荷已经从这一周里拿走了多少可工作时间，远程与办公室的比较才算数。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-saas-pricing-planner',
      answers: {
        en: 'Which pricing structure fits this product, and what does each structure do to the revenue per customer?',
        zh: '哪种定价结构适合这个产品？每种结构又会把每个客户的收入变成什么样？',
      },
      useWhen: {
        en: 'Use it before you launch, or when you are seriously considering a change of model. Do not use it to fine-tune the price you already have, because it compares structures rather than single numbers.',
        zh: '适合上线之前使用，或者在认真考虑换一种模式时使用。别拿它微调手上已有的价格 —— 它比的是结构，不是单个数字。',
      },
    },
    {
      slug: 'solopreneur-employee-cost-calculator',
      answers: {
        en: 'What does one hire really cost once benefits, employer taxes and overhead are added?',
        zh: '算上福利、雇主税和间接开销之后，雇一个人真正要花多少钱？',
      },
      useWhen: {
        en: 'Use it when comparing a full-time offer against a contractor, or two locations against each other. It prices a cost rather than a salary you are free to offer, because what a candidate expects is a separate input.',
        zh: '适合比较一份全职 offer 和一个外包方案、或者比较两个地区时使用。它算的是成本，不是一份你可以随意开出去的薪资 —— 候选人自己的预期是另一个输入。',
      },
    },
    {
      slug: 'solopreneur-meeting-cost-calculator',
      answers: {
        en: 'What is a recurring meeting really costing the team in paid hours and forgone output?',
        zh: '一场反复开的会，真正占掉了团队多少带薪工时和本可产出的东西？',
      },
      useWhen: {
        en: 'Use it when the calendar has grown enough that the money becomes visible, especially with wide attendee lists and senior people in the room. Do not use it to judge whether a meeting was worth holding, because it prices the time rather than the decision.',
        zh: '适合日程表已经长到能看出钱的时候，尤其是参会人拉得很广、里面还坐着资深角色时。别拿它评判一场会值不值得开 —— 它算的是时间成本，不是决策价值。',
      },
    },
    {
      slug: 'solopreneur-productivity-score',
      answers: {
        en: 'Where is my week actually going, and which habit is quietly eating my most productive hours?',
        zh: '我这一周的时间到底去哪了？哪个习惯正在悄悄吃掉我最可用的那几个小时？',
      },
      useWhen: {
        en: 'Use it as a periodic self-review when you want a ranking of what to change first rather than a single verdict. It scores your own week, and it cannot tell you whether the work itself is worth doing.',
        zh: '适合当作定期自查：你想知道先改哪一个，而不是只想听一句结论。它评的是你自己这一周，判断不了手上的活本身值不值得做。',
      },
    },
    {
      slug: 'solopreneur-remote-vs-office-calculator',
      answers: {
        en: 'Does working from home cost us less once rent, utilities, commute and focus time are all counted?',
        zh: '把租金、水电、通勤和专注时间都算进去之后，居家办公真的更省钱吗？',
      },
      useWhen: {
        en: 'Use it when a lease renewal or a headcount change puts the question back on the table. It works from a fixed productivity adjustment, so it settles the money question and leaves the culture question open.',
        zh: '适合在续租或者扩编、让这个问题重新回到桌面上时使用。它建立在一个固定的生产力调整之上，所以它能定的是钱的问题，文化的问题它定不了。',
      },
    },
  ],
};
