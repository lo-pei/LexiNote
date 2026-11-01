import type { SessionUser } from '@ln/types';
import { getDb, parseJson } from '../db';
import { recordEvent } from './events';

export interface MatchResult {
  matched: boolean;
  sourceText: string | null;
  translation: string | null;
  termOverrides: Record<string, string> | null;
}

/**
 * 预置模板匹配（说明书 §5.6）。服务端只做哈希查表，不发起任何外部请求。
 * 未命中返回 matched:false，由浮层显示「暂无预置译文」。
 */
export function matchTranslation(hash: string, user: SessionUser, courseId?: string): MatchResult {
  if (!/^[a-f0-9]{64}$/i.test(hash)) {
    return { matched: false, sourceText: null, translation: null, termOverrides: null };
  }
  const row = getDb().get<{
    source_text: string;
    translation: string;
    term_overrides: string | null;
  }>(`SELECT source_text, translation, term_overrides FROM translation_templates WHERE source_hash = ?`, hash);

  recordEvent(user.id, 'TRANSLATION_HIT', { matched: Boolean(row), ...(courseId ? { courseId } : {}) });

  if (!row) return { matched: false, sourceText: null, translation: null, termOverrides: null };
  return {
    matched: true,
    sourceText: row.source_text,
    translation: row.translation,
    termOverrides: parseJson<Record<string, string> | null>(row.term_overrides, null),
  };
}
