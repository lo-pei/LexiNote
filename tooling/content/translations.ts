/**
 * 预置翻译模板（说明书 §5.6）。
 * 不调用任何外部翻译 API：sourceText 经 packages/utils/normalize 归一化后 SHA-256，
 * 与前端点击句子时计算的哈希匹配。termOverrides 为该句术语的优先译法。
 */
export interface SeedTranslation {
  sourceText: string;
  translation: string;
  termOverrides?: Record<string, string>;
}

export const translations: SeedTranslation[] = [
  {
    sourceText:
      'Every contract in English law is built from the same three elements: an offer, an acceptance, and consideration.',
    translation: '英国法上的每一份合同都由同样三个要素构成：要约、承诺与对价。',
  },
  {
    sourceText:
      'Before a court asks whether a promise will be enforced, it asks a narrower question — was there ever a promise at all, or were the parties still negotiating?',
    translation:
      '法院在追问一个允诺是否会被强制执行之前，先要问一个更窄的问题——究竟有没有过允诺，还是双方仍停留在磋商阶段。',
  },
  {
    sourceText:
      'An offer is a statement of the terms on which the offeror is willing to be bound, made with the intention that it becomes binding as soon as the offeree accepts.',
    translation:
      '要约是要约人表明其愿意受哪些条款约束、并且意图在受要约人承诺时即产生约束力的意思表示。',
    termOverrides: { offer: '要约', 'invitation to treat': '要约邀请' },
  },
  {
    sourceText: 'The test is objective.',
    translation: '该判断标准是客观的。',
  },
  {
    sourceText:
      'The court does not ask what the speaker privately meant; it asks what a reasonable person, knowing the circumstances, would infer from the words and the conduct.',
    translation:
      '法院不问表意人私下想的是什么，只问一个知悉全部情形的理性人，会从言辞与行为中得出何种推断。',
  },
  {
    sourceText: 'Not every statement is an offer.',
    translation: '并非每一项陈述都是要约。',
  },
  {
    sourceText:
      'A price list, a shop-window display, a newspaper advertisement and a call for tenders are, in general, an invitation to treat — an invitation to the other side to make an offer.',
    translation:
      '价目表、橱窗陈列、报纸广告与招标公告，一般属于要约邀请——即邀请对方向自己发出要约。',
  },
  {
    sourceText:
      'In Fisher v Bell [1961] 1 QB 394 a flick knife displayed in a shop window with a price ticket was held not to be an offer for sale, and the shopkeeper was acquitted under the Restriction of Offensive Weapons Act 1959.',
    translation:
      '在 Fisher v Bell 案中，橱窗内标价陈列的弹簧刀被认定不构成出售要约，店主依 1959 年《限制攻击性武器法》获判无罪。',
  },
  {
    sourceText: 'An offer may be addressed to one person, to a class of persons, or to the world at large.',
    translation: '要约可以向特定一人发出，可以向特定群体发出，也可以向不特定的世人发出。',
  },
  {
    sourceText:
      'Where the offeror promises to pay in return for an act, and the act is at once the acceptance and the consideration, the courts speak of a unilateral contract.',
    translation:
      '若要约人承诺以支付报酬换取某一行为，而该行为同时构成承诺与对价，法院称之为单方合同。',
  },
  {
    sourceText:
      'The Carbolic Smoke Ball Company advertised that it would pay £100 to anyone who used its smoke ball three times a day for two weeks and still caught influenza.',
    translation:
      '石炭酸烟丸公司刊登广告称：任何人按说明每日三次、连续两周使用其烟丸后仍感染流感，公司将支付 100 英镑。',
  },
  {
    sourceText: 'To show that it meant what it said, the company deposited £1,000 with its bankers.',
    translation: '为表明此言当真，公司向开户银行存入 1,000 英镑。',
  },
  {
    sourceText: 'Mrs Louisa Carlill used the ball as directed, caught influenza, and claimed the reward.',
    translation: '路易莎·卡里尔夫人按说明使用烟丸，仍然患上流感，遂请求支付赏金。',
  },
  {
    sourceText: 'The company answered with three arguments.',
    translation: '公司提出三点抗辩。',
  },
  {
    sourceText:
      'The advertisement, it said, was a mere puff — a sales flourish no reasonable reader would take seriously.',
    translation: '其一，该广告只是商业吹嘘——一句任何理性读者都不会当真的促销辞令。',
  },
  {
    sourceText: 'It was too vague to be an offer.',
    translation: '其二，广告内容过于含糊，不足以构成要约。',
  },
  {
    sourceText: 'And even if it were an offer, Mrs Carlill had never communicated her acceptance.',
    translation: '其三，即便构成要约，卡里尔夫人也从未将承诺通知公司。',
  },
  {
    sourceText: 'The Court of Appeal rejected each argument in turn.',
    translation: '上诉法院逐一驳回了这三点抗辩。',
  },
  {
    sourceText:
      'On the puff, Bowen LJ observed that the deposit of £1,000 with the Alliance Bank showed the sincerity of the promise and took the advertisement outside the language of mere advertising.',
    translation:
      '关于“吹嘘”之说，鲍恩大法官指出：向联合银行存入 1,000 英镑这一事实表明允诺是认真的，该广告因此超出了单纯广告宣传的范畴。',
    termOverrides: { puff: '商业吹嘘' },
  },
  {
    sourceText:
      'On vagueness, the court read the notice as requiring use of the ball for the stated period, and nothing more.',
    translation: '关于含糊之说，法院将公告解释为仅要求按规定期间使用烟丸，别无其他条件。',
  },
  {
    sourceText:
      'On communication, the court held that where an offer invites performance rather than a promise, performance is the acceptance, and notification may be dispensed with.',
    translation:
      '关于通知之说，法院认为：若要约要求的是履行而非允诺，则履行本身即为承诺，可以免除通知。',
  },
  {
    sourceText: 'An acceptance is the unqualified expression of assent to every term of the offer.',
    translation: '承诺是对要约全部条款无条件表示同意的意思表示。',
  },
  {
    sourceText: 'At common law it must be communicated to the offeror.',
    translation: '在普通法上，承诺必须传达至要约人。',
  },
  {
    sourceText: 'Silence is not acceptance, however loudly the offeror may insist otherwise.',
    translation: '沉默不构成承诺，无论要约人如何强调相反约定。',
  },
  {
    sourceText: 'The classical rule is that acceptance must mirror the offer.',
    translation: '古典规则是：承诺必须与要约完全一致，即所谓镜像规则。',
  },
  {
    sourceText:
      'A reply that varies the terms is not an acceptance but a counter-offer, and a counter-offer destroys the original offer.',
    translation: '变更条款的回复不是承诺，而是反要约；反要约使原要约归于消灭。',
  },
  {
    sourceText:
      'In Hyde v Wrench (1840) 3 Beav 334 the defendant offered to sell a farm for £1,000; the claimant replied with an offer of £950; when the claimant later wrote to accept the £1,000, there was nothing left to accept.',
    translation:
      '在 Hyde v Wrench 案中，被告以 1,000 英镑出售农场，原告回复愿出 950 英镑；待原告后来再去承诺 1,000 英镑时，已无可供承诺之要约。',
  },
  {
    sourceText: 'The rule has been softened in practice.',
    translation: '该规则在实践中已被软化。',
  },
  {
    sourceText:
      'Where the parties have already begun performance, or where the variation is no more than a request for information, the courts are slow to find a counter-offer.',
    translation:
      '若双方已开始履行，或所提变更仅为询问信息，法院不愿认定其构成反要约。',
  },
  {
    sourceText:
      'The mirror image rule nevertheless remains the default frame through which a common lawyer reads a negotiation.',
    translation: '尽管如此，镜像规则仍是普通法律人解读谈判过程的默认框架。',
  },
  {
    sourceText: 'A case report is not a story to be summarised.',
    translation: '判例报告不是供人概括的故事。',
  },
  {
    sourceText: 'It is an argument to be reconstructed.',
    translation: '它是一段需要被重建的论证。',
  },
  {
    sourceText: 'Four questions will carry you through almost any report.',
    translation: '有四个问题，足以带你穿过几乎任何一份判例报告。',
  },
  {
    sourceText: 'Read the report once for the story.',
    translation: '第一遍，读它的脉络。',
  },
  {
    sourceText: 'Read it a second time with a pencil, marking every sentence that states a rule.',
    translation: '第二遍执笔而读，标出每一句陈述规则的句子。',
  },
  {
    sourceText: 'The sentences you mark are the ones the next case will cite.',
    translation: '你标出的那些句子，正是下一个案件会引用的句子。',
  },
  {
    sourceText:
      'Facts — who did what, in what order, and which facts did the court treat as material?',
    translation: '事实——谁做了什么，先后如何，法院将哪些事实视为重要事实？',
  },
  {
    sourceText:
      'Issue — what single question did the court have to answer in order to decide the appeal?',
    translation: '争点——为裁决上诉，法院必须回答的那一个问题是什么？',
  },
  {
    sourceText: 'Holding — what answer did it give, and on what procedural footing?',
    translation: '判决——它给出了什么答案，又立足于何种程序基础？',
  },
  {
    sourceText:
      'Reasoning — which reasons were necessary to the result (the ratio decidendi), and which were passing observations (obiter dicta)?',
    translation:
      '理由——哪些是得出该结论所必需的理由（判决理由），哪些只是顺带的评论（附带意见）？',
  },

  /* ── Consideration ── */
  {
    sourceText: 'English law does not enforce promises merely because they were made.',
    translation: '英国法并不因为允诺已经作出就强制执行它。',
  },
  {
    sourceText: 'It enforces a bargain, and the mark of a bargain is that something is given in return.',
    translation: '它强制执行的是交易，而交易的标志是有所交换。',
  },
  {
    sourceText: 'Three requirements follow from that definition.',
    translation: '这一定义引出三项要求。',
  },
  {
    sourceText:
      'Consideration must move from the promisee; it must be sufficient but need not be adequate; and it must not be past.',
    translation: '对价必须由受诺人给出；必须充分，但不必相当；且不得是过去的对价。',
  },
  {
    sourceText:
      'A benefit conferred before the promise was made — a favour already done — will not support it.',
    translation: '在允诺作出之前已经给予的利益——一份已经帮完的忙——不足以支撑该允诺。',
  },
  {
    sourceText: 'The classical answer is no.',
    translation: '古典理论的回答是否定的。',
  },
  {
    sourceText:
      'If I am already bound to do something, does promising to do it again supply consideration?',
    translation: '如果我已经负有做某事的义务，再次允诺去做，是否构成对价？',
  },
  {
    sourceText:
      'In Stilk v Myrick (1809) 2 Camp 317 seamen who stayed with a ship after two of the crew deserted were denied extra wages: they had only done what they were already bound to do.',
    translation:
      '在 Stilk v Myrick 案中，两名船员弃船后仍留在船上的水手请求额外工资未获支持：他们只是做了本已负有义务去做的事。',
  },
  {
    sourceText:
      'Where a party promises extra payment in return for a practical benefit — here, the avoidance of a penalty for delay — the promise may be enforceable, even though the duty was pre-existing.',
    translation:
      '若一方为换取某种实际利益（本案中为免于承担迟延罚金）而承诺额外付款，即使原有义务已存在，该允诺也可能具有可执行性。',
  },
  {
    sourceText: 'The doctrine is a shield, not a sword.',
    translation: '该原则是一面盾，而非一把剑。',
  },
  {
    sourceText:
      'It suspends a right; it does not create a cause of action where none existed.',
    translation: '它使权利暂时不能行使，却不能在原本不存在诉因之处创设诉因。',
  },

  /* ── Negligence ── */
  {
    sourceText: 'Negligence is not a single tort but a family of them.',
    translation: '过失不是单一的侵权行为，而是一个侵权类型族群。',
  },
  {
    sourceText: 'She had no contract with the manufacturer, and so sued in tort.',
    translation: '她与制造商之间并无合同，因此以侵权起诉。',
  },
  {
    sourceText: 'The House of Lords held that a manufacturer owes a duty to the ultimate consumer.',
    translation: '上议院认定，制造商对最终消费者负有注意义务。',
  },
  {
    sourceText:
      'What joins the family is a formula: a duty of care owed by the defendant to the claimant, a breach of that duty, damage caused by the breach, and damage of a kind the law regards as recoverable.',
    translation:
      '把这些类型连成一族的，是一个公式：被告对原告负有注意义务，被告违反该义务，损害由违反义务所致，且该损害属于法律认为可以救济的类型。',
  },
  {
    sourceText: 'The modern starting point is Donoghue v Stevenson [1932] AC 562.',
    translation: '现代讨论的起点是 Donoghue v Stevenson 案。',
  },
  {
    sourceText:
      'Mrs Donoghue drank ginger beer bought for her by a friend and found the remains of a decomposed snail in the bottle.',
    translation: '多诺霍夫人喝下朋友为她买的姜啤酒，在瓶中发现了腐烂蜗牛的残骸。',
  },
  {
    sourceText:
      'After Caparo Industries plc v Dickman [1990] 2 AC 605 the inquiry is broken into three questions: was the damage foreseeable; was there proximity between the parties; and is it fair, just and reasonable to impose the duty?',
    translation:
      '自 Caparo 案之后，这一审查被拆为三问：损害是否可预见；双方之间是否具有近因性；课以该义务是否公平、正当且合理。',
  },
  {
    sourceText: 'Duty is a question of law; breach is a question of fact.',
    translation: '注意义务是法律问题，违反义务是事实问题。',
  },
  {
    sourceText:
      'The standard is the conduct of the reasonable person, and the court weighs the magnitude of the risk against the cost and practicability of preventing it.',
    translation:
      '标准是理性人的行为，法院会在风险的大小与预防风险的成本和可行性之间进行衡量。',
  },
];
