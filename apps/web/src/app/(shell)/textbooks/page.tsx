import Link from 'next/link';
import { requirePageUser } from '@/lib/session';
import { listTextbooks } from '@/server/modules/textbooks';

export const dynamic = 'force-dynamic';
export const metadata = { title: '教材 · LexiNote' };

const fmt = (n: number): string => n.toLocaleString('zh-CN');

export default async function TextbooksPage() {
  await requirePageUser();
  const books = listTextbooks();

  const chapters = books.reduce((sum, book) => sum + book.chapterCount, 0);
  const words = books.reduce((sum, book) => sum + book.wordCount, 0);

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">教材</h1>
          <p className="head__sub">
            课程所用教材已按课次拆开，正文可直接在阅读页做精读：标生词、点术语、对照译文。
          </p>
        </div>
        <div className="head__actions">
          <span className="shelf__count">
            {books.length} 部、{chapters} 篇、约 {fmt(Math.round(words / 10000))} 万字
          </span>
        </div>
      </header>

      {books.length ? (
        <ul className="shelf__grid">
          {books.map((book, index) => (
            <li className="shelf__card" key={book.id}>
              <span className="shelf__spine" aria-hidden="true" />
              <div className="shelf__cardbody">
                <div className="shelf__idx">{String(index + 1).padStart(2, '0')}</div>
                <h2 className="shelf__name">
                  <Link href={`/textbooks/${book.id}`}>{book.title}</Link>
                </h2>
                {book.subtitle ? <p className="shelf__meta">{book.subtitle}</p> : null}
                <p className="shelf__meta">{book.author}</p>
                <p className="shelf__meta">
                  {book.publisher}
                  {book.edition ? ` · ${book.edition}` : ''}
                  {book.year ? ` · ${book.year}` : ''}
                </p>
                {book.description ? <p className="shelf__note">{book.description}</p> : null}
              </div>
              <div className="shelf__foot">
                <span className="shelf__isbn">
                  {book.chapterCount} 篇 · {fmt(book.wordCount)} 字
                </span>
                {book.isbn ? <span className="shelf__tag">ISBN {book.isbn}</span> : null}
                <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={`/textbooks/${book.id}`}>
                  目录
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">还没有教材。教材由导入流程生成，请在部署机上运行导入脚本。</div>
      )}
    </div>
  );
}
