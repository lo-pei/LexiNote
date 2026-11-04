import Link from 'next/link';
import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { formatDate, formatRelative } from '@ln/utils';
import type { AnalyticsOverview, ClassDetail, CourseDetail, SessionUser } from '@ln/types';
import { requirePageUser } from '@/lib/session';
import { getCourse } from '@/server/modules/courses';
import { getClassDetail } from '@/server/modules/classes';
import { overview } from '@/server/modules/analytics';
import { EnrollButton } from '@/components/enroll-button';
import { NewCourseware } from '@/components/new-courseware';
import { AnalyticsPanel } from '@/components/analytics-panel';
import {
  ClassCodePanel,
  DisbandClass,
  InvitePanel,
  LeaveClass,
  RemoveMember,
} from '@/components/class-controls';

export const dynamic = 'force-dynamic';

const SOURCE_LABEL: Record<string, string> = {
  CODE: '班级码',
  INVITE: '邀请链接',
  INVITED: '同学邀请',
  MANUAL: '教师添加',
};

function visibleCourseware(course: CourseDetail, user: SessionUser) {
  const isOwner = course.teacherId === user.id;
  return course.courseware.filter((item) => (isOwner ? true : item.status === 'PUBLISHED'));
}

/**
 * 课程页。
 *
 * 一门课只对应一个教学班，以前「课程」和「班级」分成两页：课程页看课件，
 * 班级页看班级码、邀请、名册与学情，两边都要点一次才能拼出全貌。
 * 现在合成一页——上面是课程（课件、作业），下面是这门课的教学班
 * （班级码、邀请、名册、学情），班即课的授课对象，不再单独占一个入口。
 */
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

  // 班级信息只有班内的人拿得到；不在班里（或这门课没挂班）时整段跳过
  let klass: ClassDetail | null = null;
  if (course.classId) {
    try {
      klass = getClassDetail(course.classId, user);
    } catch {
      klass = null;
    }
  }

  const classOwner = Boolean(klass && klass.teacherId === user.id);
  const isMember = Boolean(klass && klass.members.some((member) => member.userId === user.id));

  // 学情按本课程统计，只给任课教师看
  let stats: AnalyticsOverview | null = null;
  if (isOwner) {
    try {
      stats = overview(course.id, user);
    } catch {
      stats = null;
    }
  }

  const courseware = visibleCourseware(course, user);
  const words = courseware.reduce((sum, item) => sum + item.words, 0);
  const terms = courseware.reduce((sum, item) => sum + item.termCount, 0);
  const memberCount = klass ? klass.memberCount : course.studentCount;

  // 成员名册与行为数据合成一张表：同一页只留一份学生清单
  const metrics = new Map((stats?.students ?? []).map((item) => [item.studentId, item]));
  const rosterWithMetrics = Boolean(classOwner && stats);

  return (
    <div className="wrap wrap--wide">
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
          {klass ? (
            <p className="ln-hint" style={{ marginTop: 8 }}>
              教学班：{klass.name}
              {classOwner ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <a className="code-chip" href="#class">
                    {klass.joinCode}
                  </a>
                </>
              ) : (
                <span> · {klass.teacherName} 老师</span>
              )}
            </p>
          ) : null}
        </div>
        <div className="head__actions">
          {isOwner ? <NewCourseware courseId={course.id} /> : null}
          {/* 学生端不放「用班级码加入」：入班由教师发码或邀请完成，学生页只保留阅读与讨论 */}
          {user.role === 'STUDENT' && !course.enrolled && !course.classId ? (
            <EnrollButton courseId={course.id} />
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
          <div className="stat__label">班级成员</div>
          <div className="stat__value">{memberCount}</div>
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
              ? `这门课属于「${course.className ?? '教学班'}」，不在你所在的班级里。如需加入，请向任课教师索取班级码或邀请链接。`
              : '这门课你还没有选修。选修后可阅读全部已发布课件，并把课件纳入自己的笔记库。'}
          </span>
          {course.classId ? null : <EnrollButton courseId={course.id} />}
        </div>
      ) : null}

      {isOwner ? (
        <section className="section section--detail" id="analytics">
          <div className="section__head">
            <h2 className="section__title">学情</h2>
            <span className="section__hint">本班学生在这门课上的行为</span>
          </div>
          {stats ? (
            <AnalyticsPanel
              data={stats}
              hint="数据来自本班学生在本课程课件上的行为：保存笔记、点开术语、收录生词、讨论回复与译文查表。"
            />
          ) : (
            <div className="empty" style={{ marginTop: 14 }}>
              这门课还没有行为数据。学生开始阅读课件后，这里会出现明细。
            </div>
          )}
        </section>
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">课件</h2>
          <span className="section__hint">按讲授顺序</span>
        </div>
        {courseware.length ? (
          <div className="rows">
            {courseware.map((item, index) => {
              // 分组标题只在换组时插一次；没有 section 的课件照旧平铺
              const showSection = Boolean(item.section) && item.section !== courseware[index - 1]?.section;
              return (
                <Fragment key={item.id}>
                  {showSection ? <div className="cw-group">{item.section}</div> : null}
                  <div className="row">
                    <span className="row__num">{String(index + 1).padStart(2, '0')}</span>
                    <div className="row__main">
                      <div className="row__title">
                        <Link href={`/docs/${item.id}`}>{item.title}</Link>
                        {item.status === 'DRAFT' ? <span className="ln-badge">草稿</span> : null}
                        {isOwner ? (
                          <span className="ln-badge ln-badge--quiet">{item.status === 'DRAFT' ? '未发布' : '已发布'}</span>
                        ) : null}
                      </div>
                      <div className="row__meta">
                        {item.subtitle ? <span className="row__sub">{item.subtitle}</span> : null}
                        <span>{item.words} 词</span>
                        {item.termCount ? <span>{item.termCount} 处术语</span> : null}
                        <span>更新于 {formatRelative(item.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="row__side">
                      <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={`/docs/${item.id}`}>
                        阅读
                      </Link>
                    </div>
                  </div>
                </Fragment>
              );
            })}
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

      {klass ? (
        <section className="section" id="class">
          <div className="section__head">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
              <h2 className="section__title">教学班</h2>
              <span className="section__hint">
                {klass.name} · {klass.memberCount} 人
              </span>
            </div>
            {classOwner ? (
              <DisbandClass
                classId={klass.id}
                name={klass.name}
                memberCount={klass.memberCount}
                courseCount={klass.courseCount}
              />
            ) : isMember ? (
              <LeaveClass classId={klass.id} />
            ) : null}
          </div>

          <div className="grid grid--2" style={{ marginBottom: 26, alignItems: 'start' }}>
            <ClassCodePanel
              classId={klass.id}
              joinCode={klass.joinCode}
              joinOpen={klass.joinOpen}
              isOwner={classOwner}
            />
            <InvitePanel classId={klass.id} invites={klass.invites} isOwner={classOwner} />
          </div>

          <div className="section__head">
            <h2 className="section__title">成员名单</h2>
            <span className="section__hint">
              {klass.members.length} 人
              {rosterWithMetrics ? ' · 按学号排列，含本课程行为' : ''}
            </span>
          </div>
          {klass.members.length ? (
            <div className="table-scroll roster-scroll" style={{ marginTop: 12 }}>
              <table className="ln-table ln-table--roster">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th style={{ width: 132 }}>学号</th>
                    <th>姓名</th>
                    {rosterWithMetrics ? (
                      <>
                        <th className="num">笔记</th>
                        <th className="num">术语</th>
                        <th className="num">收录词</th>
                        <th className="num">回复</th>
                        <th className="num">译文</th>
                      </>
                    ) : null}
                    <th style={{ width: 104 }}>加入方式</th>
                    <th style={{ width: 112 }}>加入时间</th>
                    {classOwner ? <th style={{ width: 64 }} /> : null}
                  </tr>
                </thead>
                <tbody>
                  {klass.members.map((member, index) => {
                    const row = metrics.get(member.userId);
                    return (
                      <tr key={member.id}>
                        <td className="ln-table__no">{String(index + 1).padStart(2, '0')}</td>
                        <td className="num">{member.loginNo}</td>
                        <td>
                          {member.name}
                          {member.userId === user.id ? (
                            <span className="ln-badge ln-badge--quiet" style={{ marginLeft: 8 }}>
                              我
                            </span>
                          ) : null}
                        </td>
                        {rosterWithMetrics ? (
                          <>
                            <td className="num">{row?.noteSaves ?? 0}</td>
                            <td className="num">{row?.termClicks ?? 0}</td>
                            <td className="num">{row?.wordsAdded ?? 0}</td>
                            <td className="num">{row?.forumReplies ?? 0}</td>
                            <td className="num">{row ? `${row.translationHitRate}%` : '—'}</td>
                          </>
                        ) : null}
                        <td>{SOURCE_LABEL[member.source] ?? member.source}</td>
                        <td>{formatDate(member.joinedAt)}</td>
                        {classOwner ? (
                          <td>
                            {member.userId === user.id ? null : (
                              <RemoveMember classId={klass.id} userId={member.userId} name={member.name} />
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty" style={{ marginTop: 14 }}>
              还没有学生加入。把班级码或邀请链接发到课程群里即可。
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
