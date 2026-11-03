'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { LawLibrary } from '@ln/types';

/**
 * 英文法律专题目录。
 *
 * 一百五十余篇、七类，全展开太长也全折叠太闷，折中做法是：默认全展开看得到全貌，
 * 每条分类可单独收起；检索框按标题过滤，命中时自动展开命中的分类。
 * 篇目只列元信息，正文进阅读页——列表一次带全集，不逐类发请求。
 */
export function LawCatalog({ library }: { library: LawLibrary }) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const raw = query.trim().toLowerCase();

  const visible = useMemo(() => {
    if (!raw) return library.categories;
    return library.categories
      .map((cat) => ({
        ...cat,
        entries: cat.entries.filter((entry) => entry.title.toLowerCase().includes(raw)),
      }))
      .filter((cat) => cat.entries.length > 0);
  }, [library.categories, raw]);

  const toggle = (code: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <section className="lawc" aria-label="英文法律目录">
      <div className="lawc__bar">
        <input
          className="ln-input lawc__search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="检索法律名称，如 Civil Code、Labor Contract、Anti-Monopoly"
          aria-label="按法律名称检索"
          spellCheck={false}
        />
        <span className="lawc__hint">
          {raw ? `${visible.reduce((n, cat) => n + cat.entries.length, 0)} / ${library.totalDocs} 篇` : `${library.totalDocs} 篇 · ${library.totalWords.toLocaleString('zh-CN')} 词`}
        </span>
        {raw ? (
          <button type="button" className="ln-btn ln-btn--quiet ln-btn--sm" onClick={() => setQuery('')}>
            清除
          </button>
        ) : null}
      </div>

      {visible.length ? (
        visible.map((cat) => {
          // 检索时强制展开，避免「有命中但被收起」以为没搜到
          const open = Boolean(raw) || !collapsed.has(cat.code);
          return (
            <section className="lawc__cat" id={`c-${cat.code}`} key={cat.code}>
              <header className="lawc__cathead">
                <span className="lawc__code" aria-hidden="true">
                  {cat.code}
                </span>
                <div className="lawc__catmain">
                  <h2 className="lawc__name">
                    {cat.titleZh}
                    <span className="lawc__en">{cat.title}</span>
                  </h2>
                  <p className="lawc__note">{cat.note}</p>
                </div>
                <div className="lawc__catmeta">
                  <span className="lawc__count">
                    {cat.docCount} 篇 · {cat.wordCount.toLocaleString('zh-CN')} 词
                  </span>
                  <button
                    type="button"
                    className="ln-btn ln-btn--quiet ln-btn--sm"
                    onClick={() => toggle(cat.code)}
                    aria-expanded={open}
                  >
                    {open ? '收起' : '展开'}
                  </button>
                </div>
              </header>

              {open ? (
                <ol className="rows lawc__list">
                  {cat.entries.map((entry, index) => (
                    <li className="row lawc__item" key={entry.id}>
                      <span className="row__num">{String(index + 1).padStart(2, '0')}</span>
                      <div className="row__main">
                        <div className="row__title">
                          <Link href={`/readings/laws/${entry.slug}`}>{entry.title}</Link>
                        </div>
                        <div className="row__meta">
                          <span>{entry.publishedOn ?? '未标注日期'}</span>
                          <span>{entry.words.toLocaleString('zh-CN')} 词</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          );
        })
      ) : (
        <p className="lawc__empty">没有匹配「{query.trim()}」的法律。换一个关键词，或只输英文名称里的核心词试试。</p>
      )}
    </section>
  );
}
