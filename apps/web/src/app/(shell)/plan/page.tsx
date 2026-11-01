import Link from 'next/link';
import { requirePageUser } from '@/lib/session';
import { getCoursePlan, TOPIC_KIND_LABEL } from '@/server/content/plan';
import { readings } from '@/server/content/readings';
import { ReadingShelf } from '@/components/reading-shelf';

export const dynamic = 'force-dynamic';
export const metadata = { title: '课程安排 · LexiNote' };

export default async function PlanPage() {
  const user = await requirePageUser();
  const { plan, source } = getCoursePlan();
  const { course, topics } = plan;

  const caseCount = topics.reduce((sum, topic) => sum + topic.cases.length, 0);
  const lectureCount = topics.filter((topic) => topic.kind === 'LECTURE').length;

  const facts: { label: string; value: React.ReactNode }[] = [];
  const addFact = (label: string, value: React.ReactNode | null | undefined | '') => {
    if (value === null || value === undefined || value === '') return;
    facts.push({ label, value });
  };

  addFact('课程', course.alias ? `${course.title}（${course.alias}）` : course.title);
  addFact('学期', course.term);
  addFact('任课教师', course.teacher);
  addFact('上课周次', course.weeks);
  addFact('上课地点', course.room);
  addFact('授课方式', course.mode);
  addFact(
    '课程代码',
    course.programs.length ? (
      <span className="facts__codes">
        {course.programs.map((program) => (
          <span className="facts__code" key={program.code}>
            <span className="facts__code-name">{program.name}</span>
            <code>{program.code}</code>
          </span>
        ))}
      </span>
    ) : null,
  );

  return (
    <div className="wrap wrap--wide">
      <header className="head">
        <div>
          {course.term ? <span className="course__term">{course.term}</span> : null}
          <h1 className="head__title" style={{ marginTop: 6 }}>
            课程安排
          </h1>
          <p className="head__sub" style={{ maxWidth: '62ch' }}>
            {user.role === 'TEACHER'
              ? `本学期 ${topics.length} 个专题与配套案例。课件、讨论与作业都按这条线索挂在课程下。`
              : `先看本学期的专题顺序与每个专题要读的案子，再回课件里精读。案例可在讨论区提问。`}
          </p>
        </div>
        <div className="head__actions">
          <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/">
            回到课程
          </Link>
        </div>
      </header>

      <div className="plan">
        <div className="plan__main">
          <section className="section">
            <div className="section__head">
              <h2 className="section__title">课程信息</h2>
              <span className="section__hint">两个教学班同一份安排</span>
            </div>
            <dl className="facts">
              {facts.map((fact) => (
                <div className="facts__row" key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
            {course.note ? <p className="facts__note">{course.note}</p> : null}
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="section__title">专题与案例</h2>
              <span className="section__hint">
                {topics.length} 个专题 · 其中 {lectureCount} 个讲授 · {caseCount} 个案例
              </span>
            </div>

            <ol className="topics">
              {topics.map((topic) => (
                <li className="topic" key={topic.no}>
                  <span className="topic__no">{String(topic.no).padStart(2, '0')}</span>
                  <div className="topic__body">
                    <div className="topic__head">
                      <h3 className="topic__title">{topic.title}</h3>
                      {topic.titleZh ? <span className="topic__zh">{topic.titleZh}</span> : null}
                      <span
                        className={`ln-badge${topic.kind === 'LECTURE' ? ' ln-badge--required' : ' ln-badge--quiet'}`}
                      >
                        {TOPIC_KIND_LABEL[topic.kind]}
                      </span>
                    </div>
                    {topic.summary ? <p className="topic__summary">{topic.summary}</p> : null}
                    {topic.cases.length ? (
                      <ul className="topic__cases">
                        {topic.cases.map((item) => (
                          <li key={item.name}>
                            <span className="topic__case">{item.name}</span>
                            {item.citation ? <em className="topic__cite">{item.citation}</em> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="topic__summary">案例待定。</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {plan.note ? <p className="facts__note">{plan.note}</p> : null}
            {source === 'example' ? (
              <p className="ln-hint" style={{ marginTop: 10 }}>
                当前显示的是仓库自带的示例安排。把本学期的课程信息与专题写入本机
                <code> data/course-plan.local.json </code>后刷新，即替换为真实安排（该文件不进仓库）。
              </p>
            ) : null}
          </section>
        </div>

        <aside className="plan__aside">
          <ReadingShelf books={readings} />
        </aside>
      </div>
    </div>
  );
}
