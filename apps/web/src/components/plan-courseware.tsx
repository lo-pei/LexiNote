'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

export interface CoursewareOption {
  id: string;
  name: string;
  summary?: string;
  count: number;
}

/**
 * 选择本学期用哪一套授课课件。
 *
 * 每套课件自带一份专题表，选定后整页的专题与案例一起换掉；
 * 选择结果存在服务端，学生端看到的就是教师选定的那一套。
 */
export function PlanCourseware({ options, activeId }: { options: CoursewareOption[]; activeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (id: string) => {
    if (id === activeId || busy) return;
    setBusy(id);
    setError(null);
    try {
      await api('/api/plan/courseware', { method: 'POST', body: JSON.stringify({ coursewareId: id }) });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="cw-pick">
      <div className="cw-pick__list" role="radiogroup" aria-label="授课课件">
        {options.map((item) => {
          const on = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`cw-pick__item${on ? ' is-on' : ''}`}
              onClick={() => void pick(item.id)}
              disabled={Boolean(busy)}
            >
              <span className="cw-pick__top">
                <span className="cw-pick__name">{item.name}</span>
                <span className="cw-pick__count tnum">{item.count} 个专题</span>
              </span>
              {item.summary ? <span className="cw-pick__sum">{item.summary}</span> : null}
              <span className="cw-pick__flag">{busy === item.id ? '切换中…' : on ? '当前使用' : '改用这套'}</span>
            </button>
          );
        })}
      </div>
      <p className="ln-hint">
        换一套课件后，下面的专题与案例会整份替换；学生端看到的也是当前这一套。要再加一套，往{' '}
        <code>data/course-plan.local.json</code> 的 <code>coursewares</code> 里追加一项即可。
      </p>
      {error ? <div className="notice notice--error">{error}</div> : null}
    </div>
  );
}
