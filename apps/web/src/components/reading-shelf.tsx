'use client';

import { useMemo, useState } from 'react';
import type { ReadingGroupKey } from '@/server/content/readings';

export interface ShelfBook {
  id: string;
  group: ReadingGroupKey;
  title: string;
  author: string;
  publisher: string;
  year: string;
  isbn: string;
  note: string;
  tags: string[];
}

export interface ShelfGroup {
  key: ReadingGroupKey;
  title: string;
  lead: string;
}

/** 去掉连字符与空格，方便按 ISBN 检索 */
const digitsOf = (value: string): string => value.replace(/[^0-9xX]/g, '').toLowerCase();

/**
 * 推荐阅读：书单式列表，不用卡片。
 *
 * 卡片把每本书压成等高的方块，说明文字只能截断成三四行，长书名还会挤成两行；
 * 书目本身是「按用途找一本」的场景，行式列表更能一眼扫过作者、版次与 ISBN，
 * 说明也能完整铺开。分组标题之间用细线分隔，不再有边框与投影。
 */
export function ReadingShelf({
  books,
  groups,
  variant,
}: {
  books: ShelfBook[];
  groups: ShelfGroup[];
  variant?: 'page';
}) {
  const [query, setQuery] = useState('');
  const raw = query.trim();

  const list = useMemo(() => {
    if (!raw) return books;
    const asIsbn = digitsOf(raw);
    const onlyIsbn = /^[0-9xX\s-]+$/.test(raw) && asIsbn.length >= 6;
    const needle = raw.toLowerCase();

    return books.filter((book) => {
      if (onlyIsbn) return digitsOf(book.isbn).includes(asIsbn);
      const haystack = [book.title, book.author, book.publisher, book.year, book.note, ...book.tags]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [books, raw]);

  // 检索时仍按分组归位，命中项少于一组的才会整组消失
  const sections = groups
    .map((group) => ({ ...group, items: list.filter((book) => book.group === group.key) }))
    .filter((group) => group.items.length);

  let seq = 0;

  return (
    <section className={`shelf${variant === 'page' ? ' shelf--page' : ''}`} aria-label="推荐阅读">
      <div className="shelf__head">
        {/* 独立成页时页面没有别的标题，这里就用 h1，读屏不会缺一级标题 */}
        {variant === 'page' ? (
          <h1 className="shelf__title">推荐阅读</h1>
        ) : (
          <h2 className="shelf__title">推荐阅读</h2>
        )}
        <span className="shelf__count">
          {raw ? `${list.length} / ${books.length} 种` : `${books.length} 种`}
        </span>
      </div>

      <div className="shelf__search">
        <input
          className="ln-input shelf__input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="书名 / 作者 / 出版社 / ISBN"
          aria-label="按书名、作者、出版社或 ISBN 检索推荐读物"
          spellCheck={false}
        />
        {query ? (
          <button type="button" className="shelf__clear" onClick={() => setQuery('')} aria-label="清除检索">
            ×
          </button>
        ) : null}
      </div>
      <p className="shelf__hint">ISBN 可省略连字符，直接输 9787301272695 也能查到。</p>

      {sections.length ? (
        sections.map((group) => (
          <section className="shelf__group" key={group.key} aria-labelledby={`rg-${group.key}`}>
            <div className="shelf__grouphead">
              <h2 className="shelf__grouptitle" id={`rg-${group.key}`}>
                {group.title}
              </h2>
              <span className="shelf__groupcount">{group.items.length} 种</span>
              <p className="shelf__grouplead">{group.lead}</p>
            </div>

            <ol className="shelf__list">
              {group.items.map((book) => {
                seq += 1;
                return (
                  <li className="shelf__row" key={book.id}>
                    <span className="shelf__no" aria-hidden="true">
                      {String(seq).padStart(2, '0')}
                    </span>
                    <div className="shelf__main">
                      <h3 className="shelf__name">{book.title}</h3>
                      <p className="shelf__meta">
                        {book.author} · {book.publisher} · {book.year}
                      </p>
                      <p className="shelf__note">{book.note}</p>
                    </div>
                    <div className="shelf__side">
                      <span className="shelf__isbn">ISBN {book.isbn}</span>
                      <span className="shelf__tagrow">
                        {book.tags.map((tag) => (
                          <span className="shelf__tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      ) : (
        <p className="shelf__empty">
          没有匹配「{raw}」的书。换个书名关键词，或只输 ISBN 的后九位试试。
        </p>
      )}
    </section>
  );
}
