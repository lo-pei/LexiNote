/** 前后端共用的接口级 DTO（不属于领域实体，故不放进 @ln/types）。 */

export interface SentenceMatch {
  text: string;
  hash: string;
  matched: boolean;
  translation: string | null;
}

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
