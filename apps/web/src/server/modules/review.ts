import { nextSm2 } from '@ln/utils';
import { getDb } from '../db';

/**
 * 生词复习的排期与出题（方案 §4.4）。
 *
 * 两个刻意的设计：
 * 1. **排期是纯规则（SM-2）**，不让模型决定「这个学生会不会」——调度权交给模型，
 *    复习计划就不可解释、也不可复现；
 * 2. **题干默认用原句挖空**，不调模型。学生标记生词时保存的 source_context 就是最好的题面，
 *    而且瞬时、免费、没配模型也能用。模型只在学生主动点「提示」时出场。
 *
 * 现在的现实是：4,661 条生词里 4,649 条掌握度为 0，这个功能就是把它们变成每日可做的量。
 */

export interface ReviewCard {
  scheduleId: string;
  itemId: string;
  term: string;
  phonetic: string | null;
  definition: string;
  /** 题面：原句挖空，或（无原句时）中文释义反查 */
  stem: string;
  answer: string;
  kind: 'CLOZE' | 'TRANSLATE';
  /** 有原句时学生可以点「看提示」，让模型给一句语境线索 */
  hasContext: boolean;
  reps: number;
}

export interface ReviewStats {
  due: number;
  total: number;
  doneToday: number;
}

/** 单次队列长度：一次做二十个词已经是一节课的量 */
const QUEUE_SIZE = 20;

interface ScheduleRow {
  schedule_id: string;
  item_id: string;
  interval_days: number;
  ease: number;
  reps: number;
  term: string;
  phonetic: string | null;
  definition_zh: string;
  source_context: string | null;
}

/**
 * 把还没排期的生词按「加入时间」先后铺进队列。
 *
 * 关键是只补到队列长度为止：早先的写法是每次访问都补固定条数，
 * 学生刷新几次页面就会把四千多条生词一次性全压进队列，第二天直接面对几百个到期。
 * 现在只有当「今日到期」不足一队时才补，缺口多少补多少。
 */
function seedSchedules(userId: string): void {
  const db = getDb();
  const due =
    db.get<{ c: number }>(
      `SELECT count(*) AS c FROM review_schedules WHERE user_id = ? AND due_on <= date('now')`,
      userId,
    )?.c ?? 0;
  const need = QUEUE_SIZE - due;
  if (need <= 0) return;

  db.run(
    `INSERT INTO review_schedules (id, user_id, item_id, due_on, interval_days, ease, reps, lapses)
     SELECT 'rev_' || lower(hex(randomblob(8))), ?, i.id, date('now'), 1, 2.5, 0, 0
       FROM wordbook_items i
      WHERE i.user_id = ?
        AND NOT EXISTS (SELECT 1 FROM review_schedules s WHERE s.user_id = i.user_id AND s.item_id = i.id)
      ORDER BY i.added_at ASC
      LIMIT ?`,
    userId,
    userId,
    need,
  );
}

/** 原句挖空：保留句中真实的词形（时态、单复数），那才是学生该回忆的东西 */
function makeCloze(term: string, context: string): { stem: string; answer: string } | null {
  const at = context.toLowerCase().indexOf(term.toLowerCase());
  if (at < 0) return null;
  const actual = context.slice(at, at + term.length);
  const stem = `${context.slice(0, at)}____${context.slice(at + term.length)}`;
  return { stem, answer: actual };
}

export function reviewQueue(userId: string, limit = QUEUE_SIZE): ReviewCard[] {
  seedSchedules(userId);

  const rows = getDb().all<ScheduleRow>(
    `SELECT s.id AS schedule_id, s.item_id, s.interval_days, s.ease, s.reps,
            e.term, e.phonetic, e.definition_zh, i.source_context
       FROM review_schedules s
       JOIN wordbook_items i ON i.id = s.item_id
       JOIN vocabulary_entries e ON e.id = i.entry_id
      WHERE s.user_id = ? AND s.due_on <= date('now')
      ORDER BY s.due_on ASC, s.reps ASC
      LIMIT ?`,
    userId,
    limit,
  );

  return rows.map((row) => {
    const context = (row.source_context ?? '').trim();
    const cloze = context ? makeCloze(row.term, context) : null;
    return {
      scheduleId: row.schedule_id,
      itemId: row.item_id,
      term: row.term,
      phonetic: row.phonetic,
      definition: row.definition_zh,
      stem: cloze?.stem ?? row.definition_zh,
      answer: cloze?.answer ?? row.term,
      kind: cloze ? 'CLOZE' : 'TRANSLATE',
      hasContext: Boolean(context),
      reps: row.reps,
    };
  });
}

export function reviewStats(userId: string): ReviewStats {
  const db = getDb();
  const due =
    db.get<{ c: number }>(
      `SELECT count(*) AS c FROM review_schedules WHERE user_id = ? AND due_on <= date('now')`,
      userId,
    )?.c ?? 0;
  const total =
    db.get<{ c: number }>(`SELECT count(*) AS c FROM review_schedules WHERE user_id = ?`, userId)?.c ?? 0;
  const doneToday =
    db.get<{ c: number }>(
      `SELECT count(*) AS c FROM review_schedules
        WHERE user_id = ? AND last_grade IS NOT NULL AND date(updated_at) = date('now')`,
      userId,
    )?.c ?? 0;
  return { due, total, doneToday };
}

export interface GradeResult {
  dueOn: string;
  intervalDays: number;
  ease: number;
}

/**
 * 标准 SM-2：答对按 ease 递推间隔，答错归零重来。
 * 计算本身在 `@ln/utils` 的 nextSm2 里（纯函数，可脱离数据库单测），
 * 这里只负责读当前状态、写回结果与到期日。
 */
export function gradeCard(userId: string, scheduleId: string, grade: 0 | 1 | 2 | 3): GradeResult | null {
  const db = getDb();
  const row = db.get<{ interval_days: number; ease: number; reps: number; lapses: number }>(
    `SELECT interval_days, ease, reps, lapses FROM review_schedules WHERE id = ? AND user_id = ?`,
    scheduleId,
    userId,
  );
  if (!row) return null;

  const next = nextSm2(
    { intervalDays: row.interval_days, ease: row.ease, reps: row.reps, lapses: row.lapses },
    grade,
  );
  const { intervalDays: interval, ease, reps, lapses } = next;

  db.run(
    `UPDATE review_schedules
        SET interval_days = ?, ease = ?, reps = ?, lapses = ?, last_grade = ?,
            due_on = date('now', ?), updated_at = datetime('now')
      WHERE id = ? AND user_id = ?`,
    interval,
    ease,
    reps,
    lapses,
    grade,
    `+${interval} days`,
    scheduleId,
    userId,
  );

  const dueOn =
    db.get<{ d: string }>(`SELECT due_on AS d FROM review_schedules WHERE id = ?`, scheduleId)?.d ?? '';

  return { dueOn, intervalDays: interval, ease };
}
