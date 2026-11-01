import { z } from 'zod';
import { hashSource, normalizeSource } from '@ln/utils';
import { guard, parseBody, requireUser } from '@/server/http';
import { getDb } from '@/server/db';
import { recordEvent } from '@/server/modules/events';
import type { SentenceMatch } from '@/lib/types';

export const dynamic = 'force-dynamic';

const schema = z.object({
  texts: z.array(z.string().min(1).max(600)).min(1).max(24),
  courseId: z.string().trim().min(1).optional(),
});

/**
 * 句子级译文查表（说明书 §5.6）。
 * 哈希在服务端计算，浏览器只提交原句——避免两端口径不一致导致的静默 miss。
 */
export async function POST(request: Request) {
  return guard(async (): Promise<SentenceMatch[]> => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const { texts, courseId } = parseBody(schema, body);

    const db = getDb();
    const out: SentenceMatch[] = [];
    let hits = 0;

    for (const text of texts) {
      const hash = await hashSource(text);
      const row = db.get<{ translation: string }>(
        `SELECT translation FROM translation_templates WHERE source_hash = ?`,
        hash,
      );
      if (row) hits += 1;
      out.push({ text: normalizeSource(text), hash, matched: Boolean(row), translation: row?.translation ?? null });
    }

    recordEvent(user.id, 'TRANSLATION_HIT', {
      matched: hits > 0,
      hits,
      total: texts.length,
      ...(courseId ? { courseId } : {}),
    });

    return out;
  });
}
