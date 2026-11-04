import type { SessionUser } from '@ln/types';
import { getDb } from '../db';
import { getActivePlan } from './teaching-plan';
import { shiftToWeekday, todayISO } from '../content/plan';

/**
 * 教学进度：把「课程安排」里的专题表换算成一张可看的进度图。
 *
 * 两个班共用一套课件，但上课星期不同（周三 / 周四），
 * 所以每个班都要用自己 program 的 weekday 重新推一次专题日期，
 * 否则周四的班会比实际早一天显示「已讲完」。
 */

export type ProgressState = 'done' | 'now' | 'todo';

export interface ProgressMark {
  no: number;
  title: string;
  state: ProgressState;
  date?: string;
}

export interface CourseProgress {
  courseId: string;
  courseTitle: string;
  classId: string | null;
  className: string | null;
  /** 本班课程代码 */
  code: string | null;
  /** 本班上课时间地点 */
  meets: string | null;
  total: number;
  done: number;
  /** 本次课（或下一讲）的序号与标题，全部讲完时为 null */
  currentNo: number | null;
  currentTitle: string | null;
  currentDate?: string;
  /** 已进行到第几周，未开课为 0 */
  week: number;
  totalWeeks: number;
  percent: number;
  marks: ProgressMark[];
}

interface CourseRow {
  id: string;
  title: string;
  class_id: string | null;
  class_name: string | null;
}

/** 16 周的课，起止写在「第 1–16 周」里；解析失败就按专题数兜底 */
function parseWeeks(label: string | undefined, fallback: number): number {
  const hit = label?.match(/(\d+)\s*[–\-—~至]\s*(\d+)/);
  if (hit) {
    const end = Number(hit[2]);
    if (Number.isFinite(end) && end > 0) return end;
  }
  return fallback;
}

function weeksSince(start: string | undefined, today: string): number {
  if (!start) return 0;
  const from = new Date(`${start}T00:00:00`).getTime();
  const to = new Date(`${today}T00:00:00`).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  if (to < from) return 0;
  return Math.floor((to - from) / (7 * 86_400_000)) + 1;
}

export function courseProgress(user: SessionUser): CourseProgress[] {
  const db = getDb();
  const { course, topics } = getActivePlan();
  if (!topics.length) return [];

  const rows =
    user.role === 'STUDENT'
      ? db.all<CourseRow>(
          `SELECT c.id, c.title, c.class_id, cls.name AS class_name
           FROM courses c
           JOIN enrollments e ON e.course_id = c.id AND e.student_id = ?
           LEFT JOIN classes cls ON cls.id = c.class_id
           ORDER BY cls.name ASC, c.created_at ASC`,
          user.id,
        )
      : db.all<CourseRow>(
          `SELECT c.id, c.title, c.class_id, cls.name AS class_name
           FROM courses c
           LEFT JOIN classes cls ON cls.id = c.class_id
           WHERE c.teacher_id = ?
           ORDER BY cls.name ASC, c.created_at ASC`,
          user.id,
        );

  const today = todayISO();
  const totalWeeks = parseWeeks(course.weeks, Math.max(16, topics.length));

  return rows.map((row) => {
    const program =
      course.programs.find((item) => item.className && item.className === row.class_name) ??
      course.programs[0];

    const dated = topics.map((topic) => ({
      ...topic,
      date: shiftToWeekday(topic.date, program?.weekday),
    }));

    const marks: ProgressMark[] = [];
    let current: (typeof dated)[number] | null = null;
    let done = 0;

    for (const topic of dated) {
      if (!topic.date) {
        marks.push({ no: topic.no, title: topic.title, state: 'todo' });
        if (!current) current = topic;
        continue;
      }
      if (topic.date < today) {
        done += 1;
        marks.push({ no: topic.no, title: topic.title, state: 'done', date: topic.date });
        continue;
      }
      const state: ProgressState = topic.date === today ? 'now' : 'todo';
      marks.push({ no: topic.no, title: topic.title, state, date: topic.date });
      if (!current) current = topic;
    }

    // 学期周以 course.termStart 为准：专题表里的日期是排课日，可能早于实际开学，
    // 直接拿第一讲的日期推周次会整体偏大（曾出现第 10 周而实际才第 8 周）。
    const start = course.termStart ?? dated.find((topic) => topic.date)?.date;
    const week = Math.min(weeksSince(start, today), totalWeeks);

    return {
      courseId: row.id,
      courseTitle: row.title,
      classId: row.class_id,
      className: row.class_name,
      code: program?.code ?? null,
      meets: program?.meets ?? null,
      total: marks.length,
      done,
      currentNo: current?.no ?? null,
      currentTitle: current?.title ?? null,
      currentDate: current?.date,
      week,
      totalWeeks,
      percent: marks.length ? Math.round((done / marks.length) * 100) : 0,
      marks,
    };
  });
}
