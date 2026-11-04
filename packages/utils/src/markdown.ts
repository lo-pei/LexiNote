import type { TiptapDoc, TiptapNode } from '@ln/types';

/**
 * Markdown 子集 → Tiptap 文档。
 *
 * 用途单一：教师上传 .md / .txt 课件时把正文转成编辑器能吃的结构。
 * 编辑器（StarterKit 配置）只开了 heading 1–3，关掉了 codeBlock 与 horizontalRule，
 * 所以这里不产出这两种节点——围栏代码块与分隔线都降级成普通段落，
 * 宁可丢一点格式，也不要塞进编辑器不认识的节点导致整篇打不开。
 *
 * 支持：ATX 标题（#–###，四级及以下压到三级）、段落、无序/有序列表、
 * 引用块、行内 **粗体** / *斜体* / `等宽` / ~~删除线~~、链接（只留文字）。
 */

const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;
const BULLET = /^[-*+]\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;
const RULE = /^([-*_])\s*(?:\1\s*){2,}$/;
const FENCE = /^```/;
const QUOTE = /^>\s?(.*)$/;

/** 行内标记：先切代码与删除线，再处理粗斜体，避免 ** 与 * 互相吃掉 */
function inline(text: string): TiptapNode[] {
  const out: TiptapNode[] = [];
  const push = (value: string, marks?: { type: string }[]) => {
    if (!value) return;
    out.push(marks?.length ? { type: 'text', text: value, marks } : { type: 'text', text: value });
  };

  // 一次扫描，遇到可识别的记号就断开
  let rest = text;
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(~~[^~]+~~)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^)]*\))/;
  while (rest.length) {
    const hit = pattern.exec(rest);
    if (!hit || hit.index > 0) {
      const plain = hit ? rest.slice(0, hit.index) : rest;
      push(plain);
      if (!hit) break;
      rest = rest.slice(hit.index);
      continue;
    }
    const token = hit[0];
    rest = rest.slice(token.length);
    if (token.startsWith('`')) push(token.slice(1, -1), [{ type: 'code' }]);
    else if (token.startsWith('**') || token.startsWith('__')) push(token.slice(2, -2), [{ type: 'bold' }]);
    else if (token.startsWith('~~')) push(token.slice(2, -2), [{ type: 'strike' }]);
    else if (token.startsWith('*') || token.startsWith('_')) push(token.slice(1, -1), [{ type: 'italic' }]);
    else {
      // [文字](链接)：编辑器没有链接扩展，只保留文字
      const label = /^\[([^\]]+)\]/.exec(token);
      if (label?.[1]) push(label[1]);
    }
  }
  return out;
}

function paragraph(text: string): TiptapNode {
  const content = inline(text);
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
}

function heading(level: number, text: string): TiptapNode {
  const safe = Math.min(3, Math.max(1, level));
  const content = inline(text);
  return content.length
    ? { type: 'heading', attrs: { level: safe }, content }
    : { type: 'heading', attrs: { level: safe } };
}

export function markdownToDoc(raw: string): TiptapDoc {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const nodes: TiptapNode[] = [];

  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    nodes.push(paragraph(para.join(' ')));
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      i += 1;
      continue;
    }

    // 围栏代码块：整块原样收进一段，围栏行本身丢掉
    if (FENCE.test(trimmed)) {
      flushPara();
      i += 1;
      const block: string[] = [];
      while (i < lines.length && !FENCE.test((lines[i] ?? '').trim())) {
        block.push(lines[i] ?? '');
        i += 1;
      }
      i += 1;
      const text = block.join(' ').replace(/\s+/g, ' ').trim();
      if (text) nodes.push(paragraph(text));
      continue;
    }

    const h = HEADING.exec(trimmed);
    if (h) {
      flushPara();
      nodes.push(heading(h[1]?.length ?? 1, h[2] ?? ''));
      i += 1;
      continue;
    }

    if (RULE.test(trimmed)) {
      flushPara();
      i += 1;
      continue;
    }

    // 引用块：连续的 > 行合成一个 blockquote，内部按空行分段
    if (QUOTE.test(trimmed)) {
      flushPara();
      const quoted: TiptapNode[] = [];
      let buf: string[] = [];
      const flushQuote = () => {
        if (!buf.length) return;
        quoted.push(paragraph(buf.join(' ')));
        buf = [];
      };
      while (i < lines.length && QUOTE.test((lines[i] ?? '').trim())) {
        const inner = (QUOTE.exec((lines[i] ?? '').trim())?.[1] ?? '').trim();
        if (!inner) flushQuote();
        else buf.push(inner);
        i += 1;
      }
      flushQuote();
      if (quoted.length) nodes.push({ type: 'blockquote', content: quoted });
      continue;
    }

    if (BULLET.test(trimmed)) {
      flushPara();
      const items: TiptapNode[] = [];
      while (i < lines.length && BULLET.test((lines[i] ?? '').trim())) {
        const body = BULLET.exec((lines[i] ?? '').trim())?.[1] ?? '';
        items.push({ type: 'listItem', content: [paragraph(body)] });
        i += 1;
      }
      nodes.push({ type: 'bulletList', content: items });
      continue;
    }

    if (ORDERED.test(trimmed)) {
      flushPara();
      const items: TiptapNode[] = [];
      while (i < lines.length && ORDERED.test((lines[i] ?? '').trim())) {
        const body = ORDERED.exec((lines[i] ?? '').trim())?.[1] ?? '';
        items.push({ type: 'listItem', content: [paragraph(body)] });
        i += 1;
      }
      nodes.push({ type: 'orderedList', attrs: { start: 1 }, content: items });
      continue;
    }

    para.push(trimmed);
    i += 1;
  }

  flushPara();
  return { type: 'doc', content: nodes.length ? nodes : [{ type: 'paragraph' }] };
}
