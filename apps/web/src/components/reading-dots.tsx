'use client';

import { useEffect, useState } from 'react';

export interface ReadingDot {
  id: string;
  label: string;
}

/**
 * 书单右侧的点状目录。
 *
 * 推荐阅读是七八个分组铺下来的一长页，滚到中段就不知道自己在哪一组。
 * 这里只在宽屏露一条竖排的圆点：点一下跳到该组，滚动时高亮当前所处的一组，
 * 鼠标停住才显示分组名——平时不占版面，也不和正文抢注意力。
 */
export function ReadingDots({ items }: { items: ReadingDot[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');
  const key = items.map((item) => item.id).join('|');

  useEffect(() => {
    const targets = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;
    const first = targets[0];
    if (!first) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      // 视口上沿往下留出一条：窄屏顶部是吸顶的三行头部
      const line = window.innerWidth <= 860 ? 132 : 40;
      let current = first.id;
      for (const el of targets) {
        if (el.getBoundingClientRect().top - line <= 0) current = el.id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [key]);

  if (!items.length) return null;

  return (
    <nav className="readdots" aria-label="书单分组">
      {items.map((item) => {
        const on = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            className={`readdots__dot${on ? ' readdots__dot--on' : ''}`}
            onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label={item.label}
            aria-current={on ? 'true' : undefined}
          >
            <span className="readdots__tip" aria-hidden="true">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
