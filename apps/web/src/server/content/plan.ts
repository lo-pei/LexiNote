import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../db';

/**
 * 学期课程安排。
 *
 * 为什么不在代码里写死：任课教师、教室、课程代码、专题与案例都属于校本信息，
 * 一旦进了仓库就等于公开。所以真实安排放在 `data/course-plan.local.json`
 * （已被 .gitignore 排除，只存在于部署机上），仓库里只保留一份示例。
 * 找不到本地文件时退回示例，页面照常渲染，不会白屏。
 */

export type TopicKind = 'LECTURE' | 'READING';

export interface PlanCase {
  name: string;
  citation?: string;
}

export interface PlanTopic {
  no: number;
  /** 英文专题名，正文用衬线排 */
  title: string;
  /** 中文专题名，可留空 */
  titleZh?: string;
  kind: TopicKind;
  /** 上课日（YYYY-MM-DD），用于判断已讲完 / 未开始 */
  date?: string;
  /** 上课周次，如「第 3 周」 */
  week?: string;
  summary?: string;
  cases: PlanCase[];
}

/** 专题相对当前日期的进度 */
export type TopicState = 'done' | 'today' | 'upcoming';

export function topicState(date: string | undefined, today: string): TopicState | null {
  if (!date) return null;
  if (date < today) return 'done';
  if (date === today) return 'today';
  return 'upcoming';
}

export const TOPIC_STATE_LABEL: Record<TopicState, string> = {
  done: '已讲完',
  today: '本次课',
  upcoming: '未开始',
};

/** 本地日期字符串，避免 toISOString 的 UTC 偏移 */
export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** 「9 月 2 日 周三」 */
export function formatTopicDate(date: string | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const week = '日一二三四五六'[parsed.getDay()];
  return `${parsed.getMonth() + 1} 月 ${parsed.getDate()} 日 周${week}`;
}

/**
 * 把基准日挪到某一教学班的上课星期。
 *
 * 同一份专题表由两个班共用，基准日按其中一个班（通常是先上课的那个）写；
 * 另一个班的上课日就落在同一周的对应星期上。跨周位移控制在 ±3 天内，
 * 保证不会把「第 5 周」的课算进第 4 周或第 6 周。
 */
export function shiftToWeekday(date: string | undefined, weekday: number | undefined): string | undefined {
  if (!date || !weekday) return date;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const current = parsed.getDay() === 0 ? 7 : parsed.getDay();
  let delta = weekday - current;
  if (delta > 3) delta -= 7;
  if (delta < -3) delta += 7;
  if (!delta) return date;
  parsed.setDate(parsed.getDate() + delta);
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
}

export interface PlanProgram {
  name: string;
  code: string;
  /** 对应的教学班名称，与班级表里的 name 完全一致时才能把安排准确发给该班学生 */
  className?: string;
  /** 该班的上课时间与地点，如「周三 3–4 节 · 信息楼 326」 */
  meets?: string;
  /** 该班每周上课的星期（1 = 周一 … 7 = 周日），用于把专题日期换算成本班的实际上课日 */
  weekday?: number;
}

export interface PlanCourse {
  title: string;
  alias?: string;
  term?: string;
  teacher?: string;
  room?: string;
  weeks?: string;
  mode?: string;
  programs: PlanProgram[];
  note?: string;
}

/**
 * 一套授课课件。
 *
 * 同一门课备了多套讲法时（例如「总论 + 判例研讨」与「合同法侵权法专题」），
 * 教师选定其中一套授课，学生看到的专题与案例随之切换；
 * 未选定时用第一套，页面照常可用。
 */
export interface PlanCourseware {
  id: string;
  name: string;
  /** 一句话说明侧重，教师选课件时看这个 */
  summary?: string;
  note?: string;
  topics: PlanTopic[];
}

export interface CoursePlan {
  course: PlanCourse;
  /** 当前生效（默认第一套）的专题，保留该字段是为了兼容旧的单套写法 */
  topics: PlanTopic[];
  note?: string;
  coursewares: PlanCourseware[];
}

export const PLAN_FILE = path.join(REPO_ROOT, 'data', 'course-plan.local.json');

const exampleTopics: PlanTopic[] = [
    {
      no: 1,
      title: 'Judicial review system',
      titleZh: '司法审查',
      kind: 'READING',
      cases: [
        { name: 'Donoghue v. Stevenson', citation: '[1932] UKHL 100' },
        { name: 'Byrne v. Boadle', citation: '2 H. & C. 722, 159 Eng. Rep. 299 (1863)' },
      ],
    },
    {
      no: 2,
      title: 'US long-arm jurisdiction',
      titleZh: '美国长臂管辖',
      kind: 'LECTURE',
      cases: [{ name: 'International Shoe Co. v. Washington', citation: '326 U.S. 310 (1945)' }],
    },
    {
      no: 3,
      title: 'Jury system',
      titleZh: '陪审制',
      kind: 'LECTURE',
      cases: [{ name: 'North Carolina v. Alford', citation: '400 U.S. 25 (1970)' }],
    },
    {
      no: 4,
      title: 'Due process and criminal procedure',
      titleZh: '正当程序与刑事程序',
      kind: 'LECTURE',
      cases: [{ name: 'Miranda v. Arizona', citation: '384 U.S. 436 (1966)' }],
    },
];

const examplePlan: CoursePlan = {
  course: {
    title: '法律英语',
    alias: '示例课程',
    term: '示例学期',
    teacher: '示例教师',
    room: '示例教室',
    weeks: '第 1–16 周',
    mode: '讲授',
    programs: [{ name: '示例教学班', code: '0.000.000.0' }],
    note: '这是仓库自带的示例安排。真实课表写在本机的 data/course-plan.local.json（已被 .gitignore 排除），不会随仓库发布。',
  },
  topics: exampleTopics,
  note: '示例数据。真实安排写入 data/course-plan.local.json 后自动替换。',
  coursewares: [
    {
      id: 'sample',
      name: '示例授课课件',
      summary: '仓库自带的四讲示例，用于验证页面与选课件流程。',
      note: '示例数据。真实安排写入 data/course-plan.local.json 后自动替换。',
      topics: exampleTopics,
    },
  ],
};

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** 专题数组的解析：课件内部与旧版顶层 topics 共用同一套规则 */
function readTopics(raw: unknown): PlanTopic[] {
  if (!Array.isArray(raw)) return [];
  const topics: PlanTopic[] = [];
  raw.forEach((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const title = asString(row.title);
    if (!title) return;

    const cases: PlanCase[] = [];
    if (Array.isArray(row.cases)) {
      for (const entry of row.cases) {
        const c = (entry ?? {}) as Record<string, unknown>;
        const name = asString(c.name);
        if (name) cases.push({ name, citation: asString(c.citation) });
      }
    }

    topics.push({
      no: typeof row.no === 'number' ? row.no : index + 1,
      title,
      titleZh: asString(row.titleZh),
      kind: row.kind === 'READING' ? 'READING' : 'LECTURE',
      date: asString(row.date),
      week: asString(row.week),
      summary: asString(row.summary),
      cases,
    });
  });
  return topics;
}

function normalize(raw: unknown): CoursePlan {
  if (!raw || typeof raw !== 'object') return examplePlan;
  const input = raw as Record<string, unknown>;
  const courseInput = (input.course ?? {}) as Record<string, unknown>;

  const programs = Array.isArray(courseInput.programs)
    ? courseInput.programs
        .map((item) => {
          const row = (item ?? {}) as Record<string, unknown>;
          const name = asString(row.name);
          const code = asString(row.code);
          const weekday = row.weekday;
          if (!name || !code) return null;
          const program: PlanProgram = { name, code };
          const className = asString(row.className);
          const meets = asString(row.meets);
          if (className) program.className = className;
          if (meets) program.meets = meets;
          if (typeof weekday === 'number' && weekday >= 1 && weekday <= 7) program.weekday = weekday;
          return program;
        })
        .filter((item): item is PlanProgram => item !== null)
    : [];

  const course: PlanCourse = {
    title: asString(courseInput.title) ?? '法律英语',
    alias: asString(courseInput.alias),
    term: asString(courseInput.term),
    teacher: asString(courseInput.teacher),
    room: asString(courseInput.room),
    weeks: asString(courseInput.weeks),
    mode: asString(courseInput.mode),
    programs,
    note: asString(courseInput.note),
  };

  /* 多套授课课件：每套自带专题表，教师选定其中一套 */
  const coursewares: PlanCourseware[] = [];
  if (Array.isArray(input.coursewares)) {
    input.coursewares.forEach((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const name = asString(row.name);
      const topics = readTopics(row.topics);
      if (!name || !topics.length) return;
      coursewares.push({
        id: asString(row.id) ?? `cw-${index + 1}`,
        name,
        summary: asString(row.summary),
        note: asString(row.note),
        topics,
      });
    });
  }

  // 旧的单套写法：顶层 topics 视为唯一一套课件，照旧可用
  const topTopics = readTopics(input.topics);
  if (!coursewares.length && topTopics.length) {
    coursewares.push({
      id: 'default',
      name: '本学期授课安排',
      topics: topTopics,
      note: asString(input.note),
    });
  }

  if (!coursewares.length) return examplePlan;
  const first = coursewares[0]!;
  return {
    course,
    topics: first.topics,
    note: first.note ?? asString(input.note),
    coursewares,
  };
}

let cached: { plan: CoursePlan; source: 'local' | 'example' } | null = null;

export function getCoursePlan(): { plan: CoursePlan; source: 'local' | 'example' } {
  if (cached) return cached;
  try {
    const raw = fs.readFileSync(PLAN_FILE, 'utf8');
    cached = { plan: normalize(JSON.parse(raw)), source: 'local' };
  } catch {
    cached = { plan: examplePlan, source: 'example' };
  }
  return cached;
}

export const TOPIC_KIND_LABEL: Record<TopicKind, string> = {
  LECTURE: '讲授',
  READING: '延伸阅读',
};
