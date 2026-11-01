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
  summary?: string;
  cases: PlanCase[];
}

export interface PlanProgram {
  name: string;
  code: string;
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

export interface CoursePlan {
  course: PlanCourse;
  topics: PlanTopic[];
  note?: string;
}

export const PLAN_FILE = path.join(REPO_ROOT, 'data', 'course-plan.local.json');

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
  topics: [
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
  ],
  note: '示例数据。真实安排写入 data/course-plan.local.json 后自动替换。',
};

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
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
          return name && code ? { name, code } : null;
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

  const topics: PlanTopic[] = [];
  if (Array.isArray(input.topics)) {
    input.topics.forEach((item, index) => {
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
        summary: asString(row.summary),
        cases,
      });
    });
  }

  if (!topics.length) return examplePlan;
  return { course, topics, note: asString(input.note) };
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
