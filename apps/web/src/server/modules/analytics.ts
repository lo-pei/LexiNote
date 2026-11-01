import type { AnalyticsOverview, SessionUser, StudentMetric, TermHeat } from '@ln/types';
import { getDb } from '../db';
import { forbidden, notFound } from '../http';

/**
 * 学情概览（说明书 §5.10）。
 * 只读聚合表 analytics_daily 与按课程预聚合的术语热度，不扫原始事件表。
 */
export function overview(courseId: string, user: SessionUser): AnalyticsOverview {
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') throw forbidden('只有教师可以查看学情。');
  const db = getDb();

  const course = db.get<{ id: string; title: string; teacher_id: string }>(
    `SELECT id, title, teacher_id FROM courses WHERE id = ?`,
    courseId,
  );
  if (!course) throw notFound('课程不存在。');
  if (course.teacher_id !== user.id && user.role !== 'ADMIN') throw forbidden('只能查看自己课程的学情。');

  const students = db.all<{
    student_id: string;
    name: string;
    login_no: string;
    note_saves: number;
    term_clicks: number;
    words_added: number;
    forum_replies: number;
    checks: number;
    hits: number;
  }>(
    // 学号升序：教师按名册逐行核对，比按活跃度排更自然，也不涉及个人行为画像
    `SELECT e.student_id, u.name, u.login_no,
       COALESCE(SUM(a.note_saves), 0) AS note_saves,
       COALESCE(SUM(a.term_clicks), 0) AS term_clicks,
       COALESCE(SUM(a.words_added), 0) AS words_added,
       COALESCE(SUM(a.forum_replies), 0) AS forum_replies,
       COALESCE(SUM(a.translation_checks), 0) AS checks,
       COALESCE(SUM(a.translation_hits), 0) AS hits
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     LEFT JOIN analytics_daily a ON a.student_id = e.student_id AND a.course_id = e.course_id
     WHERE e.course_id = ?
     GROUP BY e.student_id
     ORDER BY u.login_no ASC`,
    courseId,
  );

  const metrics: StudentMetric[] = students.map((s) => ({
    studentId: s.student_id,
    name: s.name,
    studentNo: s.login_no,
    noteSaves: s.note_saves,
    termClicks: s.term_clicks,
    wordsAdded: s.words_added,
    forumReplies: s.forum_replies,
    translationHitRate: s.checks ? Math.round((s.hits / s.checks) * 100) : 0,
  }));

  const totalChecks = students.reduce((sum, s) => sum + s.checks, 0);
  const totalHits = students.reduce((sum, s) => sum + s.hits, 0);

  const termRows = db.all<{ term: string; clicks: number; added: number }>(
    `SELECT json_extract(payload, '$.term') AS term,
       SUM(CASE WHEN event_type = 'TERM_CLICK' THEN 1 ELSE 0 END) AS clicks,
       SUM(CASE WHEN event_type = 'WORD_ADDED' THEN 1 ELSE 0 END) AS added
     FROM learning_events
     WHERE json_extract(payload, '$.courseId') = ?
       AND json_extract(payload, '$.term') IS NOT NULL
     GROUP BY term
     ORDER BY clicks DESC
     LIMIT 8`,
    courseId,
  );

  const termHeat: TermHeat[] = termRows.map((r) => {
    const entry = db.get<{ definition_zh: string }>(
      `SELECT definition_zh FROM vocabulary_entries WHERE term = ? LIMIT 1`,
      r.term,
    );
    return {
      term: r.term,
      definition: entry?.definition_zh ?? '—',
      clicks: r.clicks,
      wordsAdded: r.added,
    };
  });

  const weeklyRows = db.all<{ week: string; note_saves: number; term_clicks: number }>(
    `SELECT strftime('%Y-%W', day) AS week,
       SUM(note_saves) AS note_saves,
       SUM(term_clicks) AS term_clicks
     FROM analytics_daily WHERE course_id = ?
     GROUP BY week ORDER BY week DESC LIMIT 6`,
    courseId,
  );

  const coursewareCount =
    db.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM documents WHERE course_id = ? AND kind = 'COURSEWARE' AND deleted_at IS NULL`,
      courseId,
    )?.n ?? 0;

  const unmastered =
    db.get<{ n: number }>(
      // 只统计学生自己收录的词；内置术语表两千余条，混进来会把指标压成常数
      `SELECT COUNT(*) AS n FROM wordbook_items i
       JOIN wordbooks w ON w.id = i.wordbook_id AND w.kind = 'CUSTOM'
       JOIN enrollments e ON e.student_id = i.user_id AND e.course_id = ?
       WHERE i.mastery_level < 2`,
      courseId,
    )?.n ?? 0;

  return {
    courseId,
    courseTitle: course.title,
    studentCount: students.length,
    coursewareCount,
    translationHitRate: totalChecks ? Math.round((totalHits / totalChecks) * 100) : 0,
    translationChecks: totalChecks,
    totalWordsAdded: students.reduce((sum, s) => sum + s.words_added, 0),
    unmasteredWords: unmastered,
    students: metrics,
    termHeat,
    weekly: weeklyRows
      .reverse()
      .map((w) => ({ week: w.week, noteSaves: w.note_saves, termClicks: w.term_clicks })),
  };
}

/** 教师可查看的课程列表（用于学情页的课程切换） */
export interface TeachingCourseOption {
  id: string;
  title: string;
  /** 教学班名，用于按钮上区分两个平行班 */
  className: string | null;
  /** 上课时间，来自班级说明 */
  classDescription: string | null;
  studentCount: number;
}

export function teacherCourses(user: SessionUser): TeachingCourseOption[] {
  return getDb().all<TeachingCourseOption>(
    `SELECT c.id, c.title,
       cls.name AS className,
       cls.description AS classDescription,
       (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS studentCount
     FROM courses c
     LEFT JOIN classes cls ON cls.id = c.class_id
     WHERE c.teacher_id = ?
     ORDER BY cls.name ASC, c.created_at ASC`,
    user.id,
  );
}
