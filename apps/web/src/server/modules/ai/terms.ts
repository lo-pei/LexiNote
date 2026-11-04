import type { SessionUser } from '@ln/types';
import { hashSource } from '@ln/utils';
import { getDb } from '../../db';
import { termMessages } from './prompts';
import { getProvider, parseJsonLoose } from './provider';

/**
 * 术语语境释义（方案 §4.2）。
 *
 * 与静态词库的分工：词库回答「这个词一般什么意思」，这里回答「在这句里什么意思」。
 * `consideration` 在合同法里是「对价」、在日常语境是「考虑」，静态词库给不出这个区分。
 *
 * 缓存键是 (term, context_hash)——同一个词在不同句子里可以各生成一份，互不覆盖。
 * 落库一律 AI_DRAFT，教师采纳后才迁入 vocabulary_entries（origin 沿用 GLOSSARY，
 * 不新增取值，避免动 vocabulary_entries 的 CHECK 约束）。
 */

export type TermSuggestionStatus = 'AI_DRAFT' | 'APPROVED' | 'REJECTED' | 'UNAVAILABLE';

export interface TermSuggestionResult {
  id: string | null;
  term: string;
  phonetic: string | null;
  definitionZh: string | null;
  example: string | null;
  legalDomain: string | null;
  status: TermSuggestionStatus;
  cached: boolean;
}

interface Row {
  id: string;
  term: string;
  phonetic: string | null;
  definition_zh: string;
  example: string | null;
  legal_domain: string | null;
  status: string;
}

function readRow(term: string, contextHash: string): Row | undefined {
  return getDb().get<Row>(
    `SELECT id, term, phonetic, definition_zh, example, legal_domain, status
       FROM ai_term_suggestions WHERE term = ? AND context_hash = ?`,
    term,
    contextHash,
  );
}

function toResult(row: Row, cached: boolean): TermSuggestionResult {
  const status: TermSuggestionStatus =
    row.status === 'REJECTED' ? 'REJECTED' : row.status === 'APPROVED' ? 'APPROVED' : 'AI_DRAFT';
  return {
    id: row.id,
    term: row.term,
    phonetic: row.phonetic,
    definitionZh: status === 'REJECTED' ? null : row.definition_zh,
    example: status === 'REJECTED' ? null : row.example,
    legalDomain: status === 'REJECTED' ? null : row.legal_domain,
    status,
    cached,
  };
}

/**
 * 取某个词在某句里的语境释义；未命中且模型可用时生成草稿。
 * 失败返回 UNAVAILABLE，前端保持「词库未收录」原样，不抛异常。
 */
export async function suggestTerm(term: string, sentence: string, user: SessionUser): Promise<TermSuggestionResult> {
  const contextHash = await hashSource(sentence);

  const existing = readRow(term, contextHash);
  if (existing) return toResult(existing, true);

  const provider = getProvider();
  if (!provider) {
    return {
      id: null,
      term,
      phonetic: null,
      definitionZh: null,
      example: null,
      legalDomain: null,
      status: 'UNAVAILABLE',
      cached: false,
    };
  }

  const raw = await provider.complete(termMessages(term, sentence), {
    task: 'TERM_LOOKUP',
    userId: user.id,
    refId: contextHash,
    json: true,
    maxTokens: 500,
    temperature: 0.2,
  });
  if (!raw) {
    return {
      id: null,
      term,
      phonetic: null,
      definitionZh: null,
      example: null,
      legalDomain: null,
      status: 'UNAVAILABLE',
      cached: false,
    };
  }

  const parsed = parseJsonLoose<{
    phonetic?: unknown;
    definition_zh?: unknown;
    example?: unknown;
    legal_domain?: unknown;
  }>(raw);

  const definitionZh = typeof parsed?.definition_zh === 'string' ? parsed.definition_zh.trim() : '';
  if (!definitionZh) {
    return {
      id: null,
      term,
      phonetic: null,
      definitionZh: null,
      example: null,
      legalDomain: null,
      status: 'UNAVAILABLE',
      cached: false,
    };
  }

  const phonetic = typeof parsed?.phonetic === 'string' && parsed.phonetic.trim() ? parsed.phonetic.trim() : null;
  const example = typeof parsed?.example === 'string' && parsed.example.trim() ? parsed.example.trim() : null;
  const legalDomain =
    typeof parsed?.legal_domain === 'string' && parsed.legal_domain.trim() ? parsed.legal_domain.trim() : null;

  getDb().run(
    `INSERT OR IGNORE INTO ai_term_suggestions
       (id, term, context_hash, sentence, phonetic, definition_zh, example, legal_domain, status, model, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AI_DRAFT', ?, ?)`,
    `ats_${globalThis.crypto.randomUUID().slice(0, 16)}`,
    term,
    contextHash,
    sentence,
    phonetic,
    definitionZh,
    example,
    legalDomain,
    provider.name,
    user.id,
  );

  const stored = readRow(term, contextHash);
  if (stored) return toResult(stored, false);
  return {
    id: null,
    term,
    phonetic,
    definitionZh,
    example,
    legalDomain,
    status: 'AI_DRAFT',
    cached: false,
  };
}

/* ── 教师审校 ───────────────────────────────────────────── */

export interface PendingTermSuggestion {
  id: string;
  term: string;
  sentence: string;
  phonetic: string | null;
  definitionZh: string;
  example: string | null;
  legalDomain: string | null;
  model: string | null;
  createdAt: string;
}

export function listPendingTermSuggestions(limit = 40): PendingTermSuggestion[] {
  // 同 listPendingDrafts：spread 成普通对象再交给客户端组件
  return getDb()
    .all<PendingTermSuggestion>(
      `SELECT id, term, sentence, phonetic, definition_zh AS definitionZh, example,
              legal_domain AS legalDomain, model, created_at AS createdAt
         FROM ai_term_suggestions
        WHERE status = 'AI_DRAFT'
        ORDER BY created_at DESC
        LIMIT ?`,
      limit,
    )
    .map((row) => ({ ...row }));
}

export function countPendingTermSuggestions(): number {
  return (
    getDb().get<{ c: number }>(`SELECT count(*) AS c FROM ai_term_suggestions WHERE status = 'AI_DRAFT'`)?.c ?? 0
  );
}

/**
 * 采纳即迁入正式词库：先在 vocabulary_entries 里落地（同词同释义已存在则复用），
 * 再把 entry_id 回填到建议表，留一条「这条例释义从哪来」的痕迹。
 */
export function reviewTermSuggestion(
  id: string,
  action: 'approve' | 'reject',
  reviewer: SessionUser,
  edited?: string,
): { id: string; status: string; entryId: string | null } | null {
  const db = getDb();
  const row = db.get<Row & { definition_zh: string }>(
    `SELECT id, term, phonetic, definition_zh, example, legal_domain, status
       FROM ai_term_suggestions WHERE id = ?`,
    id,
  );
  if (!row) return null;

  if (action === 'reject') {
    db.run(
      `UPDATE ai_term_suggestions SET status = 'REJECTED' WHERE id = ?`,
      id,
    );
    return { id, status: 'REJECTED', entryId: null };
  }

  const definitionZh = edited?.trim() ? edited.trim() : row.definition_zh;
  const examples = row.example ? JSON.stringify([{ sentence: row.example, note: 'AI 生成，教师审校' }]) : null;

  db.run(
    `INSERT OR IGNORE INTO vocabulary_entries
       (id, term, phonetic, definition_zh, definition_en, examples, legal_domain, origin)
     VALUES (?, ?, ?, ?, NULL, ?, ?, 'GLOSSARY')`,
    `voc_${globalThis.crypto.randomUUID().slice(0, 16)}`,
    row.term,
    row.phonetic,
    definitionZh,
    examples,
    row.legal_domain,
  );

  const entry = db.get<{ id: string }>(
    `SELECT id FROM vocabulary_entries WHERE term = ? AND definition_zh = ? LIMIT 1`,
    row.term,
    definitionZh,
  );

  db.run(`UPDATE ai_term_suggestions SET status = 'APPROVED', definition_zh = ?, entry_id = ? WHERE id = ?`,
    definitionZh,
    entry?.id ?? null,
    id,
  );

  return { id, status: 'APPROVED', entryId: entry?.id ?? null };
}
