import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ClassDetail, SessionUser } from '@ln/types';
import { formatDate } from '@ln/utils';
import { requirePageUser } from '@/lib/session';
import { getClassDetail } from '@/server/modules/classes';
import { ClassCodePanel, DisbandClass, InvitePanel, LeaveClass, RemoveMember } from '@/components/class-controls';

export const dynamic = 'force-dynamic';

const SOURCE_LABEL: Record<string, string> = {
  CODE: '班级码',
  INVITE: '邀请链接',
  INVITED: '同学邀请',
  MANUAL: '教师添加',
};

export default async function ClassDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePageUser();

  let detail: ClassDetail | null = null;
  try {
    detail = getClassDetail(params.id, user);
  } catch {
    detail = null;
  }
  if (!detail) notFound();

  const klass = detail;
  const isOwner = klass.teacherId === user.id;
  const me: SessionUser = user;

  return (
    <div className="wrap wrap--wide">
      <div style={{ marginBottom: 18 }}>
        <Link className="section__hint" href="/classes">
          ← 返回班级
        </Link>
      </div>

      <header className="head">
        <div>
          <span className="course__term">{klass.term ?? '未标注学期'}</span>
          <h1 className="head__title" style={{ marginTop: 6 }}>
            {klass.name}
          </h1>
          <p className="head__sub">
            {klass.description ?? '尚未填写班级说明。'}
          </p>
        </div>
        <div className="head__actions">
          <span className="ln-badge">{klass.teacherName} 老师</span>
          {isOwner ? (
            <>
              <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/">
                课程管理
              </Link>
              <DisbandClass
                classId={klass.id}
                name={klass.name}
                memberCount={klass.memberCount}
                courseCount={klass.courseCount}
              />
            </>
          ) : (
            <LeaveClass classId={klass.id} />
          )}
        </div>
      </header>

      <div className="grid grid--4" style={{ marginBottom: 28 }}>
        <div className="stat">
          <div className="stat__label">成员</div>
          <div className="stat__value">{klass.memberCount}</div>
          <div className="stat__hint">含教师与旁听</div>
        </div>
        <div className="stat">
          <div className="stat__label">课程</div>
          <div className="stat__value">{klass.courseCount}</div>
          <div className="stat__hint">入班即自动选修</div>
        </div>
        <div className="stat">
          <div className="stat__label">加入方式</div>
          <div className="stat__value" style={{ fontSize: 20 }}>
            {klass.joinOpen ? '班级码开放' : '仅限邀请'}
          </div>
          <div className="stat__hint">{klass.joinOpen ? '学生可自助入班' : '需教师生成链接'}</div>
        </div>
        <div className="stat">
          <div className="stat__label">建班</div>
          <div className="stat__value" style={{ fontSize: 20 }}>
            {formatDate(klass.createdAt)}
          </div>
          <div className="stat__hint">班级创建日期</div>
        </div>
      </div>

      <div className="grid grid--2" style={{ marginBottom: 30, alignItems: 'start' }}>
        <ClassCodePanel
          classId={klass.id}
          joinCode={klass.joinCode}
          joinOpen={klass.joinOpen}
          isOwner={isOwner}
        />
        <InvitePanel classId={klass.id} invites={klass.invites} isOwner={isOwner} />
      </div>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">成员名单</h2>
          <span className="section__hint">{klass.members.length} 人</span>
        </div>
        {klass.members.length ? (
          <table className="ln-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th style={{ width: 140 }}>学号</th>
                <th>姓名</th>
                <th style={{ width: 120 }}>加入方式</th>
                <th style={{ width: 130 }}>加入时间</th>
                {isOwner ? <th style={{ width: 80 }} /> : null}
              </tr>
            </thead>
            <tbody>
              {klass.members.map((member, index) => (
                <tr key={member.id}>
                  <td className="num">{String(index + 1).padStart(2, '0')}</td>
                  <td className="num">{member.loginNo}</td>
                  <td>
                    {member.name}
                    {member.userId === me.id ? <span className="ln-badge ln-badge--quiet" style={{ marginLeft: 8 }}>我</span> : null}
                  </td>
                  <td>{SOURCE_LABEL[member.source] ?? member.source}</td>
                  <td>{formatDate(member.joinedAt)}</td>
                  {isOwner ? (
                    <td>
                      {member.userId === me.id ? null : (
                        <RemoveMember classId={klass.id} userId={member.userId} name={member.name} />
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty" style={{ marginTop: 14 }}>
            还没有学生加入。把班级码或邀请链接发到课程群里即可。
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">本班课程</h2>
          <span className="section__hint">{klass.courses.length} 门</span>
        </div>
        {klass.courses.length ? (
          <div className="rows">
            {klass.courses.map((course) => (
              <div className="row" key={course.id}>
                <div className="row__main">
                  <div className="row__title">
                    <Link href={`/courses/${course.id}`}>{course.title}</Link>
                  </div>
                  <div className="row__meta">
                    <span>{course.term ?? '未标注学期'}</span>
                    <span>{course.coursewareCount} 份课件</span>
                  </div>
                </div>
                <div className="row__side">
                  <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={`/courses/${course.id}`}>
                    进入课程
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 14 }}>
            这个班还没有关联课程。教师在新建课程时选择本班即可。
          </div>
        )}
      </section>
    </div>
  );
}
