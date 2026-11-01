import { bullets, callout, doc, em, flowchart, h, p, quote, term, t } from './builder';

/**
 * 课件一：Offer and Acceptance（合同法 · 第三讲）
 * 正文为中英混排的法律英语精读文本；术语以 legalTerm 节点标注。
 */
export const offerDoc = {
  slug: 'offer-and-acceptance',
  title: 'Offer and Acceptance',
  subtitle: '合同法 · 第三讲｜Carlill v Carbolic Smoke Ball Co [1893] 1 QB 256',
  content: doc(
    h(1, 'The Offer'),
    p(
      'Every contract in English law is built from the same three elements: an offer, an acceptance, and ',
      term('consideration', '/kənˌsɪdəˈreɪʃn/', '对价；约因'),
      '. Before a court asks whether a promise will be enforced, it asks a narrower question — was there ever a promise at all, or were the parties still negotiating?',
    ),
    p(
      'An ',
      term('offer', '/ˈɒfə(r)/', '要约'),
      ' is a statement of the terms on which the offeror is willing to be bound, made with the intention that it becomes binding as soon as the offeree accepts. The test is objective. The court does not ask what the speaker privately meant; it asks what a ',
      term('reasonable person', '/ˈriːznəbl ˈpɜːsn/', '理性人；通情达理之人'),
      ', knowing the circumstances, would infer from the words and the conduct.',
    ),
    p(
      'Not every statement is an offer. A price list, a shop-window display, a newspaper advertisement and a call for tenders are, in general, an ',
      term('invitation to treat', '/ˌɪnvɪˈteɪʃn tə triːt/', '要约邀请'),
      ' — an invitation to the other side to make an offer. In ',
      em('Fisher v Bell'),
      ' [1961] 1 QB 394 a flick knife displayed in a shop window with a price ticket was held not to be an offer for sale, and the shopkeeper was acquitted under the Restriction of Offensive Weapons Act 1959.',
    ),
    callout(
      'key',
      p(
        '客观标准。法院不问当事人心里想什么，只问一个通情达理的人在同样情形下会如何理解他的言辞与行为。这条规则把合同从“内心意思”里解放出来，也把举证责任压回到文本上。',
      ),
    ),
    p(
      'An offer may be addressed to one person, to a class of persons, or to the world at large. Where the offeror promises to pay in return for an act, and the act is at once the acceptance and the consideration, the courts speak of a ',
      term('unilateral contract', '/ˌjuːnɪˈlætərəl ˈkɒntrækt/', '单方合同'),
      '.',
    ),

    h(1, 'Carlill v Carbolic Smoke Ball Co'),
    p(
      'The Carbolic Smoke Ball Company advertised that it would pay £100 to anyone who used its smoke ball three times a day for two weeks and still caught influenza. To show that it meant what it said, the company deposited £1,000 with its bankers. Mrs Louisa Carlill used the ball as directed, caught influenza, and claimed the reward.',
    ),
    quote(
      '£100 reward will be paid by the Carbolic Smoke Ball Company to any person who contracts the increasing epidemic influenza … after having used the ball three times daily for two weeks according to the printed directions supplied with each ball. £1,000 is deposited with the Alliance Bank, shewing our sincerity in the matter.',
    ),
    p(
      'The company answered with three arguments. The advertisement, it said, was a mere ',
      term('puff', '/pʌf/', '商业吹嘘；不具法律约束力的夸大宣传'),
      ' — a sales flourish no reasonable reader would take seriously. It was too vague to be an offer. And even if it were an offer, Mrs Carlill had never communicated her ',
      term('acceptance', '/əkˈseptəns/', '承诺'),
      '.',
    ),
    p(
      'The Court of Appeal rejected each argument in turn. On the puff, Bowen LJ observed that the deposit of £1,000 with the Alliance Bank showed the sincerity of the promise and took the advertisement outside the language of mere advertising. On vagueness, the court read the notice as requiring use of the ball for the stated period, and nothing more. On communication, the court held that where an offer invites performance rather than a promise, performance is the acceptance, and notification may be dispensed with.',
    ),
    callout(
      'warn',
      p(
        '单方合同的承诺通常无需事前通知：履行行为本身即构成承诺。但若要约明文要求通知，或依交易习惯应当通知，仍须通知。',
      ),
    ),

    h(1, 'Acceptance: The Mirror Image Rule'),
    p(
      'An acceptance is the unqualified expression of ',
      term('assent', '/əˈsent/', '同意；合意'),
      ' to every term of the offer. At common law it must be communicated to the offeror. Silence is not acceptance, however loudly the offeror may insist otherwise.',
    ),
    p(
      'The classical rule is that acceptance must mirror the offer. A reply that varies the terms is not an acceptance but a ',
      term('counter-offer', '/ˈkaʊntər ɒfə(r)/', '反要约'),
      ', and a counter-offer destroys the original offer. In ',
      em('Hyde v Wrench'),
      ' (1840) 3 Beav 334 the defendant offered to sell a farm for £1,000; the claimant replied with an offer of £950; when the claimant later wrote to accept the £1,000, there was nothing left to accept.',
    ),
    p(
      'The rule has been softened in practice. Where the parties have already begun performance, or where the variation is no more than a request for information, the courts are slow to find a counter-offer. The mirror image rule nevertheless remains the default frame through which a common lawyer reads a negotiation.',
    ),

    h(1, 'Reading a Case: A Method'),
    p(
      'A case report is not a story to be summarised. It is an argument to be reconstructed. Four questions will carry you through almost any report.',
    ),
    bullets([
      ['Facts — ', t('who did what, in what order, and which facts did the court treat as material?')],
      ['Issue — ', t('what single question did the court have to answer in order to decide the appeal?')],
      ['Holding — ', t('what answer did it give, and on what procedural footing?')],
      [
        'Reasoning — ',
        t('which reasons were necessary to the result (the '),
        term('ratio decidendi', '/ˌreɪʃiəʊ ˌdesɪˈdendiː/', '判决理由'),
        t('), and which were passing observations ('),
        term('obiter dictum', '/ˌɒbɪtə ˈdɪktəm/', '附带意见'),
        t(')?'),
      ],
    ]),
    flowchart({
      nodes: [
        { id: 'n1', position: { x: 0, y: 0 }, data: { label: '广告 / 橱窗 / 报价单', tone: 'quiet' } },
        { id: 'n2', position: { x: 230, y: 0 }, data: { label: '是否构成要约？', tone: 'accent' } },
        { id: 'n3', position: { x: 230, y: 116 }, data: { label: '要约邀请：对方发出要约', tone: 'quiet' } },
        { id: 'n4', position: { x: 460, y: 0 }, data: { label: '受要约人履行行为', tone: 'quiet' } },
        { id: 'n5', position: { x: 460, y: 116 }, data: { label: '承诺成立 · 合同生效', tone: 'ink' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3', label: '否' },
        { id: 'e3', source: 'n2', target: 'n4', label: '是' },
        { id: 'e4', source: 'n4', target: 'n5' },
      ],
    }),
    p(
      'Read the report once for the story. Read it a second time with a pencil, marking every sentence that states a rule. The sentences you mark are the ones the next case will cite.',
    ),
  ),
};

/** 课件二：Consideration */
export const considerationDoc = {
  slug: 'consideration',
  title: 'Consideration',
  subtitle: '合同法 · 第四讲｜Currie v Misa · Foakes v Beer · Williams v Roffey',
  content: doc(
    h(1, 'What Consideration Is'),
    p(
      'English law does not enforce promises merely because they were made. It enforces a ',
      term('bargain', '/ˈbɑːɡən/', '交易；讨价还价'),
      ', and the mark of a bargain is that something is given in return. That something is ',
      term('consideration', '/kənˌsɪdəˈreɪʃn/', '对价；约因'),
      '.',
    ),
    quote(
      'A valuable consideration, in the sense of the law, may consist either in some right, interest, profit or benefit accruing to the one party, or some forbearance, detriment, loss or responsibility given, suffered or undertaken by the other.',
    ),
    p(
      'Three requirements follow from that definition. Consideration must move from the promisee; it must be ',
      term('sufficient', '/səˈfɪʃnt/', '充分（法律上有效）'),
      ' but need not be adequate; and it must not be past. A benefit conferred before the promise was made — a favour already done — will not support it.',
    ),
    callout(
      'key',
      p(
        '对价的功能是筛选。它把“值得法院强制执行的允诺”与“无偿的表示”分开：前者有交换，后者只有好意。',
      ),
    ),
    h(1, 'The Pre-existing Duty Problem'),
    p(
      'If I am already bound to do something, does promising to do it again supply consideration? The classical answer is no. In ',
      em('Stilk v Myrick'),
      ' (1809) 2 Camp 317 seamen who stayed with a ship after two of the crew deserted were denied extra wages: they had only done what they were already bound to do.',
    ),
    p(
      'That answer produced hardship, and in ',
      em('Williams v Roffey Bros & Nicholls (Contractors) Ltd'),
      ' [1991] 1 QB 1 the Court of Appeal reframed the question. Where a party promises extra payment in return for a ',
      term('practical benefit', '/ˈpræktɪkl ˈbenɪfɪt/', '实际利益'),
      ' — here, the avoidance of a penalty for delay — the promise may be enforceable, even though the duty was pre-existing.',
    ),
    h(1, 'Promissory Estoppel'),
    p(
      'Where a party makes a clear promise not to enforce his strict rights, intending the other to rely on it, and the other does rely, the promise may bind him. In ',
      em('Central London Property Trust Ltd v High Trees House Ltd'),
      ' [1947] KB 130 Denning J held that a landlord who had accepted reduced rent during the war could not claim the difference afterwards.',
    ),
    p(
      'The doctrine is a shield, not a sword. It suspends a right; it does not create a cause of action where none existed.',
    ),
  ),
};

/** 课件三：Negligence */
export const negligenceDoc = {
  slug: 'negligence-duty-of-care',
  title: 'Negligence: The Duty of Care',
  subtitle: '侵权法 · 第二讲｜Donoghue v Stevenson [1932] AC 562 · Caparo [1990]',
  content: doc(
    h(1, 'The Duty of Care'),
    p(
      'Negligence is not a single tort but a family of them. What joins the family is a formula: a ',
      term('duty of care', '/ˈdjuːti əv keə(r)/', '注意义务'),
      ' owed by the defendant to the claimant, a breach of that duty, damage caused by the breach, and damage of a kind the law regards as recoverable.',
    ),
    p(
      'The modern starting point is ',
      em('Donoghue v Stevenson'),
      ' [1932] AC 562. Mrs Donoghue drank ginger beer bought for her by a friend and found the remains of a decomposed snail in the bottle. She had no contract with the manufacturer, and so sued in tort. The House of Lords held that a manufacturer owes a duty to the ultimate consumer.',
    ),
    quote(
      'You must take reasonable care to avoid acts or omissions which you can reasonably foresee would be likely to injure your neighbour. Who, then, in law is my neighbour? … persons who are so closely and directly affected by my act that I ought reasonably to have them in contemplation.',
    ),
    callout(
      'key',
      p(
        '“邻人原则”不是一条规则，而是一种推理方式：可预见性划定注意义务的外圈，近因性在其中划出具体的人。',
      ),
    ),
    h(1, 'The Caparo Test'),
    p(
      'After ',
      em('Caparo Industries plc v Dickman'),
      ' [1990] 2 AC 605 the inquiry is broken into three questions: was the damage ',
      term('foreseeable', '/fɔːˈsiːəbl/', '可预见的'),
      '; was there ',
      term('proximity', '/prɒkˈsɪməti/', '近因性；邻近关系'),
      ' between the parties; and is it fair, just and reasonable to impose the duty?',
    ),
    p(
      'The third limb does the quiet work. It allows the court to refuse a duty that logic would impose — against a public authority answering an emergency call, or an advocate in court — where the consequences for the conduct of public life would be worse than the loss left unremedied.',
    ),
    h(1, 'Breach and the Standard of Care'),
    p(
      'Duty is a question of law; breach is a question of fact. The standard is the conduct of the ',
      term('reasonable person', '/ˈriːznəbl ˈpɜːsn/', '理性人'),
      ', and the court weighs the magnitude of the risk against the cost and practicability of preventing it.',
    ),
    p(
      'Professionals are measured against the ordinary skilled person exercising that art — the rule in ',
      em('Bolam v Friern Hospital Management Committee'),
      ' [1957] 1 WLR 582 — and a body of professional opinion will ordinarily satisfy it, unless that opinion is not capable of withstanding logical analysis.',
    ),
  ),
};

export const courseware = [offerDoc, considerationDoc, negligenceDoc];
