'use client';

import { useEffect, useMemo, useState } from 'react';

export interface TocItem {
  id: string;
  title: string;
}

/** 标题滚到吸顶导航下方多少像素时，算「正在读这一节」 */
const OFFSET = 120;

/**
 * 公开文档左侧点状目录。
 * 目录项由页面传入（与服务端渲染的章节 id 一一对应）。
 * 高亮用滚动位置判断而不是 IntersectionObserver：长章节（一屏放不下）
 * 在观察器里会同时命中好几条，取「最后一个越过阈值的标题」更贴近阅读位置。
 */
export function DocToc({ items }: { items: TocItem[] }) {
  const key = useMemo(() => items.map((item) => item.id).join('|'), [items]);
  const [active, setActive] = useState<string>(items[0]?.id ?? '');

  useEffect(() => {
    const nodes = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      let current = nodes[0]?.id ?? '';
      for (const node of nodes) {
        if (node.getBoundingClientRect().top - OFFSET <= 0) current = node.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [key]);

  if (!items.length) return null;

  return (
    <aside className="docpage__toc" aria-label="页内目录">
      <p className="docpage__toc-title">目录</p>
      <ol>
        {items.map((item) => (
          <li key={item.id} className={item.id === active ? 'docpage__toc-item docpage__toc-item--on' : 'docpage__toc-item'}>
            <a href={`#${item.id}`}>{item.title}</a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
