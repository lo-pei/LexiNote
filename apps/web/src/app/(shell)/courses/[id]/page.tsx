import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate, formatRelative } from '@ln/utils';
import type { CourseDetail, SessionUser } from '@ln/types';
import { requirePageUser } from '@/lib/session';
import { getCourse } from '@/server/modules/courses';
import { EnrollButton } from '@/components/enroll-button';
import { NewCourseware } from '@/components/new-courseware';

export const dynamic = 'force-dynamic';

function visibleCourseware(course: CourseDetail, user: SessionUser) {
  const isOwner = course.teacherId === user.id;
  return course.courseware.filter((item) => (isOwner ? true : item.status === 'PUBLISHED'));
}

export default async function CoursePage({ params }: { params: { id: string } }) {
  const user = await requirePageUser();

  let found: CourseDetail | null = null;
  try {
    found = getCourse(params.id, user);
  } catch {
    found = null;
  }
  if (!found) notFound();

  const course: CourseDetail = found;
  const isOwner = course.teacherId === user.id;

  const courseware = visibleCourseware(course, user);
  const words = courseware.reduce((sum, item) => sum + item.words, 0);
  const terms = courseware.reduce((sum, item) => sum + item.termCount, 0);

  return (
    <div className="wrap">
      <div style={{ marginBottom: 18 }}>
        <Link className="section__hint" href="/">
          ← 返回课程
        </Link>
      </div>

      <header className="head">
        <div>
          <span className="course__term">{course.term ?? '未标注学期'}</span>
          <h1 className="head__title" style={{ marginTop: 6 }}>
            {course.title}
          </h1>
          <p className="head__sub">{course.description ?? '尚未填写课程说明。'}</p>
          {course.classId ? (
            <p className="ln-hint" style={{ marginTop: 8 }}>
              教学班：
              <Link href={`/classes/${course.classId}`}>{course.className ?? '查看班级'}</Link>
              {user.role === 'STUDENT' && !course.enrolled ? '（入班后自动选修）' : ''}
            </p>
          ) : null}
        </div>
        <div className="head__actions">
          {isOwner ? <NewCourseware courseId={course.id} /> : null}
          {user.role === 'STUDENT' && !course.enrolled ? (
            course.classId ? (
              <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/classes">
                用班级码加入
              </Link>
            ) : (
              <EnrollButton courseId={course.id} />
            )
          ) : null}
          <Link className="ln-btn ln-btn--outline ln-btn--sm" href={`/forum?courseId=${course.id}`}>
            课程讨论
          </Link>
        </div>
      </header>

      <div className="grid grid--4" style={{ marginBottom: 30 }}>
        <div className="stat">
          <div className="stat__label">课件</div>
          <div className="stat__value">{courseware.length}</div>
          <div className="stat__hint">其中 {courseware.filter((c) => c.status === 'DRAFT').length} 份草稿</div>
        </div>
        <div className="stat">
          <div className="stat__label">选课人数</div>
          <div className="stat__value">{course.studentCount}</div>
          <div className="stat__hint">教师 · {course.teacherName}</div>
        </div>
        <div className="stat">
          <div className="stat__label">可读词量</div>
          <div className="stat__value">{words}</div>
          <div className="stat__hint">全部课件正文合计</div>
        </div>
        <div className="stat">
          <div className="stat__label">术语节点</div>
          <div className="stat__value">{terms}</div>
          <div className="stat__hint">可点击查看释义</div>
        </div>
      </div>

      {user.role === 'STUDENT' && !course.enrolled ? (
        <div className="notice notice--accent" style={{ marginBottom: 24 }}>
          <span>
            {course.classId
              ? `这门课属于「${course.className ?? '教学班'}」。回「班级」页输入老师给的班级码，或在邀请链接里加入，课程与作业会自动挂到你的账号下。`
              : '这门课你还没有选修。选修后可阅读全部已发布课件，并把课件纳入自己的笔记库。'}
          </span>
          {course.classId ? (
            <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/classes">
              去加入班级
            </Link>
          ) : (
            <EnrollButton courseId={course.id} />
          )}
        </div>
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">课件</h2>
          <span className="section__hint">按讲授顺序</span>
        </div>
        {courseware.length ? (
          <div className="rows">
            {courseware.map((item, index) => (
              <div className="row" key={item.id}>
                <span className="row__num">{String(index + 1).padStart(2, '0')}</span>
                <div className="row__main">
                  <div className="row__title">
                    <Link href={`/docs/${item.id}`}>{item.title}</Link>
                    {item.status === 'DRAFT' ? <span className="ln-badge">草稿</span> : null}
                    {isOwner ? <span className="ln-badge ln-badge--quiet">{item.status === 'DRAFT' ? '未发布' : '已发布'}</span> : null}
                  </div>
                  <div className="row__meta">
                    <span>{item.words} 词</span>
                    <span>{item.termCount} 处术语</span>
                    <span>更新于 {formatRelative(item.updatedAt)}</span>
                  </div>
                </div>
                <div className="row__side">
                  <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={`/docs/${item.id}`}>
                    阅读
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 14 }}>
            这门课还没有已发布的课件。
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">作业与课堂讨论</h2>
          <Link className="section__hint" href={`/forum?courseId=${course.id}`}>
            进入讨论区
          </Link>
        </div>
        {course.assignments.length ? (
          <div className="rows">
            {course.assignments.map((topic) => (
              <div className="row" key={topic.id}>
                <div className="row__main">
                  <div className="row__title">
                    <Link href={`/forum/${topic.id}`}>{topic.title}</Link>
                    <span className="ln-badge ln-badge--required">作业</span>
                  </div>
                  <div className="row__meta">
                    <span>发布于 {formatDate(topic.createdAt)}</span>
                    {topic.dueAt ? <span>截止 {formatDate(topic.dueAt)}</span> : null}
                    <span>{topic.replyCount ?? 0} 条提交</span>
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
          <div className="empty" style={{ marginTop: 14 }}>
            暂无作业。教师发布作业后会出现在这里。
          </div>
        )}
      </section>
    </div>
  );
}
