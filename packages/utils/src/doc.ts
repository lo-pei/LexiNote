import type { TiptapDoc, TiptapNode } from '@ln/types';

/** 文档结构工具：纯函数，前后端共用（服务端统计、客户端 TOC 与演示分页）。 */

export function textOf(node: TiptapNode): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(textOf).join('');
}

export interface HeadingEntry {
  level: number;
  text: string;
  /** 第几个标题，与渲染后 h1–h3 的 DOM 顺序一一对应 */
  index: number;
  /** 该标题在正文顶层块里的下标，演示分屏时用它把标题对到某一屏 */
  block: number;
}

export function collectHeadings(doc: TiptapNode | null | undefined): HeadingEntry[] {
  const out: HeadingEntry[] = [];
  const blocks = doc?.content ?? [];
  let ordinal = 0;
  blocks.forEach((node, block) => {
    if (node.type === 'heading' && typeof node.attrs?.level === 'number') {
      const text = textOf(node).replace(/\s+/g, ' ').trim();
      if (text) {
        out.push({ level: node.attrs.level as number, text, index: ordinal, block });
        ordinal += 1;
      }
    }
  });
  return out;
}

export function countTerms(doc: TiptapNode | null | undefined): number {
  let count = 0;
  const walk = (node: TiptapNode) => {
    if (node.type === 'legalTerm') count += 1;
    (node.content ?? []).forEach(walk);
  };
  if (doc) walk(doc);
  return count;
}

export interface PresentationPage {
  index: number;
  title: string;
  doc: TiptapNode;
}

/**
 * 按标题粗略切分（说明书 §5.2 的服务端版）。
 *
 * 注意：演示页已改为在浏览器里按「渲染后的真实高度」切屏
 * （见 apps/web/.../present/present-view.tsx），因为只有拿到实际排版
 * 才能保证一屏之内不出现半句话。本函数保留给需要「按小节拿大纲」的
 * 场景（导出、服务端预览），不要用它做投屏分页。
 */
export function paginateDoc(doc: TiptapNode): PresentationPage[] {
  const content = doc.content ?? [];
  const hasH1 = content.some((n) => n.type === 'heading' && n.attrs?.level === 1);

  if (!hasH1) {
    const pages: PresentationPage[] = [];
    let bucket: TiptapNode[] = [];
    let size = 0;
    let title = '';
    for (const node of content) {
      if (node.type === 'heading' && node.attrs?.level === 2) title = textOf(node).trim();
      bucket.push(node);
      size += textOf(node).length;
      if (size > 380) {
        pages.push({ index: pages.length, title, doc: { type: 'doc', content: bucket } });
        bucket = [];
        size = 0;
      }
    }
    if (bucket.length) pages.push({ index: pages.length, title, doc: { type: 'doc', content: bucket } });
    return pages;
  }

  const pages: PresentationPage[] = [];
  let bucket: TiptapNode[] = [];
  let title = '';

  const flush = () => {
    if (!bucket.length) return;
    pages.push({ index: pages.length, title, doc: { type: 'doc', content: bucket } });
    bucket = [];
  };

  for (const node of content) {
    if (node.type === 'heading' && node.attrs?.level === 1) {
      flush();
      title = textOf(node).trim();
      bucket.push(node);
      continue;
    }
    bucket.push(node);
  }
  flush();
  return pages;
}

/** 演示页标题：去掉 h1 的页面里用二级标题兜底 */
export function pagesWithTitles(doc: TiptapDoc): PresentationPage[] {
  const pages = paginateDoc(doc);
  return pages.map((page, i) => ({
    ...page,
    title:
      page.title ||
      (page.doc.content ?? []).map(textOf).join(' ').replace(/\s+/g, ' ').trim().slice(0, 24) ||
      `第 ${i + 1} 页`,
  }));
}
