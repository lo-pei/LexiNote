import type { SessionUser } from '@ln/types';
import { hashSource } from '@ln/utils';
import { getDb } from '../../db';
import { translationMessages } from './prompts';
import { getProvider, parseJsonLoose } from './provider';

/**
 * 句级译文 AI 草稿（方案 §4.1）。
 *
 * 三条规则：
 * 1. **点了才生成**，不做后台预生成——2.4 万句全量预生成既费钱又可能白费，
 *    实际调用量应收敛到「学生真正读到的句子」；
 * 2. 生成结果直接落 `translation_templates`，同句第二次零成本（`source_hash` 已有唯一约束）；
 * 3. 落库一律 `status='AI_DRAFT'`，必须经教师审校才转 `APPROVED`，视觉上也要能区分。
 */

export type DraftStatus = 'APPROVED' | 'AI_DRAFT' | 'REJECTED' | 'UNAVAILABLE' | 'NONE';

export interface DraftResult {
  translation: string | null;
  status: DraftStatus;
  /** true 表示命中已有记录，没有产生模型调用 */
  cached: boolean;
}

interface TemplateRow {
  translation: string;
  status: string;
  source: string;
}

function readRow(hash: string): TemplateRow | undefined {
  return getDb().get<TemplateRow>(
    `SELECT translation, status, source FROM translation_templates WHERE source_hash = ?`,
    hash,
  );
}

function toResult(row: TemplateRow, cached: boolean): DraftResult {
  if (row.status === 'REJECTED') return { translation: null, status: 'REJECTED', cached };
  return {
    translation: row.translation,
    status: row.status === 'APPROVED' ? 'APPROVED' : 'AI_DRAFT',
    cached,
  };
}

/**
 * 取某句的译文；未命中且 AI 可用时生成草稿并入库。
 * 任何失败都返回 `UNAVAILABLE`，由前端回落到「暂无预置译文」，不抛异常。
 */
export async function draftTranslation(text: string, user: SessionUser): Promise<DraftResult> {
  const hash = await hashSource(text);

  const existing = readRow(hash);
  if (existing) return toResult(existing, true);

  const provider = getProvider();
  if (!provider) return { translation: null, status: 'UNAVAILABLE', cached: false };

  const raw = await provider.complete(translationMessages(text), {
    task: 'TRANSLATION_DRAFT',
    userId: user.id,
    refId: hash,
    json: true,
    maxTokens: 800,
    temperature: 0.2,
  });
  if (!raw) return { translation: null, status: 'UNAVAILABLE', cached: false };

  const parsed = parseJsonLoose<{ translation?: unknown }>(raw);
  const translation =
    typeof parsed?.translation === 'string'
      ? parsed.translation.trim()
      : // 模型没按 JSON 返回时，只要是一段干净文本就收下，不必因为格式问题丢掉译文
        raw.includes('{')
        ? ''
        : raw.trim();

  if (!translation) return { translation: null, status: 'UNAVAILABLE', cached: false };

  // 并发下同句可能被两个学生同时触发：OR IGNORE 让先到者胜，再重查一次拿最终状态
  getDb().run(
    `INSERT OR IGNORE INTO translation_templates
       (id, source_hash, source_text, translation, lang_pair, term_overrides, created_by, source, status, model)
     VALUES (?, ?, ?, ?, 'en-zh', NULL, ?, 'AI', 'AI_DRAFT', ?)`,
    `tt_${globalThis.crypto.randomUUID().slice(0, 16)}`,
    hash,
    text,
    translation,
    user.id,
    provider.name,
  );

  const stored = readRow(hash);
  if (stored) return toResult(stored, false);
  return { translation, status: 'AI_DRAFT', cached: false };
}

/* ── 教师审校 ───────────────────────────────────────────── */

export interface PendingDraft {
  id: string;
  sourceText: string;
  translation: string;
  model: string | null;
  createdAt: string;
}

export function listPendingDrafts(limit = 50): PendingDraft[] {
  // 必须 spread 成普通对象：node:sqlite 返回的行是 null-prototype，
  // 直接传给客户端组件会触发「Only plain objects can be passed」。
  return getDb()
    .all<PendingDraft>(
      `SELECT id, source_text AS sourceText, translation, model, created_at AS createdAt
         FROM translation_templates
        WHERE status = 'AI_DRAFT'
        ORDER BY created_at DESC
        LIMIT ?`,
      limit,
    )
    .map((row) => ({ ...row }));
}

export function countPendingDrafts(): number {
  const row = getDb().get<{ c: number }>(
    `SELECT count(*) AS c FROM translation_templates WHERE status = 'AI_DRAFT'`,
  );
  return row?.c ?? 0;
}

/**
 * 审核一条草稿。approve 时允许教师直接改写译文（AI 草稿最常见的用法就是改两个词）。
 * 找不到记录时返回 null，由路由层转 404。
 */
export function reviewDraft(
  id: string,
  action: 'approve' | 'reject',
  reviewer: SessionUser,
  edited?: string,
): { id: string; status: string } | null {
  const db = getDb();
  const row = db.get<{ translation: string }>(`SELECT translation FROM translation_templates WHERE id = ?`, id);
  if (!row) return null;

  const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
  const translation = edited?.trim() ? edited.trim() : row.translation;

  db.run(
    `UPDATE translation_templates
        SET status = ?, translation = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ?`,
    status,
    translation,
    reviewer.id,
    new Date().toISOString(),
    id,
  );
  return { id, status };
}
