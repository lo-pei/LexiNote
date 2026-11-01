export interface SeedVocab {
  term: string;
  phonetic: string;
  definitionZh: string;
  definitionEn: string;
  domain: string;
  examples: { sentence: string; source: string; note?: string }[];
}

/** 词典级词条：examples 为共享语料，个人语境另存于 wordbook_items.source_context */
export const vocabulary: SeedVocab[] = [
  {
    term: 'offer',
    phonetic: '/ˈɒfə(r)/',
    definitionZh: '要约',
    definitionEn: 'A statement of terms on which the offeror is willing to be bound, intended to become binding on acceptance.',
    domain: '合同法',
    examples: [
      { sentence: 'An offer is a statement of the terms on which the offeror is willing to be bound.', source: 'Offer and Acceptance' },
      { sentence: 'The display of goods in a shop window is generally not an offer.', source: 'Offer and Acceptance', note: '橱窗陈列通常不是要约' },
    ],
  },
  {
    term: 'acceptance',
    phonetic: '/əkˈseptəns/',
    definitionZh: '承诺；受领',
    definitionEn: 'The unqualified expression of assent to all the terms of an offer.',
    domain: '合同法',
    examples: [
      { sentence: 'Acceptance must mirror the offer.', source: 'Offer and Acceptance' },
    ],
  },
  {
    term: 'consideration',
    phonetic: '/kənˌsɪdəˈreɪʃn/',
    definitionZh: '对价；约因',
    definitionEn: 'Something of value given in return for a promise, which makes the promise enforceable.',
    domain: '合同法',
    examples: [
      { sentence: 'Consideration must move from the promisee.', source: 'Consideration' },
    ],
  },
  {
    term: 'invitation to treat',
    phonetic: '/ˌɪnvɪˈteɪʃn tə triːt/',
    definitionZh: '要约邀请',
    definitionEn: 'An invitation to the other party to make an offer, not itself an offer.',
    domain: '合同法',
    examples: [
      { sentence: 'A shop-window display is generally an invitation to treat.', source: 'Offer and Acceptance' },
    ],
  },
  {
    term: 'unilateral contract',
    phonetic: '/ˌjuːnɪˈlætərəl ˈkɒntrækt/',
    definitionZh: '单方合同',
    definitionEn: 'A contract in which one party promises to pay in return for an act by the other.',
    domain: '合同法',
    examples: [
      { sentence: 'Carlill is the classic unilateral contract.', source: 'Offer and Acceptance' },
    ],
  },
  {
    term: 'reasonable person',
    phonetic: '/ˈriːznəbl ˈpɜːsn/',
    definitionZh: '理性人；通情达理之人',
    definitionEn: 'The hypothetical standard against which conduct and intention are measured at common law.',
    domain: '法理',
    examples: [
      { sentence: 'The court asks what a reasonable person would infer from the words and the conduct.', source: 'Offer and Acceptance' },
    ],
  },
  {
    term: 'puff',
    phonetic: '/pʌf/',
    definitionZh: '商业吹嘘（不具约束力）',
    definitionEn: 'An exaggerated promotional statement not intended to create legal relations.',
    domain: '合同法',
    examples: [
      { sentence: 'The company argued that the advertisement was a mere puff.', source: 'Offer and Acceptance' },
    ],
  },
  {
    term: 'assent',
    phonetic: '/əˈsent/',
    definitionZh: '同意；合意',
    definitionEn: 'Agreement to a proposal; the mental element of acceptance.',
    domain: '合同法',
    examples: [
      { sentence: 'Acceptance is the unqualified expression of assent.', source: 'Offer and Acceptance' },
    ],
  },
  {
    term: 'counter-offer',
    phonetic: '/ˈkaʊntər ɒfə(r)/',
    definitionZh: '反要约',
    definitionEn: 'A reply that varies the terms of an offer, operating as a rejection and a new offer.',
    domain: '合同法',
    examples: [
      { sentence: 'A counter-offer destroys the original offer.', source: 'Offer and Acceptance' },
    ],
  },
  {
    term: 'ratio decidendi',
    phonetic: '/ˌreɪʃiəʊ ˌdesɪˈdendiː/',
    definitionZh: '判决理由',
    definitionEn: 'The legal reasoning necessary to the decision, binding on lower courts.',
    domain: '法理',
    examples: [
      { sentence: 'Only the ratio decidendi binds later courts.', source: 'Reading a Case' },
    ],
  },
  {
    term: 'obiter dictum',
    phonetic: '/ˌɒbɪtə ˈdɪktəm/',
    definitionZh: '附带意见',
    definitionEn: 'A passing observation in a judgment, persuasive but not binding.',
    domain: '法理',
    examples: [
      { sentence: 'Observations that are not necessary to the result are obiter dicta.', source: 'Reading a Case' },
    ],
  },
  {
    term: 'bargain',
    phonetic: '/ˈbɑːɡən/',
    definitionZh: '交易；议价',
    definitionEn: 'An exchange of promises or performances on agreed terms.',
    domain: '合同法',
    examples: [
      { sentence: 'English law enforces a bargain, not a bare promise.', source: 'Consideration' },
    ],
  },
  {
    term: 'sufficient',
    phonetic: '/səˈfɪʃnt/',
    definitionZh: '充分的（法律上有效）',
    definitionEn: 'Of adequate legal value to constitute consideration, though it need not be adequate in amount.',
    domain: '合同法',
    examples: [
      { sentence: 'Consideration must be sufficient but need not be adequate.', source: 'Consideration' },
    ],
  },
  {
    term: 'practical benefit',
    phonetic: '/ˈpræktɪkl ˈbenɪfɪt/',
    definitionZh: '实际利益',
    definitionEn: 'A benefit in fact which may supply consideration for a promise to vary an existing duty.',
    domain: '合同法',
    examples: [
      { sentence: 'Avoiding a penalty for delay was a practical benefit.', source: 'Consideration' },
    ],
  },
  {
    term: 'promissory estoppel',
    phonetic: '/prəˈmɪsəri ɪˈstɒpl/',
    definitionZh: '允诺禁反言',
    definitionEn: 'A doctrine preventing a party from going back on a clear promise relied upon by another.',
    domain: '合同法',
    examples: [
      { sentence: 'Promissory estoppel is a shield, not a sword.', source: 'Consideration' },
    ],
  },
  {
    term: 'duty of care',
    phonetic: '/ˈdjuːti əv keə(r)/',
    definitionZh: '注意义务',
    definitionEn: 'A legal obligation to take reasonable care to avoid foreseeable harm to another.',
    domain: '侵权法',
    examples: [
      { sentence: 'A manufacturer owes a duty of care to the ultimate consumer.', source: 'Negligence' },
    ],
  },
  {
    term: 'negligence',
    phonetic: '/ˈneɡlɪdʒəns/',
    definitionZh: '过失；疏忽',
    definitionEn: 'A tort consisting of breach of a duty of care causing recoverable damage.',
    domain: '侵权法',
    examples: [
      { sentence: 'The claim was framed in negligence, not in contract.', source: 'Negligence' },
    ],
  },
  {
    term: 'foreseeable',
    phonetic: '/fɔːˈsiːəbl/',
    definitionZh: '可预见的',
    definitionEn: 'Capable of being anticipated by a reasonable person.',
    domain: '侵权法',
    examples: [
      { sentence: 'The damage must be foreseeable at the time of the act.', source: 'Negligence' },
    ],
  },
  {
    term: 'proximity',
    phonetic: '/prɒkˈsɪməti/',
    definitionZh: '近因性；邻近关系',
    definitionEn: 'Closeness of relationship sufficient to ground a duty of care.',
    domain: '侵权法',
    examples: [
      { sentence: 'Proximity may be physical, temporal or relational.', source: 'Negligence' },
    ],
  },
  {
    term: 'tort',
    phonetic: '/tɔːt/',
    definitionZh: '侵权（法）',
    definitionEn: 'A civil wrong for which the law provides a remedy, independent of contract.',
    domain: '侵权法',
    examples: [
      { sentence: 'She had no contract with the manufacturer, and so sued in tort.', source: 'Negligence' },
    ],
  },
  {
    term: 'plaintiff',
    phonetic: '/ˈpleɪntɪf/',
    definitionZh: '原告（英式，现多用 claimant）',
    definitionEn: 'The party who brings a civil action.',
    domain: '诉讼法',
    examples: [
      { sentence: 'The plaintiff must prove the breach on the balance of probabilities.', source: 'Negligence' },
    ],
  },
  {
    term: 'defendant',
    phonetic: '/dɪˈfendənt/',
    definitionZh: '被告',
    definitionEn: 'The party against whom a civil claim or criminal charge is brought.',
    domain: '诉讼法',
    examples: [
      { sentence: 'The defendant offered to sell a farm for £1,000.', source: 'Offer and Acceptance' },
    ],
  },
  {
    term: 'liability',
    phonetic: '/ˌlaɪəˈbɪləti/',
    definitionZh: '责任；法律责任',
    definitionEn: 'Legal responsibility for loss or damage.',
    domain: '侵权法',
    examples: [
      { sentence: 'The court refused to impose liability on the authority.', source: 'Negligence' },
    ],
  },
  {
    term: 'breach',
    phonetic: '/briːtʃ/',
    definitionZh: '违反；违约（或违反义务）',
    definitionEn: 'Failure to perform a duty or obligation.',
    domain: '通用',
    examples: [
      { sentence: 'Duty is a question of law; breach is a question of fact.', source: 'Negligence' },
    ],
  },
  {
    term: 'damages',
    phonetic: '/ˈdæmɪdʒɪz/',
    definitionZh: '损害赔偿（金）',
    definitionEn: 'A monetary award compensating for loss caused by a wrong.',
    domain: '救济法',
    examples: [
      { sentence: 'Damages aim to put the claimant in the position he would have occupied.', source: 'Remedies' },
    ],
  },
  {
    term: 'precedent',
    phonetic: '/ˈpresɪdənt/',
    definitionZh: '先例',
    definitionEn: 'A decided case that provides authority for deciding later cases.',
    domain: '法理',
    examples: [
      { sentence: 'The rule of precedent gives the ratio decidendi its force.', source: 'Reading a Case' },
    ],
  },
  {
    term: 'stare decisis',
    phonetic: '/ˌsteəri dɪˈsaɪsɪs/',
    definitionZh: '遵循先例原则',
    definitionEn: 'The doctrine that courts should stand by decided matters.',
    domain: '法理',
    examples: [
      { sentence: 'Stare decisis supplies certainty at the cost of flexibility.', source: 'Reading a Case' },
    ],
  },
  {
    term: 'statute',
    phonetic: '/ˈstætʃuːt/',
    definitionZh: '成文法；制定法',
    definitionEn: 'A law enacted by a legislature.',
    domain: '宪法/立法',
    examples: [
      { sentence: 'The shopkeeper was acquitted under the Restriction of Offensive Weapons Act 1959.', source: 'Offer and Acceptance' },
    ],
  },
  {
    term: 'mens rea',
    phonetic: '/ˌmenz ˈriːə/',
    definitionZh: '犯罪意图（主观要件）',
    definitionEn: 'The guilty mind required for criminal liability.',
    domain: '刑法',
    examples: [
      { sentence: 'Mens rea must be proved beyond reasonable doubt.', source: 'Criminal Law' },
    ],
  },
  {
    term: 'actus reus',
    phonetic: '/ˌæktəs ˈreɪəs/',
    definitionZh: '犯罪行为（客观要件）',
    definitionEn: 'The prohibited act or omission constituting the physical element of an offence.',
    domain: '刑法',
    examples: [
      { sentence: 'The actus reus must coincide with the mens rea.', source: 'Criminal Law' },
    ],
  },
  {
    term: 'burden of proof',
    phonetic: '/ˈbɜːdn əv pruːf/',
    definitionZh: '举证责任',
    definitionEn: 'The obligation of a party to prove a fact in issue.',
    domain: '诉讼法',
    examples: [
      { sentence: 'The burden of proof lies on the prosecution.', source: 'Criminal Law' },
    ],
  },
  {
    term: 'beyond reasonable doubt',
    phonetic: '/bɪˈjɒnd ˈriːznəbl daʊt/',
    definitionZh: '排除合理怀疑（刑事标准）',
    definitionEn: 'The criminal standard of proof.',
    domain: '诉讼法',
    examples: [
      { sentence: 'Guilt must be proved beyond reasonable doubt.', source: 'Criminal Law' },
    ],
  },
  {
    term: 'balance of probabilities',
    phonetic: '/ˈbæləns əv ˌprɒbəˈbɪlətiz/',
    definitionZh: '盖然性权衡（民事标准）',
    definitionEn: 'The civil standard of proof: more likely than not.',
    domain: '诉讼法',
    examples: [
      { sentence: 'The civil standard is the balance of probabilities.', source: 'Negligence' },
    ],
  },
  {
    term: 'rescission',
    phonetic: '/rɪˈsɪʒn/',
    definitionZh: '撤销（合同）',
    definitionEn: 'The setting aside of a contract, restoring the parties to their pre-contractual positions.',
    domain: '救济法',
    examples: [
      { sentence: 'Rescission is available where consent was vitiated by misrepresentation.', source: 'Remedies' },
    ],
  },
  {
    term: 'misrepresentation',
    phonetic: '/ˌmɪsˌreprɪzenˈteɪʃn/',
    definitionZh: '不实陈述',
    definitionEn: 'A false statement of fact inducing a contract.',
    domain: '合同法',
    examples: [
      { sentence: 'A statement of opinion is not, as a rule, a misrepresentation.', source: 'Contract Law' },
    ],
  },
  {
    term: 'fiduciary duty',
    phonetic: '/fɪˈdjuːʃəri ˈdjuːti/',
    definitionZh: '信义义务；受托义务',
    definitionEn: 'A duty of loyalty and good faith owed by one acting for another.',
    domain: '公司法',
    examples: [
      { sentence: 'A director owes a fiduciary duty to the company.', source: 'Company Law' },
    ],
  },
  {
    term: 'jurisdiction',
    phonetic: '/ˌdʒʊərɪsˈdɪkʃn/',
    definitionZh: '管辖权',
    definitionEn: 'The authority of a court to hear a case.',
    domain: '诉讼法',
    examples: [
      { sentence: 'The court declined jurisdiction under the forum non conveniens doctrine.', source: 'Civil Procedure' },
    ],
  },
  {
    term: 'affidavit',
    phonetic: '/ˌæfəˈdeɪvɪt/',
    definitionZh: '宣誓书；书面证词',
    definitionEn: 'A written statement confirmed by oath or affirmation.',
    domain: '诉讼法',
    examples: [
      { sentence: 'The witness deposed to the facts in an affidavit.', source: 'Civil Procedure' },
    ],
  },
];
