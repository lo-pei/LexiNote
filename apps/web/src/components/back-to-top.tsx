'use client';

import { useEffect, useState } from 'react';

/** 右侧回到顶部：滚过一屏高度才出现，点击平滑回到页首 */
export function BackToTop() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const onScroll = () => setOn(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      className={on ? 'to-top to-top--on' : 'to-top'}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="回到顶部"
      tabIndex={on ? 0 : -1}
      aria-hidden={on ? undefined : true}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
        <path d="M7 11.5V2.9M7 2.9 3.1 6.8M7 2.9l3.9 3.9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
