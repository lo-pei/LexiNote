import type { EventType } from '@ln/types';
import { getDb } from '../db';

const COLUMN: Partial<Record<EventType, string>> = {
  NOTE_SAVE: 'note_saves',
  TERM_CLICK: 'term_clicks',
  WORD_ADDED: 'words_added',
  TRANSLATION_HIT: 'translation_checks',
};

/**
 * 学习事件落库，并就地增量维护 analytics_daily。
 * 生产环境由定时聚合任务从 learning_events 全量重算；
 * 此处增量写入保证演示环境下仪表盘即时可见。
 */
export function recordEvent(userId: string, eventType: EventType, payload: Record<string, unknown>): void {
  const db = getDb();
  const iso = new Date().toISOString();
  const day = iso.slice(0, 10);
  db.run(
    `INSERT INTO learning_events (id, user_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)`,
    `evt_${globalThis.crypto.randomUUID().slice(0, 16)}`,
    userId,
    eventType,
    JSON.stringify(payload),
    iso,
  );

  const courseId = typeof payload.courseId === 'string' ? payload.courseId : null;
  if (!courseId) return;

  const column = COLUMN[eventType];
  if (!column) return;

  const translationHit =
    eventType === 'TRANSLATION_HIT' && payload.matched === true ? 1 : 0;

  db.run(
    `INSERT INTO analytics_daily
       (id, day, course_id, student_id, note_saves, term_clicks, words_added, forum_replies, translation_checks, translation_hits)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
     ON CONFLICT (day, course_id, student_id) DO UPDATE SET
       ${column} = ${column} + excluded.${column},
       translation_checks = translation_checks + excluded.translation_checks,
       translation_hits = translation_hits + excluded.translation_hits`,
    `ad_${globalThis.crypto.randomUUID().slice(0, 16)}`,
    day,
    courseId,
    userId,
    eventType === 'NOTE_SAVE' ? 1 : 0,
    eventType === 'TERM_CLICK' ? 1 : 0,
    eventType === 'WORD_ADDED' ? 1 : 0,
    eventType === 'TRANSLATION_HIT' ? 1 : 0,
    translationHit,
  );
}
