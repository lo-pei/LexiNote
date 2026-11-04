/** 前后端共用的接口级 DTO（不属于领域实体，故不放进 @ln/types）。 */

/** 译文来源：人工审校通过 / AI 草稿未审 / 无 */
export type SentenceStatus = 'APPROVED' | 'AI_DRAFT' | 'NONE';

export interface SentenceMatch {
  text: string;
  hash: string;
  /** 有任何可用译文（人工或草稿）即为 true；被驳回的句子为 false */
  matched: boolean;
  translation: string | null;
  status: SentenceStatus;
}

/** AI 草稿接口的返回；UNAVAILABLE 表示模型不可用，界面保持原样即可 */
export interface DraftResultDTO {
  translation: string | null;
  status: 'APPROVED' | 'AI_DRAFT' | 'REJECTED' | 'UNAVAILABLE' | 'NONE';
  cached: boolean;
}

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/** 教师端待审译文（与 server/modules/ai/translation 的 PendingDraft 结构一致） */
export interface PendingDraftDTO {
  id: string;
  sourceText: string;
  translation: string;
  model: string | null;
  createdAt: string;
}

/** 学情诊断（与 server/modules/ai/digest 的 DigestPayload 结构一致） */
export interface DigestPayloadDTO {
  summary: string;
  advice: string[];
}

/** 术语语境释义（与 server/modules/ai/terms 的 TermSuggestionResult 结构一致） */
export interface TermSuggestionDTO {
  id: string | null;
  term: string;
  phonetic: string | null;
  definitionZh: string | null;
  example: string | null;
  legalDomain: string | null;
  status: 'AI_DRAFT' | 'APPROVED' | 'REJECTED' | 'UNAVAILABLE';
  cached: boolean;
}

/** 教师端待审术语释义 */
export interface PendingTermDTO {
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
