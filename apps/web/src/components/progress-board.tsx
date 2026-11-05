import { formatTopicDate } from '@/server/content/plan';
import type { CourseProgress } from '@/server/modules/teaching-progress';

/**
 * 教学进度板：每个教学班一张卡。
 * 两条轴——上面是学期周（16 周走到哪），下面是专题轨道（八讲讲到哪），
 * 数字与图形各说一层，不做纯装饰。
 */
export function ProgressBoard({ items }: { items: CourseProgress[] }) {
  return (
    <div className="progboard">
      {items.map((item) => {
        const inSession = item.marks.some((mark) => mark.state === 'now');
        const weekPercent = item.totalWeeks ? Math.round((item.week / item.totalWeeks) * 100) : 0;
        const label = item.currentNo ? (inSession ? '本次课' : '下一讲') : '已结课';

        return (
          <article className="prog" key={item.courseId}>
            <header className="prog__head">
              <h3 className="prog__class">{item.className ?? item.courseTitle}</h3>
              {item.code ? <span className="prog__code tnum">{item.code}</span> : null}
            </header>
            <p className="prog__meta">{item.meets ?? '未标注上课时间'}</p>

            <div className="prog__figure">
              <span className="prog__pct">
                {item.percent}
                <i>%</i>
              </span>
              <span className="prog__facts">
                <span className="prog__week">
                  第 {item.week} 周 <i>/ 共 {item.totalWeeks} 周</i>
                </span>
                <span className="prog__count">
                  已讲 <b>{item.done}</b> / {item.total} 讲
                </span>
              </span>
            </div>

            <div
              className="prog__rail"
              role="img"
              aria-label={`学期进度：第 ${item.week} 周，共 ${item.totalWeeks} 周`}
            >
              <span className="prog__rail-fill" style={{ transform: `scaleX(${weekPercent / 100})` }} />
            </div>
            <div className="prog__scale" aria-hidden="true">
              <span>第 1 周</span>
              <span>第 {item.totalWeeks} 周</span>
            </div>

            <ol className="prog__track" aria-label="专题进度">
              {item.marks.map((mark) => (
                <li
                  key={mark.no}
                  className={`prog__stop prog__stop--${mark.state}`}
                  title={`${mark.no}. ${mark.title}${mark.date ? ` · ${formatTopicDate(mark.date)}` : ''}`}
                >
                  <span className="prog__dot" aria-hidden="true" />
                  <span className="prog__stop-no">{mark.no}</span>
                  <span className="sr-only">{mark.title}</span>
                </li>
              ))}
            </ol>

            <p className="prog__next">
              <span className="prog__tag">{label}</span>
              {item.currentNo ? (
                <>
                  <b>
                    {item.currentNo}. {item.currentTitle}
                  </b>
                  {item.currentDate ? <span className="prog__when">{formatTopicDate(item.currentDate)}</span> : null}
                </>
              ) : (
                <span className="prog__when">{item.total} 讲已全部讲完。</span>
              )}
            </p>
          </article>
        );
      })}
    </div>
  );
}
