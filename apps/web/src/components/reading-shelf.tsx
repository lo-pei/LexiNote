'use client';

import { useMemo, useState } from 'react';

export interface ShelfBook {
  id: string;
  title: string;
  author: string;
  publisher: string;
  year: string;
  isbn: string;
  note: string;
  tags: string[];
}

/** 去掉连字符与空格，方便按 ISBN 检索 */
const digitsOf = (value: string): string => value.replace(/[^0-9xX]/g, '').toLowerCase();

export function ReadingShelf({ books, variant }: { books: ShelfBook[]; variant?: 'page' }) {
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
          placeholder="书名 / 作者 / ISBN"
          aria-label="按书名、作者或 ISBN 检索推荐读物"
          spellCheck={false}
        />
        {query ? (
          <button type="button" className="shelf__clear" onClick={() => setQuery('')} aria-label="清除检索">
            ×
          </button>
        ) : null}
      </div>
      <p className="shelf__hint">ISBN 可省略连字符，直接输 9787301272695 也能查到。</p>

      {list.length ? (
        <ul className="shelf__grid">
          {list.map((book, index) => (
            <li className="shelf__card" key={book.id}>
              <span className="shelf__spine" aria-hidden="true" />
              <div className="shelf__cardbody">
                <div className="shelf__idx">{String(index + 1).padStart(2, '0')}</div>
                <h3 className="shelf__name">{book.title}</h3>
                <p className="shelf__meta">{book.author}</p>
                <p className="shelf__meta">
                  {book.publisher} · {book.year}
                </p>
                <p className="shelf__note">{book.note}</p>
              </div>
              <div className="shelf__foot">
                <span className="shelf__isbn">ISBN {book.isbn}</span>
                {book.tags.map((tag) => (
                  <span className="shelf__tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="shelf__empty">
          没有匹配「{raw}」的书。换个书名关键词，或只输 ISBN 的后九位试试。
        </p>
      )}
    </section>
  );
}