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

const mk = (name: string, loginNo: string, role: Role, email: string | null = null): SeedUser => ({
  name,
  loginNo,
  email,
  role,
  passwordHash: hashPassword(DEMO_PASSWORD),
});

export const users: SeedUser[] = [
  mk('陈时序', 'T202601', 'TEACHER', 'chen.shixu@law.edu.cn'),
  mk('沈慕之', 'T202602', 'TEACHER', 'shen.muzhi@law.edu.cn'),
  mk('林知远', '20230101', 'STUDENT', 'lin.zhiyuan@law.edu.cn'),
  mk('苏漾', '20230102', 'STUDENT', 'su.yang@law.edu.cn'),
  mk('郑嗣徽', '20230103', 'STUDENT', 'zheng.sihui@law.edu.cn'),
  mk('何砚', '20230104', 'STUDENT', 'he.yan@law.edu.cn'),
  mk('顾青禾', '20230105', 'STUDENT', 'gu.qinghe@law.edu.cn'),
  mk('唐聘', '20230106', 'STUDENT', 'tang.pin@law.edu.cn'),
  mk('江砚秋', '20230107', 'STUDENT', 'jiang.yanqiu@law.edu.cn'),
  mk('温予', '20230108', 'STUDENT', 'wen.yu@law.edu.cn'),
  mk('白露', '20230109', 'STUDENT', 'bai.lu@law.edu.cn'),
  mk('邵望', '20230110', 'STUDENT', 'shao.wang@law.edu.cn'),
  mk('岑屿', '20230111', 'STUDENT', 'cen.yu@law.edu.cn'),
  mk('卢见山', '20230112', 'STUDENT', 'lu.jianshan@law.edu.cn'),
];

/** 每门课的选课名单（索引指向 studentIds） */
export const enrollmentPlan: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
  [0, 1, 3, 5, 7, 9],
  [2, 4, 6, 8, 10, 11],
];

/* ── 班级 ─────────────────────────────────────────────────── */

export interface SeedClass {
  /** 对应 courses 数组下标 */
  courseIdx: number;
  teacherLoginNo: string;
  name: string;
  term: string;
  description: string;
  /** 6 位班级码：只含不易混淆的大写字母与数字 */
  joinCode: string;
  memberIdxs: number[];
  /** 演示用邀请令牌（真实邀请由教师在建班后生成随机串） */
  demoInvite?: string;
}

export const classSeed: SeedClass[] = [
  {
    courseIdx: 0,
    teacherLoginNo: 'T202601',
    name: '法学 2103 · 合同法精读',
    term: '2026 秋季学期',
    description: '周三 3–4 节，文科楼 402。课件与作业都在这里，课前读完当讲读本。',
    joinCode: 'LAW103',
    memberIdxs: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    demoInvite: 'demo-contract-2103',
  },
  {
    courseIdx: 1,
    teacherLoginNo: 'T202601',
    name: '法学 3211 · 判例阅读',
    term: '2026 秋季学期',
    description: '从 Donoghue 到 Caparo，训练判决书四步读法。',
    joinCode: 'LAW211',
    memberIdxs: [0, 1, 3, 5, 7, 9],
  },
  {
    courseIdx: 2,
    teacherLoginNo: 'T202602',
    name: '翻译工作坊 2026 秋',
    term: '2026 秋季学期',
    description: '小班工作坊，每两周一份合同或判决书节选互评。',
    joinCode: 'LAW402',
    memberIdxs: [2, 4, 6, 8, 10, 11],
    demoInvite: 'demo-workshop-2026',
  },
];

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
    title: '第三讲作业：用「事实—争点—判决—理由」拆解 Fisher v Bell',
    body:
      '请用四步法写一份 600 字以内的案例分析，重点回答：法院为什么认定橱窗陈列不构成「出售要约」？如果你不满意这个结论，你会如何论证相反立场？下周三 23:00 前提交。',
    graded: true,
    dueInDays: 5,
    daysAgo: 3,
    posts: [
      {
        authorIdx: 0,
        body:
          '争点应落在「offer for sale」这一法定表述的解释上，而不是一般的要约理论。1959 年立法目的是管制攻击性武器的流通，法院采取字面解释，把「为出售而陈列」与「出售要约」分开，结果是立法目的落空——这本身值得写进「理由」部分。',
        daysAgo: 2,
        answer: true,
        score: 92,
        note: '方向正确。补一句：字面解释规则（literal rule）在这里与「黄金规则」的关系，可以再展开。',
      },
      {
        authorIdx: 2,
        body:
          '我的理解是：如果把橱窗看作要约，顾客拿走商品即构成承诺，店主就没有拒绝交易的余地；而普通法更愿意把交易留到柜台那一刻。',
        daysAgo: 1,
      },
      {
        authorIdx: 5,
        body: '想问老师：如果标价明显错误（比如 1 英镑的相机），结论会不一样吗？',
        daysAgo: 1,
      },
      {
        teacher: true,
        body:
          '会。此时争点转为「错误」与「显失公平」，法院可能认定不存在真实合意；但在橱窗场景下，因为本来就不是要约，问题一般不会走到那一步。',
        daysAgo: 0,
      },
    ],
  },
  {
    courseIdx: 0,
    authorIsTeacher: false,
    authorIdx: 3,
    type: 'QUESTION',
    title: 'Carlill 案如果没有存入 1,000 英镑，结论会不同吗？',
    body:
      '判决里 Bowen LJ 反复提到存款这件事。我想确认：这笔存款是「构成要约」的必要条件，还是只是证明「认真」的证据？',
    graded: false,
    daysAgo: 4,
    posts: [
      {
        authorIdx: 1,
        body: '我倾向于是证据。要约的构成要件里没有「必须存款」这一项，但存款让「mere puff」的抗辩站不住。',
        daysAgo: 3,
      },
      {
        authorIdx: 3,
        body: '同意。但如果没有存款，法院可能要花更大力气去论证广告不是吹嘘，结论未必一样——这算不算「事实影响法律」？',
        daysAgo: 2,
      },
    ],
  },
  {
    courseIdx: 1,
    authorIsTeacher: true,
    type: 'QUESTION',
    title: 'Donoghue 案里，为什么不让消费者走合同路线？',
    body: '提示：想一想合同相对性（privity of contract），以及「谁买的那瓶姜啤酒」。',
    graded: false,
    daysAgo: 6,
    posts: [
      {
        authorIdx: 0,
        body: '因为酒是她朋友买的，她与店主、与制造商都没有合同关系，privity 挡住了合同之诉，只能走侵权。',
        daysAgo: 5,
      },
    ],
  },
];
