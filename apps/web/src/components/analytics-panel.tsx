import type { AnalyticsOverview } from '@ln/types';
import { AiDigestCard } from './ai-digest-card';

/**
 * 学情面板。
 *
 * 它搬过两次家：先是独立一页，后来并入班级页，现在随班级一起进了课程页。
 * 课程按班开，所以课程页本身就带着班与班的名单，这里只负责把数据画出来，
 * 不再自己判断「看哪个班」。
 */
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

export function AnalyticsPanel({ data, hint }: { data: AnalyticsOverview; hint?: string }) {
  const weekMax = Math.max(1, ...data.weekly.map((w) => w.noteSaves + w.termClicks));
  // 只有两三周数据时柱子会被拉到整列宽度，看着像两幢孤楼；
  // 补空列把横轴补满六格，柱宽与间距才稳定。
  const weekly = [...data.weekly];
  while (weekly.length && weekly.length < 6) {
    weekly.unshift({ week: '', noteSaves: 0, termClicks: 0 });
  }

  return (
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

      {hint ? (
        <p className="ln-hint" style={{ marginTop: 12 }}>
          {hint}
        </p>
      ) : null}

      {/* 未配置模型时该组件自身不渲染，这里不必判断 */}
      <AiDigestCard courseId={data.courseId} />

      {/* 逐人明细并进了下方「教学班 · 成员名单」那一张表：
          同一页不再有两份学生清单，也就不用上下比对。 */}
      <p className="ln-hint" style={{ marginTop: 14 }}>
        逐人的笔记、术语点击、收录词与讨论回复见下方「教学班」一栏的成员名单（按学号排列，表头吸顶）。
      </p>

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
                {weekly.map((week, index) => (
                  <div className="week__col" key={week.week || `blank-${index}`}>
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
                    <span className="week__label">{week.week ? week.week.slice(-2) : ''}</span>
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
  );
}
