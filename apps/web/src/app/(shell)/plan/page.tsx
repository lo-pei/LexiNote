import { requirePageUser } from '@/lib/session';
import { listClasses } from '@/server/modules/classes';
import { getActivePlan } from '@/server/modules/teaching-plan';
import {
  formatTopicDate,
  shiftToWeekday,
  todayISO,
  TOPIC_KIND_LABEL,
  TOPIC_STATE_LABEL,
  topicState,
  type PlanProgram,
} from '@/server/content/plan';
import { PlanCourseware } from '@/components/plan-courseware';

export const dynamic = 'force-dynamic';
export const metadata = { title: '课程安排 · LexiNote' };

/** 本班在专题表里的锚点：只有匹配上班级名，才会把日期换算成这个班的上课日 */
function pickProgram(programs: PlanProgram[], classNames: string[]): PlanProgram | null {
  if (!programs.length) return null;
  const hit = programs.find((item) => item.className && classNames.includes(item.className));
  return hit ?? null;
}

export default async function PlanPage() {
  const user = await requirePageUser();
  const { course, coursewares, activeId, topics: activeTopics, note, source } = getActivePlan();
  const today = todayISO();
  const canPick = user.role !== 'STUDENT';

  // 学生只归属一个教学班，看到的课程代码、上课时间与日期都按本班算；
  // 教师与管理员看全部班级的对照信息
  const myClassNames = listClasses(user).map((item) => item.name);
  const mine = user.role === 'STUDENT' ? pickProgram(course.programs, myClassNames) : null;
  const visiblePrograms = mine ? [mine] : course.programs;

  const topics = activeTopics.map((topic) => ({
    ...topic,
    date: mine ? shiftToWeekday(topic.date, mine.weekday) : topic.date,
  }));

  const active = coursewares.find((item) => item.id === activeId) ?? coursewares[0];

  const caseCount = topics.reduce((sum, topic) => sum + topic.cases.length, 0);
  const lectureCount = topics.filter((topic) => topic.kind === 'LECTURE').length;
  const readingCount = topics.length - lectureCount;
  const doneCount = topics.filter((topic) => topicState(topic.date, today) === 'done').length;

  const facts: { label: string; value: React.ReactNode }[] = [];
  const addFact = (label: string, value: React.ReactNode | null | undefined | '') => {
    if (value === null || value === undefined || value === '') return;
    facts.push({ label, value });
  };

  addFact('课程', course.alias ? `${course.title}（${course.alias}）` : course.title);
  addFact('学期', course.term);
  addFact('任课教师', course.teacher);
  addFact('上课周次', course.weeks);
  addFact('上课地点', mine?.meets ?? course.room);
  addFact(
    '课程代码',
    visiblePrograms.length ? (
      <span className="facts__codes">
        {visiblePrograms.map((program) => (
          <span className="facts__code" key={program.code}>
            <span className="facts__code-name">
              {program.name}
              {program.meets ? <em className="facts__meets">{program.meets}</em> : null}
            </span>
            <code>{program.code}</code>
          </span>
        ))}
      </span>
    ) : null,
  );
  // 学生没有选择权，但要知道这学期按哪套课件上
  addFact('授课课件', mine && active ? active.name : null);

  return (
    <div className="wrap wrap--wide">
      <header className="head">
        <div>
          {course.term ? <span className="course__term">{course.term}</span> : null}
          <h1 className="head__title" style={{ marginTop: 6 }}>
            课程安排
          </h1>
          {mine ? <p className="head__sub">{mine.className}</p> : null}
        </div>
      </header>

      <div className="plan">
        <div className="plan__main">
          {canPick && coursewares.length > 1 ? (
            <section className="section">
              <div className="section__head">
                <h2 className="section__title">授课课件</h2>
                <span className="section__hint">{coursewares.length} 套可选</span>
              </div>
              <PlanCourseware
                options={coursewares.map((item) => ({
                  id: item.id,
                  name: item.name,
                  summary: item.summary,
                  count: item.topics.length,
                }))}
                activeId={activeId}
              />
            </section>
          ) : null}

          <section className="section">
            <div className="section__head">
              <h2 className="section__title">课程信息</h2>
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
                {topics.length} 个专题 · 讲授 {lectureCount} 个 · 延伸阅读 {readingCount} 个 ·{' '}
                {caseCount} 个案例 · 已讲完 {doneCount} 个
              </span>
            </div>

            <ol className="topics">
              {topics.map((topic) => {
                const state = topicState(topic.date, today);
                const dateLabel = formatTopicDate(topic.date);
                return (
                  <li
                    className={`topic${state === 'upcoming' ? ' topic--upcoming' : ''}`}
                    key={topic.no}
                    id={`topic-${topic.no}`}
                  >
                    <span className="topic__no">{String(topic.no).padStart(2, '0')}</span>
                    <div className="topic__body">
                      <div className="topic__meta">
                        {dateLabel ? <span className="topic__date tnum">{dateLabel}</span> : null}
                        {topic.week ? <span className="topic__week">{topic.week}</span> : null}
                        {state ? (
                          <span className={`topic__state topic__state--${state}`}>
                            {TOPIC_STATE_LABEL[state]}
                          </span>
                        ) : null}
                        <span
                          className={`ln-badge${topic.kind === 'LECTURE' ? ' ln-badge--required' : ' ln-badge--quiet'}`}
                        >
                          {TOPIC_KIND_LABEL[topic.kind]}
                        </span>
                      </div>
                      <div className="topic__head">
                        <h3 className="topic__title">{topic.title}</h3>
                        {topic.titleZh ? <span className="topic__zh">{topic.titleZh}</span> : null}
                      </div>
                      {topic.summary ? <p className="topic__summary">{topic.summary}</p> : null}
                      {topic.cases.length ? (
                        <ul className="topic__cases">
                          {topic.cases.map((item) => (
                            <li key={item.name}>
                              <span className="topic__case">{item.name}</span>
                              {item.citation ? <span className="topic__cite">{item.citation}</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="topic__summary">案例待定。</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {note ? <p className="facts__note">{note}</p> : null}
            {source === 'example' ? (
              <p className="ln-hint" style={{ marginTop: 10 }}>
                当前显示的是仓库自带的示例安排。把本学期的课程信息与课件写入本机
                <code> data/course-plan.local.json </code>后刷新，即替换为真实安排（该文件不进仓库）。
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
