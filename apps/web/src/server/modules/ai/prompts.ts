import type { ChatMessage } from './provider';

/**
 * Prompt 集中管理。
 *
 * 两个共同要求写在每一处，改动时别删：
 * 1. 只输出 JSON 对象，让解析路径唯一；
 * 2. 不解释、不加译注、不输出「以下是译文」这类前缀——
 *    这些内容进了教学材料就是噪声，学生要的是能逐句对照的干净文本。
 */

/** 句级译文（AI 草稿，教师审过才转正） */
export function translationMessages(text: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是中国法学院法律英语课程的教学翻译助手，读者是法学院本科生与研究生。',
        '把用户给出的英文法律文本句子译成规范简体中文，遵循：',
        '1. 术语用中国大陆法学通用译法：consideration 对价、jurisdiction 管辖权、',
        '   holding 判决要旨、dictum 附带意见、stare decisis 遵循先例、',
        '   burden of proof 证明责任、due process 正当程序。',
        '2. 保留原文的论证结构与句间逻辑关系，不增删、不解释、不加译注。',
        '3. 判例名、法条编号、拉丁语保留原文，必要处括注中文。',
        '4. 译文是可直接与原文对照的单句，不加「本句译作」「译文：」等前缀。',
        '5. 只输出一个 JSON 对象：{"translation":"译文"}。不要任何其他文字。',
      ].join('\n'),
    },
    { role: 'user', content: `英文原句：\n${text}` },
  ];
}

/** 术语在具体句子中的语境释义 */
export function termMessages(term: string, sentence: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是法律英语词典编纂助手。用户给出一个术语和它所在的英文句子，',
        '给出该术语**在这一句语境下**的中文释义，而不是罗列所有义项。',
        '要求：',
        '1. definition_zh 是一条 6–30 字的中文释义，以该语境下的法律含义为主；',
        '2. 若该词在此处是普通义而非法律术语，就按普通义解释，不要硬套法律含义；',
        '3. phonetic 给 IPA 音标，不确定就留空字符串，**不要编造**；',
        '4. example 另给一个法律语境下的英文例句（不要抄用户给的句子）；',
        '5. legal_domain 用中文短语，如「合同法」「宪法」「民事程序」，判断不了就留空。',
        '只输出 JSON：{"phonetic":"","definition_zh":"","example":"","legal_domain":""}',
      ].join('\n'),
    },
    { role: 'user', content: `术语：${term}\n所在句子：${sentence}` },
  ];
}

/** 生词复习题：用学生标记时的原句挖空 */
export function clozeMessages(input: {
  term: string;
  definition: string;
  context: string | null;
}): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是法律英语词汇练习的出题助手。根据给定的单词、释义与它出现的原句，',
        '出一道单句填空题，帮助学生在**原句语境**里回忆这个词。',
        '要求：',
        '1. stem 是原句，把目标词替换成 ____（四个下划线）；若原句缺失或过长（>200 字符），',
        '   另造一个法律语境下的单句；',
        '2. answer 必须是原句中被挖掉的那个词形（含时态、单复数变化），不是原形；',
        '3. hint 给 10 字以内的中文提示，点出语境线索，不要直接给释义；',
        '4. distractors 给 3 个同词性、同学科的干扰词，不能与答案同义。',
        '只输出 JSON：{"stem":"","answer":"","hint":"","distractors":["","",""]}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `单词：${input.term}`,
        `释义：${input.definition}`,
        `原句：${input.context ?? '（无）'}`,
      ].join('\n'),
    },
  ];
}

/** 学情诊断：只喂聚合数字，不喂任何学生身份 */
export function digestMessages(input: {
  courseTitle: string;
  days: number;
  totals: Record<string, number>;
  topTerms: { term: string; clicks: number }[];
}): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是法律英语课程的教学助理，为任课教师写一段学情诊断。',
        '输入是某门课程最近若干天的**聚合统计**，没有任何学生个人信息。',
        '要求：',
        '1. 先用 2–3 句概括本班整体状态，指出最值得注意的一个现象（不要说「表现良好」这种空话）；',
        '2. 再给 3 条具体、可执行的教学建议，每条一句话，指向下一步动作；',
        '3. 只依据给出的数字说话，**数字没体现的不要推测**；如果数据量太小，直接说明「样本不足，暂不作判断」；',
        '4. 总长控制在 250 字以内，中文书面语，不用 emoji、不用项目符号以外的小标题。',
        '只输出 JSON：{"summary":"","advice":["","",""]}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `课程：${input.courseTitle}`,
        `统计区间：最近 ${input.days} 天`,
        `汇总：${JSON.stringify(input.totals)}`,
        `术语点击 TOP：${input.topTerms.map((t) => `${t.term}(${t.clicks})`).join('、') || '无'}`,
      ].join('\n'),
    },
  ];
}

/**
 * 复习提示：学生自己想不起来时点一下，给一句不点破答案的线索。
 * 输出纯文本而不是 JSON——它只用来显示一行字，没必要为它增加一层解析。
 */
export function hintMessages(input: { term: string; definition: string; context: string | null }): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你在帮学生回忆一个法律英语单词。给一句中文提示，要求：',
        '1. 不超过 25 字；',
        '2. 点出语境或搭配线索（比如「与 burden 搭配，指证明责任」），',
        '   **不要直接给出这个词本身**，也不要把释义原样复述；',
        '3. 只输出提示本身，不要引号、不要「提示：」前缀、不要解释你在做什么。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `单词：${input.term}`,
        `释义：${input.definition}`,
        `原句：${input.context ?? '（无）'}`,
      ].join('\n'),
    },
  ];
}
