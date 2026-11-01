import Link from 'next/link';
import type { ClassSummary } from '@ln/types';
import { formatRelative } from '@ln/utils';
import { requirePageUser } from '@/lib/session';
import { listClasses } from '@/server/modules/classes';
import { NewClass } from '@/components/new-class';
import { JoinClass } from '@/components/join-class';

export const dynamic = 'force-dynamic';
export const metadata = { title: '班级 · LexiNote' };

function ClassCard({ item, role }: { item: ClassSummary; role: 'TEACHER' | 'STUDENT' }) {
  return (
    <article className="klass">
      <div className="klass__top">
        <span className="klass__term">{item.term ?? '未标注学期'}</span>
        {item.isOwner ? <span className="ln-badge ln-badge--quiet">我创设的</span> : null}
      </div>
      <h3 className="klass__title">
        <Link href={`/classes/${item.id}`}>{item.name}</Link>
      </h3>
      <p className="klass__desc">{item.description ?? '尚未填写班级说明。'}</p>
      <div className="klass__foot">
        <div className="klass__nums">
          <span>
            <b>{item.memberCount}</b> 人
          </span>
          <span>
            <b>{item.courseCount}</b> 门课
          </span>
          <span>建班于 {formatRelative(item.createdAt)}</span>
        </div>
        {role === 'TEACHER' && item.isOwner ? (
          <span className="code-chip">{item.joinCode}</span>
        ) : (
          <span className="ln-hint">{item.teacherName} 老师</span>
        )}
      </div>
    </article>
  );
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: { joinFailed?: string };
}) {
  const user = await requirePageUser();
  const classes = listClasses(user);
  const isTeacher = user.role === 'TEACHER';

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">班级</h1>
        </div>
        <div className="head__actions">
          {isTeacher ? <NewClass /> : null}
        </div>
      </header>

      {searchParams.joinFailed ? (
        <div className="notice notice--accent" style={{ marginBottom: 22 }}>
          账号已经建好，但班级码没能核验通过。请在下面重新输入教师给的班级码，或打开邀请链接加入。
        </div>
      ) : null}

      {!isTeacher ? <JoinClass /> : null}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">{isTeacher ? '我创设的班级' : '我加入的班级'}</h2>
          <span className="section__hint">{classes.length} 个</span>
        </div>

        {classes.length ? (
          <div className="grid grid--2" style={{ marginTop: 16 }}>
            {classes.map((item) => (
              <ClassCard key={item.id} item={item} role={isTeacher ? 'TEACHER' : 'STUDENT'} />
            ))}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 16 }}>
            {isTeacher
              ? '还没有班级。点右上角「创设班级」，系统会同时生成一个 6 位班级码。'
              : '还没有加入任何班级。向任课教师索取班级码或邀请链接，加入后课程会自动出现在这里。'}
          </div>
        )}
      </section>

      {!classes.length && !isTeacher ? (
        <p className="ln-hint" style={{ marginTop: 22 }}>
          也可以先把学号告诉老师，请老师在建班后生成一条邀请链接发给你。
        </p>
      ) : null}
    </div>
  );
}
