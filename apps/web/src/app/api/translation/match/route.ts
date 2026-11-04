import { z } from 'zod';
import { hashSource, normalizeSource } from '@ln/utils';
import { guard, parseBody, requireUser } from '@/server/http';
import { getDb } from '@/server/db';
import { recordEvent } from '@/server/modules/events';
import type { SentenceMatch, SentenceStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const schema = z.object({
  texts: z.array(z.string().min(1).max(600)).min(1).max(24),
  courseId: z.string().trim().min(1).optional(),
});

/**
 * 句子级译文查表（说明书 §5.6）。
 * 哈希在服务端计算，浏览器只提交原句——避免两端口径不一致导致的静默 miss。
 *
 * 本轮新增：返回 `status` 区分「人工审校通过」与「AI 草稿未审」，
 * 浮层据此把草稿显示成虚线 + 徽标。被教师驳回的句子按未命中处理。
 */
export async function POST(request: Request) {
  return guard(async (): Promise<SentenceMatch[]> => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const { texts, courseId } = parseBody(schema, body);

    const db = getDb();
    const out: SentenceMatch[] = [];
    let approved = 0;
    let drafts = 0;

    for (const text of texts) {
      const hash = await hashSource(text);
      const row = db.get<{ translation: string; status: string }>(
        `SELECT translation, status FROM translation_templates WHERE source_hash = ?`,
        hash,
      );

      if (!row || row.status === 'REJECTED') {
        out.push({ text: normalizeSource(text), hash, matched: false, translation: null, status: 'NONE' });
        continue;
      }

      const status: SentenceStatus = row.status === 'APPROVED' ? 'APPROVED' : 'AI_DRAFT';
      if (status === 'APPROVED') approved += 1;
      else drafts += 1;

      out.push({ text: normalizeSource(text), hash, matched: true, translation: row.translation, status });
    }

    // 命中率只统计人工审校通过的译文——AI 草稿单列，
    // 否则「译文覆盖率」这个指标会因为草稿而被高估。
    recordEvent(user.id, 'TRANSLATION_HIT', {
      matched: approved > 0,
      hits: approved,
      drafts,
      total: texts.length,
      ...(courseId ? { courseId } : {}),
    });

    return out;
  });
}
