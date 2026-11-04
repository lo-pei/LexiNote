'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { LawLibrary } from '@ln/types';

/**
 * 英文法律专题的树状目录。
 *
 * 原来是一串可折叠的平铺分区，七类之间看不出从属关系，像七个独立的清单。
 * 改成树：根节点是「中国现行法律」，七个部门法是第一层分支，各部门法下的
 * 单行法挂在自己那根树枝上，层级与连线都在，法律体系的结构一眼能顺下来。
 *
 * 默认只展开根与分支（先看骨架），点开某个部门法才铺开它下面的篇目；
 * 检索时强制展开命中的分支，避免「搜到了但被收起」。
 */
export function LawTree({ library }: { library: LawLibrary }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string[]>([]);

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

  const isOpen = (code: string) => Boolean(raw) || open.includes(code);

  const toggle = (code: string) => {
    setOpen((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));
  };

  const allOpen = library.categories.every((cat) => open.includes(cat.code));

  const hitCount = visible.reduce((sum, cat) => sum + cat.entries.length, 0);

  return (
    <section className="ltree" aria-label="英文法律目录">
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
          {raw
            ? `${hitCount} / ${library.totalDocs} 篇命中`
            : `${library.totalDocs} 篇 · ${library.totalWords.toLocaleString('zh-CN')} 词`}
        </span>
        {raw ? (
          <button type="button" className="ln-btn ln-btn--quiet ln-btn--sm" onClick={() => setQuery('')}>
            清除
          </button>
        ) : (
          <button
            type="button"
            className="ln-btn ln-btn--quiet ln-btn--sm"
            onClick={() => setOpen(allOpen ? [] : library.categories.map((cat) => cat.code))}
          >
            {allOpen ? '全部收起' : '全部展开'}
          </button>
        )}
      </div>

      {visible.length ? (
        <div className="ltree__body">
          <div className="ltree__root">
            <span className="ltree__rootmark" aria-hidden="true">
              法
            </span>
            <span className="ltree__roottext">
              <b>中国现行法律 · 英文官方译本</b>
              <span>
                {library.categories.length} 个部门法 · {library.totalDocs} 篇 ·{' '}
                {library.totalWords.toLocaleString('zh-CN')} 词
              </span>
            </span>
          </div>

          <ul className="ltree__cats">
            {visible.map((cat) => {
              const expanded = isOpen(cat.code);
              return (
                <li
                  className={`ltree__cat${expanded ? ' is-open' : ''}`}
                  id={`c-${cat.code}`}
                  key={cat.code}
                >
                  <button
                    type="button"
                    className="ltree__node"
                    onClick={() => toggle(cat.code)}
                    aria-expanded={expanded}
                  >
                    <span className="ltree__idx" aria-hidden="true">
                      {cat.code}
                    </span>
                    <span className="ltree__label">
                      <span className="ltree__zh">{cat.titleZh}</span>
                      <span className="ltree__en">{cat.title}</span>
                    </span>
                    <span className="ltree__meta">
                      {cat.docCount} 篇 · {cat.wordCount.toLocaleString('zh-CN')} 词
                    </span>
                    <span className="ltree__chev" aria-hidden="true" />
                  </button>

                  {expanded ? null : <p className="ltree__note">{cat.note}</p>}

                  {expanded ? (
                    <ul className="ltree__leaves">
                      {cat.entries.map((entry) => (
                        <li className="ltree__leaf" key={entry.id}>
                          <Link href={`/readings/laws/${entry.slug}`}>{entry.title}</Link>
                          <span className="ltree__leafmeta">
                            {entry.publishedOn ?? '未标注日期'} · {entry.words.toLocaleString('zh-CN')} 词
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="lawc__empty">
          没有匹配「{query.trim()}」的法律。换一个关键词，或只输英文名称里的核心词试试。
        </p>
      )}
    </section>
  );
}
