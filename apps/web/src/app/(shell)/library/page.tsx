import Link from 'next/link';
import { formatRelative } from '@ln/utils';
import type { LibraryEntry } from '@/server/modules/documents';
import { requirePageUser } from '@/lib/session';
import { listLibrary } from '@/server/modules/documents';
import { teacherCourses } from '@/server/modules/analytics';
import { NewNote } from '@/components/new-note';
import { UploadCourseware } from '@/components/upload-courseware';

export const dynamic = 'force-dynamic';

function Group({
  title,
  hint,
  entries,
  actionLabel,
  emptyText,
}: {
  title: string;
  hint: string;
  entries: LibraryEntry[];
  actionLabel: string;
  emptyText: string;
}) {
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
                  {entry.courseTitle ? <span>{entry.courseTitle}</span> : null}
                  {entry.originTitle ? <span>原课件 · {entry.originTitle}</span> : null}
                  {entry.subtitle ? <span>{entry.subtitle}</span> : null}
                  <span>{entry.words} 词</span>
                  <span>{entry.terms} 处术语</span>
                  <span>更新于 {formatRelative(entry.updatedAt)}</span>
                </div>
              </div>
              <div className="row__side">
                <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={`/docs/${entry.id}`}>
                  {actionLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 14 }}>
          {emptyText}
        </div>
      )}
    </section>
  );
}

/**
 * 教师端这一页是「我的课件」：主位是课件，笔记退到下面。
 * 学生端没有课件可编，仍是「我的文档」，以笔记为主。
 */
export default async function LibraryPage() {
  const user = await requirePageUser();
  const entries = listLibrary(user);
  const canTeach = user.role === 'TEACHER' || user.role === 'ADMIN';

  const notes = entries.filter((entry) => entry.kind === 'NOTE');
  const courseware = entries.filter((entry) => entry.kind === 'COURSEWARE');

  const courses = canTeach
    ? teacherCourses(user).map((course) => ({ id: course.id, title: course.title, className: course.className }))
    : [];

  const headTitle = canTeach ? '我的课件' : '我的文档';

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">{headTitle}</h1>
          {canTeach ? (
            <p className="head__sub">课件可以上传后直接改，也可以从课程页新建；发布前只有你自己看得到。</p>
          ) : null}
        </div>
        <div className="head__actions">
          {canTeach ? <UploadCourseware courses={courses} /> : null}
          <NewNote />
        </div>
      </header>

      {canTeach ? (
        <>
          <Group
            title="课件"
            hint={`${courseware.length} 份`}
            entries={courseware}
            actionLabel="编辑"
            emptyText="还没有课件。上传一份 Word 或 Markdown，或到课程页新建一份。"
          />
          <Group
            title="我的笔记"
            hint={`${notes.length} 份`}
            entries={notes}
            actionLabel="打开"
            emptyText="还没有笔记。新建一份，或从课件「纳入我的笔记库」开始。"
          />
        </>
      ) : (
        <Group
          title="我的笔记"
          hint={`${notes.length} 份`}
          entries={notes}
          actionLabel="打开"
          emptyText="还没有笔记。新建一份，或从课件「纳入我的笔记库」开始。"
        />
      )}
    </div>
  );
}
