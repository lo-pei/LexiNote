import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate } from '@ln/utils';
import { requirePageUser } from '@/lib/session';
import { glossaryIndex, listWordbooks, pageItems } from '@/server/modules/vocabulary';
import { AddTerm, DeleteWordbook, MasteryDots, NewWordbook, Pronounce, RemoveItem } from '@/components/wordbook-controls';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 40;

function href(book: string, page: number, opts: { q?: string; starts?: string } = {}): string {
  const params = new URLSearchParams({ book });
  if (page > 1) params.set('page', String(page));
  if (opts.q) params.set('q', opts.q);
  if (opts.starts) params.set('starts', opts.starts);
  return `/wordbooks?${params.toString()}`;
}

export default async function WordbooksPage({
  searchParams,
}: {
  searchParams: { book?: string; q?: string; starts?: string; page?: string };
}) {
  const user = await requirePageUser();
  const books = listWordbooks(user);
  if (searchParams.book && !books.some((book) => book.id === searchParams.book)) notFound();

  const active = books.find((book) => book.id === searchParams.book) ?? books[0];
  const q = (searchParams.q ?? '').trim();
  const starts = (searchParams.starts ?? '').trim().toUpperCase().slice(0, 1);
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1);
  const { items, total } = active
    ? pageItems(active.id, user, { q, starts, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE })
    : { items: [], total: 0 };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const letters = active ? glossaryIndex(active.id, user) : [];
  const isGlossary = active?.kind === 'GLOSSARY';

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">生词本</h1>
        </div>
        <div className="head__actions">
          {active && !isGlossary ? <AddTerm wordbookId={active.id} /> : null}
          <NewWordbook />
        </div>
      </header>

      {books.length ? (
        <nav className="wb-tabs" aria-label="词表">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/wordbooks?book=${book.id}`}
              className={`chip${active?.id === book.id ? ' chip--active' : ''}`}
              scroll={false}
            >
              {book.name}
              <span style={{ opacity: 0.6 }}>{book.itemCount ?? 0}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      {active ? (
        <>
          <div className="notice" style={{ marginBottom: 6 }}>
            <span>
              {active.name}
              {active.description ? ` · ${active.description}` : ''}
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <a className="ln-btn ln-btn--outline ln-btn--sm" href={`/api/wordbooks/${active.id}/export?format=xlsx`}>
                导出 Excel
              </a>
              <a className="ln-btn ln-btn--outline ln-btn--sm" href={`/api/wordbooks/${active.id}/export?format=docx`}>
                导出 Word
              </a>
              <a
                className="ln-btn ln-btn--outline ln-btn--sm"
                href={`/api/wordbooks/${active.id}/export?format=pdf`}
                target="_blank"
                rel="noreferrer"
              >
                打印 / PDF
              </a>
              {/* 内置词库（法律英语单词本）不可删，只允许移除词条 */}
              {isGlossary ? null : <DeleteWordbook wordbookId={active.id} name={active.name} />}
            </span>
          </div>

          <form className="wb-search" action="/wordbooks" method="get">
            <input type="hidden" name="book" value={active.id} />
            <input
              className="ln-input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder={isGlossary ? '搜单词或中文释义，如 negligence / 过失' : '在这个词表里搜词或释义'}
              aria-label="搜索词条"
            />
            <button className="ln-btn ln-btn--outline ln-btn--sm" type="submit">
              搜索
            </button>
            {q ? (
              <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={href(active.id, 1)}>
                清除
              </Link>
            ) : null}
          </form>

          {letters.length ? (
            <nav className="wb-alpha" aria-label="首字母索引">
              {letters.map((item) => (
                <Link
                  key={item.letter}
                  href={href(active.id, 1, { starts: item.letter })}
                  className={`wb-alpha__item${starts === item.letter ? ' wb-alpha__item--on' : ''}`}
                >
                  {item.letter}
                  <em>{item.n}</em>
                </Link>
              ))}
            </nav>
          ) : null}

          <section className="section">
            <div className="section__head">
              <h2 className="section__title">词条</h2>
              <span className="section__hint">
                {q ? `匹配 ${total} 条` : starts ? `${starts} 开头 · ${total} 条` : isGlossary ? '按字母序' : '按收录时间倒序'}
                {pages > 1 ? ` · 第 ${page} / ${pages} 页` : ''}
              </span>
            </div>

            {items.length ? (
              <div className="wb-list">
                {items.map((item) => (
                  <div className="wb-item" key={item.id}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>
                        <span className="wb-term">{item.entry.term}</span>
                        <Pronounce term={item.entry.term} />
                        {item.entry.phonetic ? <span className="wb-phon">{item.entry.phonetic}</span> : null}
                      </div>
                      <p className="wb-def">{item.entry.definitionZh}</p>
                      {item.sourceContext ? <p className="wb-ctx">{item.sourceContext}</p> : null}
                      {/* 内置词库的来源已在顶部说明里写过，逐条再标一次反而占地方 */}
                      {isGlossary ? null : (
                        <p className="row__meta" style={{ marginTop: 6 }}>
                          <span>
                            {item.sourceDocId && item.sourceDocTitle ? (
                              <Link href={`/docs/${item.sourceDocId}`} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
                                {item.sourceType === 'COURSE' ? '课件' : '笔记'} · {item.sourceDocTitle}
                              </Link>
                            ) : item.sourceType === 'MANUAL' ? (
                              '手动添加'
                            ) : (
                              '课堂讨论'
                            )}
                          </span>
                          <span>收录于 {formatDate(item.addedAt)}</span>
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 'none' }}>
                      <MasteryDots itemId={item.id} level={item.masteryLevel} />
                      <RemoveItem itemId={item.id} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ marginTop: 14 }}>
                {q
                  ? `没有匹配「${q}」的词条。`
                  : starts
                    ? `没有以 ${starts} 开头的词条。`
                    : isGlossary
                      ? '内置词库暂时是空的。'
                      : '这个词表还是空的。阅读时点击带虚线的术语，选择「加入生词本」就会出现在这里。'}
              </div>
            )}
          </section>

          {pages > 1 ? (
            <nav className="pager" aria-label="翻页">
              {page > 1 ? (
                <Link className="ln-btn ln-btn--outline ln-btn--sm" href={href(active.id, page - 1, { q, starts })}>
                  上一页
                </Link>
              ) : (
                <span className="ln-btn ln-btn--outline ln-btn--sm" aria-disabled="true" style={{ opacity: 0.4 }}>
                  上一页
                </span>
              )}
              <span className="pager__count tnum">
                {page} / {pages}
              </span>
              {page < pages ? (
                <Link className="ln-btn ln-btn--outline ln-btn--sm" href={href(active.id, page + 1, { q, starts })}>
                  下一页
                </Link>
              ) : (
                <span className="ln-btn ln-btn--outline ln-btn--sm" aria-disabled="true" style={{ opacity: 0.4 }}>
                  下一页
                </span>
              )}
            </nav>
          ) : null}

          <p className="ln-hint" style={{ marginTop: 18 }}>
            掌握度分四档：生词 → 眼熟 → 能译 → 会用。教师端学情只统计达到「能译」及以上的词条。
            {isGlossary ? '「法律英语单词本」是内置词库，可以标记掌握度或移除，不影响其他同学。' : ''}
          </p>
        </>
      ) : (
        <div className="empty">还没有词表。先新建一个，再开始收录术语。</div>
      )}
    </div>
  );
}
