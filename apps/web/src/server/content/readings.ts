/**
 * 推荐阅读书目。
 *
 * 只收课程真正会用到的书，宁少不滥：一册在手，知道从哪一章读起，
 * 比列三十本更有用。ISBN 均按纸本版权页核对，检索时忽略连字符即可命中。
 */

/** 书单分组：按「拿它做什么用」分，而不是按出版社或年份堆在一起 */
export type ReadingGroupKey = 'read' | 'trans' | 'listen' | 'exam' | 'ref';

export interface Reading {
  id: string;
  /** 所属分组，见 READING_GROUPS */
  group: ReadingGroupKey;
  title: string;
  author: string;
  publisher: string;
  year: string;
  /** 纸本 ISBN（带连字符显示用；检索时去掉非数字字符再比） */
  isbn: string;
  /** 一句话说明：这本书补哪一块 */
  note: string;
  tags: string[];
}

/** 分组顺序即页面上自上而下的顺序：先打底，再专项，最后查考 */
export const READING_GROUPS: { key: ReadingGroupKey; title: string; lead: string }[] = [
  { key: 'read', title: '精读教材', lead: '课堂主线，按课/讲推进，缺系统底子时先读这一组。' },
  { key: 'trans', title: '翻译与写作', lead: '产出型训练：先把英文读懂，再把中文写对、把文书格式写对。' },
  { key: 'listen', title: '听说训练', lead: '庭审、讲座与课堂对话的听力材料，口译机房上课可直接配合。' },
  { key: 'exam', title: '应试真题', lead: '看命题口径用，不必通读；成套做完再对解析。' },
  { key: 'ref', title: '工具书', lead: '查词备查，按需翻检，不适合从头读到尾。' },
];

export const readings: Reading[] = [
  {
    id: 'rd_hejiahong_4e',
    group: 'read',
    title: '法律英语（第四版）',
    author: '何家弘 编',
    publisher: '法律出版社',
    year: '2008',
    isbn: '978-7-5036-8606-1',
    note: '国家级规划教材，二十二课从法律制度讲到证据规则，每课按课文、背景、注释、练习排。缺系统底子时先读这本。',
    tags: ['教材', '精读'],
  },
  {
    id: 'rd_zhang_jingdu_1',
    group: 'read',
    title: '法律英语精读教程（上）',
    author: '张法连 主编',
    publisher: '北京大学出版社',
    year: '2016',
    isbn: '978-7-301-27269-5',
    note: '前半部讲英美法律文化，后半部按宪法、合同法、侵权法、财产法、证据法、刑法分章，配判例。与课上专题对得上。',
    tags: ['教材', '精读', 'LEC'],
  },
  {
    id: 'rd_zhang_jingdu_2',
    group: 'read',
    title: '法律英语精读教程（下）',
    author: '张法连 主编',
    publisher: '北京大学出版社',
    year: '2017',
    isbn: '978-7-301-28145-1',
    note: '接上册，程序法与部门法的判例更长，适合练 ratio decidendi 的提取与案情摘要。',
    tags: ['教材', '精读', 'LEC'],
  },
  {
    id: 'rd_zhang_fanyi',
    group: 'trans',
    title: '法律英语翻译教程',
    author: '张法连 主编',
    publisher: '北京大学出版社',
    year: '2016',
    isbn: '978-7-301-27519-1',
    note: '讲汉英法律文本的对等层级与句法处理，术语、长句、程式化表达的译法都有对照例。做译文对照时最好手边有一本。',
    tags: ['翻译', 'LEC'],
  },
  {
    id: 'rd_zhang_xiezuo',
    group: 'trans',
    title: '法律英语写作教程',
    author: '张法连 主编',
    publisher: '北京大学出版社',
    year: '2018',
    isbn: '978-7-301-27384-5',
    note: '法律备忘录、案情摘要、律师函的体例与措辞。写作课的作业多半能在这里找到模板。',
    tags: ['写作', 'LEC'],
  },
  {
    id: 'rd_zhang_shiting',
    group: 'listen',
    title: '法律英语视听说',
    author: '张法连 主编',
    publisher: '北京大学出版社',
    year: '2017',
    isbn: '978-7-301-28668-5',
    note: '材料取自法学院课堂、外媒报道与法院文件，练庭审与讲座的听力。口译机房上课时可直接配合使用。',
    tags: ['听说', 'LEC'],
  },
  {
    id: 'rd_zhang_shuyu',
    group: 'ref',
    title: '英美法律术语双解',
    author: '张法连 编著',
    publisher: '北京大学出版社',
    year: '2016',
    isbn: '978-7-301-27614-3',
    note: '约三千条英美法术语，每条先英文释义再中文对译。查词时先看英文释义，比只看中文准确。',
    tags: ['工具书', '术语'],
  },
  {
    id: 'rd_walenn',
    group: 'read',
    title: '法律英语教程（大学专门用途英语系列）',
    author: 'Jeremy Walenn 原著；《大学专门用途英语》改编组 改编',
    publisher: '高等教育出版社',
    year: '2012',
    isbn: '978-7-04-034373-1',
    note: '十二个单元，奇数单元练听说、偶数单元练读写，篇幅短、上手快。适合学期初热身。',
    tags: ['教材', 'ESP', '听说'],
  },
  {
    id: 'rd_lec_0812',
    group: 'exam',
    title: '法律英语证书（LEC）全国统一考试历年真题详解（2008—2012）',
    author: '法律英语证书（LEC）全国统一考试指导委员会 编',
    publisher: '中国法制出版社',
    year: '2013',
    isbn: '978-7-5093-4749-2',
    note: '十套真题加逐题解析，题型与美国律考接近。要看命题口径就读它，不必当教材通读。',
    tags: ['真题', 'LEC'],
  },
  {
    id: 'rd_lec_1316',
    group: 'exam',
    title: '法律英语证书（LEC）全国统一考试历年真题详解（2013—2016）',
    author: '张法连 主编',
    publisher: '北京大学出版社',
    year: '2017',
    isbn: '978-7-301-28994-5',
    note: '接上一册，新增法律翻译题型。真题按年份成套做，做完再对解析。',
    tags: ['真题', 'LEC'],
  },
];

/** 把用户输入压成可比较的形式：去掉空格、连字符、ISBN 前缀 */
export function normalizeIsbn(value: string): string {
  return value.replace(/[^0-9xX]/g, '').toLowerCase();
}
