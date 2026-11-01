import Link from 'next/link';
import { formatDate, formatRelative } from '@ln/utils';
import { requirePageUser } from '@/lib/session';
import { listCourses } from '@/server/modules/courses';
import { listTopics } from '@/server/modules/forum';
import { NewTopic } from '@/components/forum-controls';
import type { CourseOption } from '@/components/forum-controls';

export const dynamic = 'force-dynamic';

export default async function ForumPage({
  searchParams,
}: {
  searchParams: { courseId?: string; type?: string };
}) {
  const user = await requirePageUser();
  const allCourses = listCourses(user);
  const visibleCourses = allCourses.filter((course) =>
    user.role === 'TEACHER' ? course.teacherId === user.id || course.enrolled : course.enrolled,
  );

  const options: CourseOption[] = visibleCourses.map((course) => ({ id: course.id, title: course.title }));
  const topics = listTopics(user, searchParams.courseId);
  const typeFilter = searchParams.type === 'QUESTION' || searchParams.type === 'ASSIGNMENT' ? searchParams.type : null;
  const shown = typeFilter ? topics.filter((topic) => topic.type === typeFilter) : topics;

  const courseMap = new Map(allCourses.map((course) => [course.id, course.title]));

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">讨论区</h1>
          <p className="head__sub">
            提问、作业与批注都在这里流转。回复会同时计入你的学情记录，教师的批注会贴着你的原文出现。
          </p>
        </div>
        <div className="head__actions">
          {options.length ? <NewTopic courses={options} isTeacher={user.role === 'TEACHER'} /> : null}
        </div>
      </header>

      <nav className="wb-tabs" aria-label="筛选">
        <Link className={`chip${!typeFilter ? ' chip--active' : ''}`} href="/forum" scroll={false}>
          全部
        </Link>
        <Link className={`chip${typeFilter === 'QUESTION' ? ' chip--active' : ''}`} href="/forum?type=QUESTION" scroll={false}>
          课堂提问
        </Link>
        <Link className={`chip${typeFilter === 'ASSIGNMENT' ? ' chip--active' : ''}`} href="/forum?type=ASSIGNMENT" scroll={false}>
          作业
        </Link>
      </nav>

      {shown.length ? (
        <div className="rows">
          {shown.map((topic) => (
            <div className="row" key={topic.id}>
              <div className="row__main">
                <div className="row__title">
                  <Link href={`/forum/${topic.id}`}>{topic.title}</Link>
                  {topic.type === 'ASSIGNMENT' ? (
                    <span className="ln-badge ln-badge--required">作业</span>
                  ) : (
                    <span className="ln-badge">提问</span>
                  )}
                  {topic.isGraded ? <span className="ln-badge ln-badge--quiet">已评分</span> : null}
                </div>
                <div className="row__meta">
                  <span>{courseMap.get(topic.courseId) ?? '课程'}</span>
                  <span>{topic.authorName}</span>
                  <span>{topic.replyCount ?? 0} 条回复</span>
                  {topic.dueAt ? <span>截止 {formatDate(topic.dueAt)}</span> : <span>{formatRelative(topic.createdAt)}</span>}
                </div>
              </div>
              <div className="row__side">
                <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={`/forum/${topic.id}`}>
                  查看
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">{typeFilter ? '这个分类下还没有内容。' : '还没有讨论。选修课程后可以在此提问。'}</div>
      )}
    </div>
  );
}
