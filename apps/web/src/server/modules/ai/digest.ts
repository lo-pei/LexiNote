import type { SessionUser } from '@ln/types';
import { getDb } from '../../db';
import { forbidden, notFound } from '../../http';
import { overview } from '../analytics';
import { digestMessages } from './prompts';
import { getProvider, parseJsonLoose } from './provider';

/**
 * 学情诊断摘要（方案 §4.3）。
 *
 * 这是四个功能里合规风险最低的一个：输入只有聚合数字（人数、点击量、命中率），
 * **不含任何学生 id、姓名或学号**——`overview()` 返回的 students 明细根本不进 prompt。
 * 因此它可以作为「人审流程」之外的第一个试点。
 *
 * 缓存按 (course_id, day) 一天一份：同一门课一天内反复点「生成诊断」不重复花模型钱。
 */

export interface DigestPayload {
  summary: string;
  advice: string[];
}

export interface DigestResult {
  /** 模型不可用且无缓存时为 null */
  digest: DigestPayload | null;
  available: boolean;
  cached: boolean;
}

const WINDOW_DAYS = 14;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 权限必须自己判，不能依赖 overview() 顺带做——有两个入口会绕开它：
 * 一是缓存命中直接返回，二是未配置模型时提前返回。
 * 早先的写法就因此让任意登录学生读到了别人班的诊断。
 */
function assertCourseAccess(courseId: string, user: SessionUser): void {
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') throw forbidden('只有教师可以查看学情。');
  const course = getDb().get<{ teacher_id: string }>(`SELECT teacher_id FROM courses WHERE id = ?`, courseId);
  if (!course) throw notFound('课程不存在。');
  if (course.teacher_id !== user.id && user.role !== 'ADMIN') throw forbidden('只能查看自己课程的学情。');
}

function readCache(courseId: string): DigestPayload | null {
  const row = getDb().get<{ body: string }>(
    `SELECT body FROM ai_digests WHERE course_id = ? AND day = ?`,
    courseId,
    today(),
  );
  if (!row) return null;
  return parseJsonLoose<DigestPayload>(row.body);
}

/**
 * 生成或读取今日诊断。
 * 权限沿用 overview()（只能看自己的课），调用方不必再判一次。
 */
export async function generateDigest(courseId: string, user: SessionUser): Promise<DigestResult> {
  assertCourseAccess(courseId, user);

  const cached = readCache(courseId);
  if (cached?.summary) return { digest: cached, available: true, cached: true };

  const provider = getProvider();
  if (!provider) return { digest: null, available: false, cached: false };

  // overview 自带权限与存在性校验，同时保证口径与页面上看到的数字完全一致
  const data = overview(courseId, user);

  const totals = {
    选课人数: data.studentCount,
    课件份数: data.coursewareCount,
    译文查询次数: data.translationChecks,
    '译文命中率(%)': data.translationHitRate,
    累计加词: data.totalWordsAdded,
    未掌握词条: data.unmasteredWords,
    笔记保存: data.students.reduce((sum, s) => sum + s.noteSaves, 0),
    术语点击: data.students.reduce((sum, s) => sum + s.termClicks, 0),
    讨论回帖: data.students.reduce((sum, s) => sum + s.forumReplies, 0),
  };

  const raw = await provider.complete(
    digestMessages({
      courseTitle: data.courseTitle,
      days: WINDOW_DAYS,
      totals,
      topTerms: data.termHeat.slice(0, 6).map((t) => ({ term: t.term, clicks: t.clicks })),
    }),
    { task: 'DIGEST', userId: user.id, refId: courseId, json: true, maxTokens: 600, temperature: 0.3 },
  );
  if (!raw) return { digest: null, available: false, cached: false };

  const parsed = parseJsonLoose<{ summary?: unknown; advice?: unknown }>(raw);
  const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : '';
  const advice = Array.isArray(parsed?.advice)
    ? parsed.advice.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
    : [];

  if (!summary) return { digest: null, available: false, cached: false };

  const payload: DigestPayload = { summary, advice };
  getDb().run(
    `INSERT OR REPLACE INTO ai_digests (id, course_id, day, body, model, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    `dig_${globalThis.crypto.randomUUID().slice(0, 16)}`,
    courseId,
    today(),
    JSON.stringify(payload),
    provider.name,
    new Date().toISOString(),
  );

  return { digest: payload, available: true, cached: false };
}
