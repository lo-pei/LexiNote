import Link from 'next/link';
import type { AnalyticsOverview } from '@ln/types';
import { formatDate } from '@ln/utils';
import { requirePageUser } from '@/lib/session';
import { listCourses } from '@/server/modules/courses';
import { overview, teacherCourses } from '@/server/modules/analytics';

export const dynamic = 'force-dynamic';

function Bars({ rows, accent }: { rows: { label: string; value: number; suffix?: string }[]; accent?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</span>
          <span className="bar-track">
            <span
              className={`bar-fill${accent ? ' bar-fill--accent' : ''}`}
              style={{ width: `${Math.round((row.value / max) * 100)}%` }}
            />
          </span>
          <span className="bar-num">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: { course?: string } }) {
  const user = await requirePageUser();

  if (user.role === 'STUDENT') {
    return (
      <div className="wrap">
        <header className="head">
          <div>
            <h1 className="head__title">学情</h1>
            <p className="head__sub">学情面板面向教师开放。你的阅读与标注记录会汇总给任课教师。</p>
          </div>
        </header>
        <div className="empty">如果你是教师，请用教师账号登录查看课程学情。</div>
      </div>
    );
  }

  const courses =
    user.role === 'ADMIN'
      ? listCourses(user).map((course) => ({ id: course.id, title: course.title }))
      : teacherCourses(user);

  const active = courses.find((course) => course.id === searchParams.course) ?? courses[0];

  let data: AnalyticsOverview | null = null;
  if (active) {
    try {
      data = overview(active.id, user);
    } catch {
      data = null;
    }
  }

  const weekMax = Math.max(1, ...(data?.weekly.map((w) => w.noteSaves + w.termClicks) ?? [1]));

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">学情</h1>
          <p className="head__sub">
            数据来自聚合表，按日累计；术语热度取自学习事件，用于定位下一次课的讲解重点。
          </p>
        </div>
      </header>

      {courses.length ? (
        <nav className="wb-tabs" aria-label="课程">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/analytics?course=${course.id}`}
              className={`chip${active?.id === course.id ? ' chip--active' : ''}`}
              scroll={false}
            >
              {course.title}
            </Link>
          ))}
        </nav>
      ) : (
        <div className="empty">还没有课程。先创建一门课程并发布课件，学情会随之产生。</div>
      )}

      {data ? (
        <>
          <div className="grid grid--4">
            <div className="stat">
              <div className="stat__label">选课人数</div>
              <div className="stat__value">{data.studentCount}</div>
              <div className="stat__hint">课件 {data.coursewareCount} 份</div>
            </div>
            <div className="stat">
              <div className="stat__label">译文命中率</div>
              <div className="stat__value">{data.translationHitRate}%</div>
              <div className="stat__hint">共查表 {data.translationChecks} 次</div>
            </div>
            <div className="stat">
              <div className="stat__label">收录术语</div>
              <div className="stat__value">{data.totalWordsAdded}</div>
              <div className="stat__hint">班级累计</div>
            </div>
            <div className="stat">
              <div className="stat__label">未掌握</div>
              <div className="stat__value">{data.unmasteredWords}</div>
              <div className="stat__hint">掌握度低于「能译」</div>
            </div>
          </div>

          <section className="section">
            <div className="section__head">
              <h2 className="section__title">学生明细</h2>
              <span className="section__hint">按阅读活跃度排序</span>
            </div>
            <div className="card card--flush" style={{ overflowX: 'auto' }}>
              <table className="ln-table">
                <thead>
                  <tr>
                    <th>学生</th>
                    <th className="num">笔记保存</th>
                    <th className="num">术语点击</th>
                    <th className="num">收录词</th>
                    <th className="num">讨论回复</th>
                    <th className="num">译文命中</th>
                    <th>最近活跃</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((student) => (
                    <tr key={student.studentId}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{student.name}</div>
                        <div className="ln-hint">学号 {student.studentNo}</div>
                      </td>
                      <td className="num">{student.noteSaves}</td>
                      <td className="num">{student.termClicks}</td>
                      <td className="num">{student.wordsAdded}</td>
                      <td className="num">{student.forumReplies}</td>
                      <td className="num">{student.translationHitRate}%</td>
                      <td className="muted">{formatDate(student.lastActiveAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ln-hint" style={{ marginTop: 10 }}>
              样本说明：译文命中率 = 命中预置译文的查表次数 ÷ 总查表次数，反映课件句子与译文库的覆盖度，不衡量学生水平。
            </p>
          </section>

          <div className="grid grid--2" style={{ marginTop: 30 }}>
            <section>
              <div className="section__head">
                <h2 className="section__title">术语热度</h2>
                <span className="section__hint">点击次数</span>
              </div>
              <div className="card" style={{ marginTop: 12 }}>
                {data.termHeat.length ? (
                  <Bars rows={data.termHeat.map((term) => ({ label: term.term, value: term.clicks }))} accent />
                ) : (
                  <p className="ln-hint">还没有术语点击记录。学生在阅读态点开术语后，这里会出现排行。</p>
                )}
              </div>
            </section>

            <section>
              <div className="section__head">
                <h2 className="section__title">近六周活跃</h2>
                <span className="section__hint">笔记 / 术语点击</span>
              </div>
              <div className="card" style={{ marginTop: 12 }}>
                {data.weekly.length ? (
                  <div className="week">
                    {data.weekly.map((week) => (
                      <div className="week__col" key={week.week}>
                        <div className="week__stack">
                          <span
                            className="week__bar week__bar--alt"
                            style={{ height: `${(week.noteSaves / weekMax) * 100}%` }}
                            title={`笔记 ${week.noteSaves}`}
                          />
                          <span
                            className="week__bar"
                            style={{ height: `${(week.termClicks / weekMax) * 100}%` }}
                            title={`术语点击 ${week.termClicks}`}
                          />
                        </div>
                        <span className="week__label">{week.week.slice(-2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ln-hint">近六周没有活跃记录。</p>
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
