'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type HelpTab = 'guide' | 'privacy' | 'terms';

const TABS: { key: HelpTab; href: string; label: string }[] = [
  { key: 'guide', href: '/help', label: '使用说明' },
  { key: 'privacy', href: '/help/privacy', label: '隐私政策' },
  { key: 'terms', href: '/help/terms', label: '使用条款' },
];

export interface HelpTocItem {
  id: string;
  title: string;
}

/**
 * 帮助中心的侧边目录。
 *
 * 三份文档共用一条竖排目录：上面是文档本身，下面是当前这份的章节。
 * 目录吸顶跟着滚，章节由 IntersectionObserver 标出当前位置——
 * 使用说明有六章、条款有十几条，只靠正文滚动很难知道读到哪儿。
 */
export function HelpSide({
  active,
  items,
  label = '本页目录',
}: {
  active: HelpTab;
  items?: HelpTocItem[];
  label?: string;
}) {
  const [current, setCurrent] = useState<string>('');
  const ids = items?.map((item) => item.id).join(',') ?? '';

  useEffect(() => {
    if (!ids) return;
    const elements = ids
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: '-12% 0px -72% 0px', threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return (
    <aside className="docside">
      <nav className="docside__docs" aria-label="帮助文档">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`docside__doc${tab.key === active ? ' docside__doc--on' : ''}`}
            aria-current={tab.key === active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {items?.length ? (
        <nav className="docside__toc" aria-label={label}>
          <p className="docside__label">{label}</p>
          <ol>
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={current === item.id ? 'is-on' : undefined}
                  aria-current={current === item.id ? 'true' : undefined}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </aside>
  );
}
