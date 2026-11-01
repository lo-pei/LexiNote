/**
 * 推荐阅读书目。
 *
 * 只收课程真正会用到的书，宁少不滥：一册在手，知道从哪一章读起，
 * 比列三十本更有用。ISBN 均按纸本版权页核对，检索时忽略连字符即可命中。
 */

export interface Reading {
  id: string;
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

export const readings: Reading[] = [
  {
    id: 'rd_hejiahong_4e',
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
