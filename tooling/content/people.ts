import { hashPassword } from '@ln/utils/password';
import type { Role } from '@ln/types';

const DEMO_PASSWORD = 'lexinote';

export interface SeedUser {
  /** 登录账号：学生为学号，教师为工号 */
  loginNo: string;
  email: string | null;
  name: string;
  role: Role;
  passwordHash: string;
}

/**
 * 演示口令只有一句，没必要为每个账号各跑一次 scrypt（121 个账号要算十几秒）。
 * 同一个口令复用同一份散列，校验语义不变。
 */
let demoHash: string | null = null;
const hashDemo = (): string => (demoHash ??= hashPassword(DEMO_PASSWORD));

const mk = (name: string, loginNo: string, role: Role, email: string | null = null): SeedUser => ({
  name,
  loginNo,
  email,
  role,
  passwordHash: hashDemo(),
});

/* ── 学生名册 ───────────────────────────────────────────────
   两个教学班各 60 人：法学班学号 2632xxxx，非法学班 2633xxxx。
   姓名由固定姓氏与名字池确定性组合，保证每次重建结果一致。 */

const SURNAMES = [
  '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈',
  '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许',
];

const GIVEN_NAMES = [
  '嘉禾', '沐白', '令仪', '望舒', '亦舟', '云舒', '语冰', '明川', '若谷', '涵之',
  '修远', '元朗', '知微', '秋水', '承宇', '时雨', '之涣', '慕青', '斯年', '清和',
  '灵均', '允中', '怀瑾', '少卿', '子衿', '逸鸣', '谨言', '静姝', '长庚', '洛川',
  '归鸿', '千帆', '文渊', '玉衡', '星野', '稚珪', '怡然', '绍元', '荷衣', '庭兰',
];

/** 前两位是仓库里已有的演示学生，登录页与示例笔记沿用这两个号 */
const PINNED = ['林知远', '苏漾'];

function buildNames(count: number): string[] {
  const used = new Set(PINNED);
  const names = [...PINNED];
  for (let i = 0; names.length < count; i += 1) {
    const name = SURNAMES[i % SURNAMES.length]! + GIVEN_NAMES[Math.floor(i / SURNAMES.length) % GIVEN_NAMES.length]!;
    if (used.has(name)) continue;
    used.add(name);
    names.push(name);
  }
  return names;
}

const STUDENTS_PER_CLASS = 60;

export interface SeedStudent {
  name: string;
  loginNo: string;
  classIdx: 0 | 1;
}

const LAW_NAMES = buildNames(STUDENTS_PER_CLASS);
const NON_LAW_NAMES = buildNames(STUDENTS_PER_CLASS * 2).slice(STUDENTS_PER_CLASS);

export const studentSeed: SeedStudent[] = [
  ...LAW_NAMES.map((name, i) => ({
    name,
    loginNo: String(26320001 + i),
    classIdx: 0 as const,
  })),
  ...NON_LAW_NAMES.map((name, i) => ({
    name,
    loginNo: String(26330001 + i),
    classIdx: 1 as const,
  })),
];

export const users: SeedUser[] = [
  mk('王红燕', 'T202601', 'TEACHER', 'wang.hongyan@law.edu.cn'),
  ...studentSeed.map((s, i) =>
    mk(s.name, s.loginNo, 'STUDENT', i === 0 ? 'lin.zhiyuan@law.edu.cn' : i === 1 ? 'su.yang@law.edu.cn' : null),
  ),
];

/* ── 班级 ─────────────────────────────────────────────────── */

export interface SeedClass {
  /** 对应 courses 数组下标 */
  courseIdx: number;
  teacherLoginNo: string;
  name: string;
  term: string;
  /** 上课时间与地点：学情页的班级按钮直接读这一行 */
  description: string;
  /** 6 位班级码：只含不易混淆的大写字母与数字 */
  joinCode: string;
  memberIdxs: number[];
  /** 演示用邀请令牌（真实邀请由教师在建班后生成随机串） */
  demoInvite?: string;
}

const range = (start: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => start + i);

export const classSeed: SeedClass[] = [
  {
    courseIdx: 0,
    teacherLoginNo: 'T202601',
    name: '法律英语 02 班 · 法律硕士（法学）',
    term: '2026 秋季学期',
    description: '周三 3–4 节 · 信息楼 326（口译机房）',
    joinCode: 'LAW26A',
    memberIdxs: range(0, STUDENTS_PER_CLASS),
    demoInvite: 'demo-law-2602',
  },
  {
    courseIdx: 1,
    teacherLoginNo: 'T202601',
    name: '法律英语 02 班 · 法律硕士（非法学）',
    term: '2026 秋季学期',
    description: '周五 3–4 节 · 信息楼 326（口译机房）',
    joinCode: 'LAW26B',
    memberIdxs: range(STUDENTS_PER_CLASS, STUDENTS_PER_CLASS),
    demoInvite: 'demo-nonlaw-2602',
  },
];

/** 每门课的选课名单（索引指向学生序号）：一个班一门课，全员在册 */
export const enrollmentPlan: number[][] = classSeed.map((c) => c.memberIdxs);

/* ── 讨论区 ───────────────────────────────────────────────── */

export interface SeedPost {
  authorIdx?: number;
  teacher?: boolean;
  body: string;
  daysAgo: number;
  answer?: boolean;
  score?: number;
  note?: string;
}

export interface SeedTopic {
  courseIdx: number;
  authorIsTeacher: boolean;
  authorIdx?: number;
  type: 'QUESTION' | 'ASSIGNMENT';
  title: string;
  body: string;
  graded: boolean;
  dueInDays?: number;
  daysAgo: number;
  posts: SeedPost[];
}

export const forumSeed: SeedTopic[] = [
  {
    courseIdx: 0,
    authorIsTeacher: true,
    type: 'ASSIGNMENT',
    title: '第三讲作业：用「事实—争点—判决—理由」拆解 Donoghue v. Stevenson',
    body:
      '请用四步法写一份 600 字以内的案例分析，重点回答：上议院为什么绕开合同相对性，把注意义务直接加给制造商？如果你不满意这个结论，你会如何论证相反立场？下周三 23:00 前提交。',
    graded: true,
    dueInDays: 5,
    daysAgo: 3,
    posts: [
      {
        authorIdx: 0,
        body:
          '争点应落在「制造商对非合同相对人是否负注意义务」上，而不是买卖关系本身。1932 年之前同类案件多走合同，本案把责任基础换成了邻人原则（neighbour principle），结果是产品责任从契约里独立出来——这本身值得写进「理由」部分。',
        daysAgo: 2,
        answer: true,
        score: 92,
        note: '方向正确。补一句：Atkin 勋爵的邻人原则与「可预见性」的关系，可以再展开。',
      },
      {
        authorIdx: 2,
        body:
          '我的理解是：如果坚持合同相对性，受害者只能起诉卖酒的朋友，而朋友并无过错；法律若止步于此，风险就被留在最没有能力防范的一方手里。',
        daysAgo: 1,
      },
      {
        authorIdx: 5,
        body: '想问老师：如果啤酒瓶是消费者自己从货架上拿的，结论会不一样吗？',
        daysAgo: 1,
      },
      {
        teacher: true,
        body:
          '不会根本改变。争点仍是制造商有无注意义务；购买环节由谁完成，只影响是否存在合同之诉，不影响侵权之诉的成立。',
        daysAgo: 0,
      },
    ],
  },
  {
    courseIdx: 0,
    authorIsTeacher: false,
    authorIdx: 3,
    type: 'QUESTION',
    title: 'Forum non conveniens 与我国的「不方便法院」是一回事吗？',
    body:
      '课上讲到 Joyvio 案，英国法院用不方便法院原则中止诉讼。我想确认：我国民事诉讼法里的不方便法院，是同一套逻辑吗？',
    graded: false,
    daysAgo: 4,
    posts: [
      {
        authorIdx: 1,
        body:
          '我倾向于是功能相近、技术不同：英国放在管辖阶段做裁量中止，我国更多在受理与涉外管辖协调里处理，标准与救济路径都不一样。',
        daysAgo: 3,
      },
      {
        authorIdx: 3,
        body: '同意。但两边都在回答同一个问题——哪一个法院审理更适当。这算不算「共同的法理基础」？',
        daysAgo: 2,
      },
    ],
  },
  {
    courseIdx: 1,
    authorIsTeacher: true,
    type: 'QUESTION',
    title: '长臂管辖里，「最低联系」到底要低到什么程度？',
    body: '提示：从 International Shoe 的 systematic and continuous 到 Daimler 的「实质居家」，先看标准怎么收紧，再看例外。',
    graded: false,
    daysAgo: 6,
    posts: [
      {
        authorIdx: 60,
        body:
          'International Shoe 用的是「有联系且不违反正当程序」，Daimler 之后接近「实质居家」（at home），例外只剩注册地与主要营业地。',
        daysAgo: 5,
      },
    ],
  },
];