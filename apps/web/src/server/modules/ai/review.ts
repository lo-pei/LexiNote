import type { SessionUser } from '@ln/types';
import { getDb } from '../../db';
import { hintMessages } from './prompts';
import { getProvider, parseJsonLoose } from './provider';

/**
 * 复习提示（方案 §4.4）。
 *
 * 这是四个 AI 功能里唯一「用完即弃」的一个：复习本身不依赖模型，
 * 只有学生主动点「提示」时才花一次调用。题干永远由规则生成，
 * 因为一道挖空题不需要模型，而二十个词逐个生成题干会把首屏拖到十几秒。
 *
 * 提示按词缓存（review_questions, kind='HINT'）：同一个词第二次复习时直接取。
 */

export interface HintResult {
  hint: string | null;
  available: boolean;
}

interface Row {
  item_id: string;
  term: string;
  definition_zh: string;
  source_context: string | null;
}

function readCached(itemId: string): string | null {
  const row = getDb().get<{ payload: string }>(
    `SELECT payload FROM review_questions WHERE item_id = ? AND kind = 'HINT'`,
    itemId,
  );
  if (!row) return null;
  return parseJsonLoose<{ hint?: string }>(row.payload)?.hint ?? null;
}

export async function hintFor(scheduleId: string, user: SessionUser): Promise<HintResult> {
  const row = getDb().get<Row>(
    `SELECT s.item_id, e.term, e.definition_zh, i.source_context
       FROM review_schedules s
       JOIN wordbook_items i ON i.id = s.item_id
       JOIN vocabulary_entries e ON e.id = i.entry_id
      WHERE s.id = ? AND s.user_id = ?`,
    scheduleId,
    user.id,
  );
  if (!row) return { hint: null, available: false };

  const cached = readCached(row.item_id);
  if (cached) return { hint: cached, available: true };

  const provider = getProvider();
  if (!provider) return { hint: null, available: false };

  const raw = await provider.complete(
    hintMessages({ term: row.term, definition: row.definition_zh, context: row.source_context }),
    { task: 'REVIEW_QUESTION', userId: user.id, refId: row.item_id, maxTokens: 120, temperature: 0.4 },
  );
  if (!raw) return { hint: null, available: false };

  // 模型偶尔会把前缀也写进来，这里剥掉，保证界面上只有一行干净的提示
  const hint = raw.replace(/^(提示|Hint)\s*[:：]\s*/i, '').replace(/^["「『]|["」』]$/g, '').trim().slice(0, 60);
  if (!hint) return { hint: null, available: false };

  getDb().run(
    `INSERT OR REPLACE INTO review_questions (id, item_id, kind, payload, model, created_at)
     VALUES (?, ?, 'HINT', ?, ?, ?)`,
    `rq_${globalThis.crypto.randomUUID().slice(0, 16)}`,
    row.item_id,
    JSON.stringify({ hint }),
    provider.name,
    new Date().toISOString(),
  );

  return { hint, available: true };
}
