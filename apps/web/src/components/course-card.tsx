import Link from 'next/link';
import type { CourseDetail } from '@ln/types';
import { EnrollButton } from './enroll-button';

export function CourseCard({
  course,
  action,
}: {
  course: CourseDetail;
  action: 'enter' | 'enroll' | 'manage' | 'class';
}) {
  const published = course.courseware.filter((item) => item.status === 'PUBLISHED');

  return (
    <article className="course">
      <span className="course__term">{course.term ?? '未标注学期'}</span>
      <h3 className="course__title">
        <Link href={`/courses/${course.id}`}>{course.title}</Link>
      </h3>
      {course.className ? <span className="course__class">{course.className}</span> : null}
      <p className="course__desc">{course.description ?? '尚未填写课程说明。'}</p>

      <div className="course__foot">
        <div className="course__nums">
          <span>
            <b>{published.length}</b> 份课件
          </span>
          <span>
            <b>{course.assignments.length}</b> 份作业
          </span>
          <span>
            <b>{course.studentCount}</b> 人
          </span>
        </div>

        {action === 'enroll' ? (
          <EnrollButton courseId={course.id} />
        ) : action === 'class' ? (
          <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/#join">
            用班级码加入
          </Link>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* 班级已并进课程页，学情在课程页里；给一条直达的路，省得进去再滚 */}
            {action === 'manage' ? (
              <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={`/courses/${course.id}#analytics`}>
                学情
              </Link>
            ) : null}
            <Link className="ln-btn ln-btn--outline ln-btn--sm" href={`/courses/${course.id}`}>
              {action === 'manage' ? '管理课程' : '进入课程'}
            </Link>
          </span>
        )}
      </div>
    </article>
  );
}
