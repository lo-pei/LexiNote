import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { TextbookDetail } from '@ln/types';
import { requirePageUser } from '@/lib/session';
import { getTextbook } from '@/server/modules/textbooks';
import { listWordbooks, TEXTBOOK_BOOK_NAME } from '@/server/modules/vocabulary';

export const dynamic = 'force-dynamic';

const fmt = (n: number): string => n.toLocaleString('zh-CN');

/**
 * 目录前面的标签用原书课次，而不是列表序号：
 * 序号 01 对应的是「前言」，与标题里的「第 1 课」错开一位，学生会看糊。
 */
const CN_NUM = ['一', '二', '三', '四', '五'];
function chapterLabel(no: number): string {
  if (no === 0) return '序';
  if (no >= 901) return `附${CN_NUM[no - 901] ?? ''}`;
  return String(no);
}

export default async function TextbookPage({ params }: { params: { id: string } }) {
  const user = await requirePageUser();

  let found: TextbookDetail | null = null;
  try {
    found = getTextbook(params.id, user);
  } catch {
    found = null;
  }
  if (!found) notFound();

  const book: TextbookDetail = found;
  // 跑过 textbook:vocab 的机器上，每个账号都有一本从本书抽出来的核心词表
  const vocabBook = listWordbooks(user).find((item) => item.name === TEXTBOOK_BOOK_NAME);

  return (
    <div className="wrap">
      <div style={{ marginBottom: 18 }}>
        <Link className="section__hint" href="/textbooks">
          ← 返回教材
        </Link>
      </div>

      <header className="head">
        <div>
          <h1 className="head__title">{book.title}</h1>
          <p className="head__sub">
            {book.author} · {book.publisher}
            {book.edition ? ` · ${book.edition}` : ''}
            {book.year ? ` · ${book.year}` : ''}
            {book.isbn ? ` · ISBN ${book.isbn}` : ''}
          </p>
        </div>
        <div className="head__actions">
          {vocabBook ? (
            <Link className="ln-btn ln-btn--outline ln-btn--sm" href={`/wordbooks?book=${vocabBook.id}`}>
              本书核心词 {vocabBook.itemCount}
            </Link>
          ) : null}
          <span className="shelf__count">
            {book.chapterCount} 篇 · {fmt(book.wordCount)} 字
          </span>
        </div>
      </header>

      {book.description ? (
        <p className="shelf__hint" style={{ marginBottom: 14 }}>
          {book.description}
        </p>
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">目录</h2>
          <span className="section__hint">点开即进阅读页，可标生词、对照译文</span>
        </div>

        {book.chapters.length ? (
          <div className="rows">
            {book.chapters.map((chapter) => {
              const href = `/textbooks/${book.id}/${chapter.id}`;
              return (
                <div className="row" key={chapter.id}>
                  <div className="row__main">
                    <div className="row__title">
                      <span className="shelf__idx" style={{ display: 'inline-block', width: 22, flex: '0 0 auto' }}>
                        {chapterLabel(chapter.chapterNo)}
                      </span>
                      <Link href={href}>{chapter.title}</Link>
                    </div>
                    <div className="row__meta" style={{ paddingLeft: 30 }}>
                      {chapter.subtitle ? <span>{chapter.subtitle}</span> : null}
                      <span>{fmt(chapter.words)} 字</span>
                    </div>
                  </div>
                  <div className="row__side">
                    <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={href}>
                      阅读
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 14 }}>
            这本书还没有导入章节。
          </div>
        )}
      </section>
    </div>
  );
}
