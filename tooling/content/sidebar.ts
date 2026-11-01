import type { ReadLevel, SidebarType, TiptapNode } from '@ln/types';
import { bullets, callout, p, quote, term } from './builder';

export interface SeedSidebarItem {
  type: SidebarType;
  title: string;
  level: ReadLevel;
  content: TiptapNode[];
}

export const sidebarItems: Record<string, SeedSidebarItem[]> = {
  'offer-and-acceptance': [
    {
      type: 'EXTENSION',
      title: '「要约邀请」为什么必须存在',
      level: 'REQUIRED',
      content: [
        p(
          '如果橱窗陈列、价目表和报纸广告都算要约，市场会在一天之内停摆。店主将失去拒绝交易的余地：任何人拿起商品，合同即成立；任何读到广告的人，都可以要求按广告价供货。',
        ),
        p(
          '要约邀请这个范畴，本质上是为卖方保留一个「门的把手」——它把谈判的最后一步交给对方，而自己保留承诺与否的自由。理解这一点，就能理解为什么法院在 ',
          term('Fisher v Bell', '/ˈfɪʃə biː bel/', '英国 1961 年案，橱窗陈列弹簧刀'),
          ' 中宁愿承受立法目的落空的批评，也要坚持字面解释。',
        ),
        callout(
          'info',
          p('三种最常见的要约邀请：商品在货架上的陈列、招标公告、拍卖师的开价。三者的共同点是——它们都邀请对方开口。'),
        ),
      ],
    },
    {
      type: 'EXTENSION',
      title: '单方合同与悬赏广告：一个中国法对照',
      level: 'OPTIONAL',
      content: [
        p(
          '英国法用 unilateral contract 处理「完成行为即得报酬」的安排。中国法上与之最接近的是悬赏广告：《民法典》第 499 条规定，悬赏人以公开方式声明对完成特定行为的人支付报酬的，完成该行为的人可以请求其支付。',
        ),
        p(
          '差异在细节里。英国法上，履行者是否知悉悬赏、是否因信赖而行为，长期存在争议；中国法把请求权直接系于「完成行为」这一事实，不问动机。写作时若涉及比较，先分清「请求权基础」是合同还是单方允诺。',
        ),
      ],
    },
    {
      type: 'ARTICLE',
      title: '判决选段：Bowen LJ 论「认真」',
      level: 'REQUIRED',
      content: [
        quote(
          'It is not a mere puff … £1,000 is deposited with the Alliance Bank, shewing our sincerity in the matter. It is an offer to the whole world … ',
        ),
        p(
          '这段话之所以被反复引用，不在于文采，而在于它示范了一种推理：把「是否认真」这个主观问题，转化为「有没有可观察的投入」这个客观问题。',
        ),
      ],
    },
    {
      type: 'TEACHER_NOTE',
      title: '本周批注：注意「通知」与「履行」的先后',
      level: 'OPTIONAL',
      content: [
        p(
          '批改作业时我发现，多数同学把「承诺无需通知」写成了通则。请回到判决原文：法院说的是，在要约邀请的是「履行」而非「允诺」时，通知可以被免除。这是例外，不是原则。',
        ),
        p('写作时请给出限定语：unless the offeror requires notification。'),
      ],
    },
  ],
  consideration: [
    {
      type: 'EXTENSION',
      title: '对价的三个要求，一次讲清',
      level: 'REQUIRED',
      content: [
        bullets([
          '必须由受诺人给出（must move from the promisee）：第三人提供的利益不算。',
          '必须充分但不必相当（sufficient but not adequate）：一枚硬币可以买一匹马，只要它是真的交换。',
          '不得是过去的对价（past consideration is no consideration）：先帮忙、后许诺，许诺无对价。',
        ]),
        p('三条要求合起来做一件事：把「交换」与「赠与」分开。'),
      ],
    },
    {
      type: 'ARTICLE',
      title: 'Williams v Roffey：一场静悄悄的革命',
      level: 'OPTIONAL',
      content: [
        p(
          '本案之前，既存义务的履行不构成对价（Stilk v Myrick）。本案之后，只要承诺方能指出某种「实际利益」——避免罚金、确保工期、省去另找承包商的成本——额外付款的允诺就可能被强制执行。',
        ),
        p('注意：法院没有推翻 Stilk，而是绕开了它。写案例分析时，这个区别本身就是一个得分点。'),
      ],
    },
    {
      type: 'TEACHER_NOTE',
      title: '作业提示',
      level: 'OPTIONAL',
      content: [p('下次课讨论：如果实际利益如此容易找到，对价理论还剩多少筛选功能？请准备一个反例。')],
    },
  ],
  'negligence-duty-of-care': [
    {
      type: 'EXTENSION',
      title: '邻人原则的四十年',
      level: 'REQUIRED',
      content: [
        p(
          'Atkin 勋爵在 1932 年提出的「邻人」不是情感概念，而是一个可操作的筛选器：谁如此紧密而直接地受我的行为影响，以致我理应将其纳入考虑？',
        ),
        p(
          '此后四十年，法院把它扩张到产品责任、职业过失、精神损害；又在 Anns 案之后因「政策考量」而收缩。Caparo 三要件正是这次收缩的产物。',
        ),
      ],
    },
    {
      type: 'ARTICLE',
      title: 'Caparo 三要件的中文读法',
      level: 'REQUIRED',
      content: [
        p('foreseeability 划定损害类型；proximity 划定人的范围；fair, just and reasonable 划定政策的边界。'),
        p(
          '翻译时常见的错误是把 proximity 译成「接近」。在法律语境里它指关系的紧密程度，包括时间、空间与关系三个维度，译为「近因性」或「邻近关系」更稳妥。',
        ),
      ],
    },
    {
      type: 'TEACHER_NOTE',
      title: '读判决书时，先找争点',
      level: 'OPTIONAL',
      content: [p('Donoghue 案的争点不是「蜗牛是否恶心」，而是「制造商对无合同关系的最终消费者是否负有注意义务」。')],
    },
  ],
};
