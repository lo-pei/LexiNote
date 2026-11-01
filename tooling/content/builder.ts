import type { FlowchartData, TiptapDoc, TiptapNode } from '@ln/types';

export function slugTerm(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export const t = (value: string): TiptapNode => ({ type: 'text', text: value });

export function term(label: string, phonetic: string, definition: string): TiptapNode {
  return {
    type: 'legalTerm',
    attrs: { termId: slugTerm(label), phonetic, definition },
    content: [{ type: 'text', text: label }],
  };
}

export const bold = (value: string): TiptapNode => ({
  type: 'text',
  text: value,
  marks: [{ type: 'bold' }],
});

export const em = (value: string): TiptapNode => ({
  type: 'text',
  text: value,
  marks: [{ type: 'italic' }],
});

type Inline = string | TiptapNode;

const inline = (value: Inline): TiptapNode => (typeof value === 'string' ? t(value) : value);

export const p = (...content: Inline[]): TiptapNode => ({
  type: 'paragraph',
  content: content.map(inline),
});

export const h = (level: 1 | 2 | 3, value: string): TiptapNode => ({
  type: 'heading',
  attrs: { level },
  content: [t(value)],
});

export const quote = (...content: Inline[]): TiptapNode => ({
  type: 'blockquote',
  content: [p(...content)],
});

export const callout = (variant: 'info' | 'warn' | 'key', ...blocks: TiptapNode[]): TiptapNode => ({
  type: 'callout',
  attrs: { variant },
  content: blocks,
});

export const bullets = (items: (string | Inline[])[]): TiptapNode => ({
  type: 'bulletList',
  content: items.map((item) => ({
    type: 'listItem',
    content: [p(...(Array.isArray(item) ? item : [item]))],
  })),
});

export const flowchart = (data: FlowchartData): TiptapNode => ({
  type: 'flowchart',
  attrs: { data, editable: false },
});

export const doc = (...content: TiptapNode[]): TiptapDoc => ({ type: 'doc', content });

/** 把整段英文按句号切开，供 seed 侧核对译文覆盖情况 */
export function plainOf(node: TiptapNode): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(plainOf).join('');
}
