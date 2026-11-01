'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';

/** 大学正常的学期序列：每学年秋季在前、春季在后，秋季学期跨年 */
const TERMS = (() => {
  const now = new Date();
  // 9 月以后算新学年的秋季；否则仍在上一学年里
  const startYear = now.getMonth() + 1 >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  const list: string[] = [];
  for (let offset = -1; offset <= 1; offset += 1) {
    const year = startYear + offset;
    list.push(`${year} 秋季学期`, `${year + 1} 春季学期`);
  }
  return list;
})();

const DEFAULT_TERM = (() => {
  const now = new Date();
  const month = now.getMonth() + 1;
  // 2–7 月属春季学期，其余归秋季学期
  return month >= 2 && month <= 7
    ? `${now.getFullYear()} 春季学期`
    : `${month >= 9 ? now.getFullYear() : now.getFullYear() - 1} 秋季学期`;
})();

interface ClassOption {
  id: string;
  name: string;
  /** 班内人数：列表按人数从多到少排，默认落在正在带的那个班 */
  members: number;
}

/**
 * 新建课程。
 *
 * 班级只在「班级」页创设一处——这里只从已有班级里挑一个挂上去，
 * 免得同一件事有两个入口（一边填班名生成班级码、一边单独创设班级）。
 */
export function NewCourse({ classes = [] }: { classes?: ClassOption[] }) {
  const router = useRouter();
  // 班级列表按班级库的默认顺序（建得晚的在前），这里按人数重排：
  // 正在带的班排在前面，空班（建了还没加人）落到最后
  const ordered = [...classes].sort((a, b) => b.members - a.members);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState(ordered[0]?.id ?? '');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  // 打开时聚焦课程名称，Esc 关闭（与 Word 一样，弹窗只挡一层）
  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/courses', {
        method: 'POST',
        body: JSON.stringify({ title, term, classId: classId || null }),
      });
      setTitle('');
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="ln-btn ln-btn--outline ln-btn--sm" onClick={() => setOpen(true)}>
        新建课程
      </button>

      {open ? (
        <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="new-course-title">
            <div className="modal__head">
              <h2 className="modal__title" id="new-course-title">
                新建课程
              </h2>
              <button type="button" className="modal__close" onClick={close} aria-label="关闭">
                ×
              </button>
            </div>

            <form onSubmit={submit} className="modal__body">
              <div className="ln-field">
                <label className="ln-label" htmlFor="nc-title">
                  课程名称
                </label>
                <input
                  id="nc-title"
                  ref={titleRef}
                  className="ln-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：法律英语"
                  required
                />
              </div>

              <div className="ln-field">
                <label className="ln-label" htmlFor="nc-class">
                  授课班级
                </label>
                {ordered.length ? (
                  <select
                    id="nc-class"
                    className="ln-select"
                    value={classId}
                    onChange={(event) => setClassId(event.target.value)}
                    required
                  >
                    {ordered.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="ln-hint" style={{ margin: 0 }}>
                    还没有班级。先到「班级」页创设一个班，拿到班级码，再回来建课。
                    <br />
                    <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/classes" style={{ marginTop: 10 }}>
                      去创设班级
                    </Link>
                  </p>
                )}
                {ordered.length ? (
                  <span className="ln-hint">挂到班上任课，班内学生自动选修；换班或新建班级请到「班级」页。</span>
                ) : null}
              </div>

              <div className="ln-field">
                <label className="ln-label" htmlFor="nc-term">
                  授课学期
                </label>
                <select
                  id="nc-term"
                  className="ln-select"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                >
                  {TERMS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {error ? <div className="notice notice--error">{error}</div> : null}

              <div className="modal__actions">
                <button
                  className="ln-btn ln-btn--primary ln-btn--sm"
                  type="submit"
                  disabled={busy || title.trim().length < 2 || !classId}
                >
                  {busy ? '创建中…' : '创建'}
                </button>
                <button className="ln-btn ln-btn--quiet ln-btn--sm" type="button" onClick={close} disabled={busy}>
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
