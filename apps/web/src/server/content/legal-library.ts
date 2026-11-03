/**
 * 英文法律专题的骨架。
 *
 * 正文来自全国人大官网英文版的官方译本（Translation for Reference Only），
 * 按部门法分七类归档，落库时只存 documents 里的正文与两个归拢字段
 * （legal_category / legal_slug），分类的骨架、顺序与说明都在这里定义——
 * 分类是固定的七类，没必要为它单开一张表。
 *
 * 口径：译本供参考，不具法律效力；引用条文以中文原文本与官方发布为准。
 */

export interface LawCategoryMeta {
  /** 与全国人大英文法律库一致的分类代码 */
  code: string;
  /** 分类英文名（官方分类名，未作改写） */
  title: string;
  /** 分类中文名 */
  titleZh: string;
  /** 这一类收什么 */
  note: string;
}

export const LAW_CATEGORIES: LawCategoryMeta[] = [
  {
    code: '01',
    title: 'Constitution and Related Laws',
    titleZh: '宪法及相关法',
    note: '宪法、国家机构组织法、选举法、立法法、民族区域自治与监督法等，管的是国家根本制度与国家机关怎么组成、怎么运转。',
  },
  {
    code: '02',
    title: 'Civil and Commercial Laws',
    titleZh: '民法商法',
    note: '民法总则与公司、证券、期货、保险、商标、电子商务等商事单行法，多为民商事活动的底层规则。',
  },
  {
    code: '03',
    title: 'Administrative Laws',
    titleZh: '行政法',
    note: '行政处罚、行政许可、行政复议、公务员管理，以及公共卫生、食品安全、疫苗管理等行政管理规范。',
  },
  {
    code: '04',
    title: 'Economic Laws',
    titleZh: '经济法',
    note: '税收、预算、金融监管、反垄断、资源与环境保护、能源等宏观调控与市场规制规范，本类篇目最多。',
  },
  {
    code: '05',
    title: 'Social Laws',
    titleZh: '社会法',
    note: '劳动、社会保险、未成年人保护、反家庭暴力、退役军人保障等，落在社会权利与保障制度上。',
  },
  {
    code: '06',
    title: 'Criminal Laws',
    titleZh: '刑法',
    note: '刑法典，以及社区矫正、反有组织犯罪、反恐怖主义等刑事特别规范。',
  },
  {
    code: '07',
    title: 'Procedural and Nonprocedural Laws',
    titleZh: '诉讼与非诉讼程序法',
    note: '刑事、民事、行政诉讼程序，以及仲裁、国际刑事司法协助、人大议事规则等程序性规范。',
  },
];

export const LAW_CATEGORY_BY_CODE = new Map(LAW_CATEGORIES.map((c) => [c.code, c]));

/** 专题页与推荐阅读区块共用的一段出处说明 */
export const LAW_SOURCE_NOTE = {
  title: '英文法律专题',
  subtitle: 'China Laws in English',
  origin: '全国人民代表大会英文版官网',
  /** 首次归档的时间，写在专题页脚 */
  archivedOn: '2026-11-02',
  disclaimer:
    '正文取自全国人大官网英文版的官方译本，官网标注为 Translation for Reference Only：译本供参考，不具法律效力。引用条文请以中文正式文本为准。',
} as const;
