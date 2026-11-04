import Link from 'next/link';
import { requirePageUser } from '@/lib/session';
import { listCourses } from '@/server/modules/courses';
import { listClasses } from '@/server/modules/classes';
import { listLibrary } from '@/server/modules/documents';
import { listTopics } from '@/server/modules/forum';
import { formatRelative } from '@ln/utils';
import { CourseCard } from '@/components/course-card';
import { NewCourse } from '@/components/new-course';
import { JoinClass } from '@/components/join-class';
import { ProgressBoard } from '@/components/progress-board';
import { courseProgress } from '@/server/modules/teaching-progress';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: { joinFailed?: string } }) {
  const user = await requirePageUser();
  const courses = await listCourses(user);
  const classes = listClasses(user);

  const mine =
    user.role === 'TEACHER'
      ? courses.filter((course) => course.teacherId === user.id)
      : courses.filter((course) => course.enrolled);
  // 学生只修本班这一门课，其余教学班的课程不对他展示，避免串班
  const others =
    user.role === 'STUDENT' ? [] : courses.filter((course) => !mine.some((item) => item.id === course.id));

  // 还没有班的学生才需要这个输入框；有班的人走邀请链接加入别的班
  const needJoinBox = user.role !== 'TEACHER' && !classes.length;

  const library = user.role === 'STUDENT' || user.role === 'ADMIN' ? listLibrary(user).slice(0, 4) : [];
  const topics = listTopics(user).slice(0, 4);
  const progress = mine.length ? courseProgress(user) : [];

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">
            {user.name}，{user.role === 'TEACHER' ? '课程总览' : '我的课程'}
          </h1>
        </div>
        <div className="head__actions">
          {user.role === 'TEACHER' ? (
            <NewCourse
              classes={classes
                .filter((item) => item.isOwner)
                .map((item) => ({ id: item.id, name: item.name, members: item.memberCount }))}
            />
          ) : null}
        </div>
      </header>

      {searchParams.joinFailed ? (
        <div className="notice notice--accent" style={{ marginBottom: 22 }}>
          账号已经建好，但班级码没能核验通过。请在下面重新输入教师给的班级码，或打开邀请链接加入。
        </div>
      ) : null}

      {needJoinBox ? (
        <div id="join" style={{ marginBottom: 30 }}>
          <JoinClass />
        </div>
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">{user.role === 'TEACHER' ? '我教的课程' : '已选修的课程'}</h2>
          <span className="section__hint">{mine.length} 门</span>
        </div>

        {mine.length ? (
          <div className="grid grid--3" style={{ marginTop: 16 }}>
            {mine.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                action={user.role === 'TEACHER' && course.teacherId === user.id ? 'manage' : 'enter'}
              />
            ))}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 16 }}>
            {user.role === 'TEACHER'
              ? '还没有创建课程。新建一门课，再从第一讲开始建课件。'
              : '还没有选修任何课程。从下面的全部课程里选一门开始。'}
          </div>
        )}
      </section>

      {progress.length ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">{user.role === 'TEACHER' ? '教学进度' : '课程进度'}</h2>
            <span className="section__hint">按课程安排的专题与上课日推算</span>
          </div>
          <ProgressBoard items={progress} />
        </section>
      ) : null}

      {others.length ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">{user.role === 'TEACHER' ? '其他课程' : '全部课程'}</h2>
            <span className="section__hint">按开课时间排序</span>
          </div>
          <div className="grid grid--3" style={{ marginTop: 16 }}>
            {others.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                action={
                  user.role === 'STUDENT' && !course.enrolled
                    ? course.classId
                      ? 'class'
                      : 'enroll'
                    : 'enter'
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* 只有一块内容时不要留半屏空栏 */}
      <div
        className={`grid${library.length && topics.length ? ' grid--2' : ''}`}
        style={{ marginTop: 34, alignItems: 'start' }}
      >
        {library.length ? (
          <section>
            <div className="section__head">
              <h2 className="section__title">最近编辑</h2>
              <Link className="section__hint" href="/library">
                全部文档
              </Link>
            </div>
            <div className="rows">
              {library.map((item) => (
                <div className="row" key={item.id}>
                  <div className="row__main">
                    <div className="row__title">
                      <Link href={`/docs/${item.id}`}>{item.title}</Link>
                      {item.originTitle ? <span className="ln-badge">副本</span> : null}
                    </div>
                    <div className="row__meta">
                      <span>{item.words} 词</span>
                      <span>{item.terms} 处术语</span>
                      <span>{formatRelative(item.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {topics.length ? (
          <section>
            <div className="section__head">
              <h2 className="section__title">讨论区动态</h2>
              <Link className="section__hint" href="/forum">
                全部讨论
              </Link>
            </div>
            <div className="rows">
              {topics.map((topic) => (
                <div className="row" key={topic.id}>
                  <div className="row__main">
                    <div className="row__title">
                      <Link href={`/forum/${topic.id}`}>{topic.title}</Link>
                      {topic.type === 'ASSIGNMENT' ? <span className="ln-badge ln-badge--required">作业</span> : null}
                    </div>
                    <div className="row__meta">
                      <span>{topic.authorName}</span>
                      <span>{topic.replyCount ?? 0} 条回复</span>
                      <span>{formatRelative(topic.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
