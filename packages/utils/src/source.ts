import type { SourceType } from '@ln/types';

/**
 * 来源追溯的唯一写入点 —— 说明书 §12。
 * 任何模块需要记录「这个词/这句话来自哪里」都必须调用 buildSource()，
 * 禁止手拼 sourceType / sourceDocId / sourceContext。
 */

export interface SourceInput {
  type: SourceType;
  docId?: string | null;
  docTitle?: string | null;
  context?: string | null;
  /** 论坛来源时的主题标题 */
  topicTitle?: string | null;
}

export interface SourceRef {
  sourceType: SourceType;
  sourceDocId: string | null;
  sourceContext: string | null;
  /** 派生字段，仅用于展示，不入库 */
  label: string;
  href: string | null;
}

export function buildSource(input: SourceInput): SourceRef {
  const context = input.context ? input.context.replace(/\s+/g, ' ').trim().slice(0, 400) : null;
  const docId = input.docId ?? null;

  let label: string;
  switch (input.type) {
    case 'COURSE':
      label = input.docTitle ? `课程课件 · ${input.docTitle}` : '课程课件';
      break;
    case 'DOCUMENT':
      label = input.docTitle ? `笔记 · ${input.docTitle}` : '个人笔记';
      break;
    case 'FORUM':
      label = input.topicTitle ? `课堂讨论 · ${input.topicTitle}` : '课堂讨论';
      break;
    case 'MANUAL':
    default:
      label = '手动添加';
      break;
  }

  const href = docId && input.type !== 'MANUAL' ? `/docs/${docId}` : null;

  return {
    sourceType: input.type,
    sourceDocId: docId,
    sourceContext: context,
    label,
    href,
  };
}

export function sourceLabel(type: SourceType, docTitle?: string | null): string {
  return buildSource({ type, docTitle }).label;
}
