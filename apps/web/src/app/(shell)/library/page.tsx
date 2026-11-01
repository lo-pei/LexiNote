import Link from 'next/link';
import { formatRelative } from '@ln/utils';
import type { LibraryEntry } from '@/server/modules/documents';
import { requirePageUser } from '@/lib/session';
import { listLibrary } from '@/server/modules/documents';
import { NewNote } from '@/components/new-note';

export const dynamic = 'force-dynamic';

function Group({ title, hint, entries }: { title: string; hint: string; entries: LibraryEntry[] }) {
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">{title}</h2>
        <span className="section__hint">{hint}</span>
      </div>
      {entries.length ? (
        <div className="rows">
          {entries.map((entry) => (
            <div className="row" key={entry.id}>
              <div className="row__main">
                <div className="row__title">
                  <Link href={`/docs/${entry.id}`}>{entry.title}</Link>
                  {entry.originTitle ? <span className="ln-badge">来自课件</span> : null}
                  {entry.status === 'DRAFT' && entry.kind === 'COURSEWARE' ? (
                    <span className="ln-badge">草稿</span>
                  ) : null}
                </div>
                <div className="row__meta">
                  {entry.originTitle ? <span>原课件 · {entry.originTitle}</span> : null}
                  {entry.subtitle ? <span>{entry.subtitle}</span> : null}
                  <span>{entry.words} 词</span>
                  <span>{entry.terms} 处术语</span>
                  <span>更新于 {formatRelative(entry.updatedAt)}</span>
                </div>
              </div>
              <div className="row__side">
                <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={`/docs/${entry.id}`}>
                  打开
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 14 }}>
          {title === '我的笔记'
            ? '还没有笔记。新建一份，或从课件「纳入我的笔记库」开始。'
            : '还没有课件。'}
        </div>
      )}
    </section>
  );
}

export default async function LibraryPage() {
  const user = await requirePageUser();
  const entries = listLibrary(user);

  const notes = entries.filter((entry) => entry.kind === 'NOTE');
  const courseware = entries.filter((entry) => entry.kind === 'COURSEWARE');

  const words = entries.reduce((sum, entry) => sum + entry.words, 0);

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">我的文档</h1>
          <p className="head__sub">
            课件副本与个人笔记都放在这里。全文 {words} 词，{entries.length} 份文档。
          </p>
        </div>
        <div className="head__actions">
          <NewNote />
        </div>
      </header>

      <Group title="我的笔记" hint={`${notes.length} 份`} entries={notes} />
      {user.role === 'TEACHER' || courseware.length ? (
        <Group title="我编写的课件" hint={`${courseware.length} 份`} entries={courseware} />
      ) : null}
    </div>
  );
}
