'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
import { CopyButton } from '@/components/class-controls';

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

interface CreatedCourse {
  title: string;
  joinCode: string | null;
}

/**
 * 新建课程。
 *
 * 授课班级有两种填法：挂到已经创设的班上，或直接填班名当场建一个。
 * 后者由服务端发班级码，教师不必先跑一趟「班级」页；同一个班名不会被重复建，
 * 已存在则直接挂上去，避免同一个班出现两个班号、学生分流。
 */
export function NewCourse({ classes = [] }: { classes?: ClassOption[] }) {
  const router = useRouter();
  // 班级列表按班级库的默认顺序（建得晚的在前），这里按人数重排：
  // 正在带的班排在前面，空班（建了还没加人）落到最后
  const ordered = [...classes].sort((a, b) => b.members - a.members);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>(ordered.length ? 'existing' : 'new');
  const [classId, setClassId] = useState(ordered[0]?.id ?? '');
  const [className, setClassName] = useState('');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedCourse | null>(null);

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
    setCreated(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ classId: string | null; className: string | null; joinCode?: string | null }>(
        '/api/courses',
        {
          method: 'POST',
          body: JSON.stringify(
            mode === 'existing'
              ? { title, term, classId: classId || null }
              : { title, term, className: className.trim() },
          ),
        },
      );
      setTitle('');
      setClassName('');
      router.refresh();
      // 建了班就留在弹窗里把班级码交代清楚，否则直接收工
      if (result.classId) {
        setCreated({ title: result.className ?? className.trim(), joinCode: result.joinCode ?? null });
      } else {
        setOpen(false);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    title.trim().length >= 2 && (mode === 'existing' ? Boolean(classId) : className.trim().length >= 2);

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
                {created ? '课程已创建' : '新建课程'}
              </h2>
              <button type="button" className="modal__close" onClick={close} aria-label="关闭">
                ×
              </button>
            </div>

            {created ? (
              <div className="modal__body">
                <p className="ln-hint" style={{ marginTop: 0 }}>
                  「{created.title}」已建好
                  {created.joinCode ? '，任课班同时创设。把班级码发给学生，他们输入后即自动选修本课。' : '。'}
                </p>
                {created.joinCode ? (
                  <div className="code-row">
                    <span className="code-big">{created.joinCode}</span>
                    <CopyButton value={created.joinCode} label="复制班级码" />
                  </div>
                ) : null}
                <p className="ln-hint">班级码随时可在「班级」页重置，班级成员与邀请链接也在那里管理。</p>
                <div className="modal__actions">
                  <button className="ln-btn ln-btn--primary ln-btn--sm" type="button" onClick={close}>
                    知道了
                  </button>
                </div>
              </div>
            ) : (
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

                  <div className="seg" role="group" aria-label="授课班级填法">
                    {ordered.length ? (
                      <button
                        type="button"
                        className={`seg__item${mode === 'existing' ? ' is-on' : ''}`}
                        aria-pressed={mode === 'existing'}
                        onClick={() => setMode('existing')}
                      >
                        选已有班级
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`seg__item${mode === 'new' ? ' is-on' : ''}`}
                      aria-pressed={mode === 'new'}
                      onClick={() => setMode('new')}
                    >
                      自填班级名
                    </button>
                  </div>

                  {mode === 'existing' ? (
                    <select
                      id="nc-class"
                      className="ln-select"
                      value={classId}
                      onChange={(event) => setClassId(event.target.value)}
                    >
                      {ordered.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}（{item.members} 人）
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="nc-class"
                      className="ln-input"
                      value={className}
                      onChange={(event) => setClassName(event.target.value)}
                      placeholder="例如：法学 2301 班"
                      maxLength={60}
                    />
                  )}

                  <span className="ln-hint">
                    {mode === 'existing'
                      ? '挂到班上任课，班内学生自动选修。'
                      : '填班名即可，系统会生成 6 位班级码；同名班级已存在时直接挂上去，不会重复建班。'}
                  </span>
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
                  <button className="ln-btn ln-btn--primary ln-btn--sm" type="submit" disabled={busy || !canSubmit}>
                    {busy ? '创建中…' : '创建'}
                  </button>
                  <button className="ln-btn ln-btn--quiet ln-btn--sm" type="button" onClick={close} disabled={busy}>
                    取消
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
