'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

interface ClassOption {
  id: string;
  name: string;
}

/** 新建课程（教师）：不弹窗，直接在页面上落一行表单，减少一次界面跳转。 */
export function NewCourse({ classes = [] }: { classes?: ClassOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [term, setTerm] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/courses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          term: term || undefined,
          description: description || undefined,
          classId: classId || null,
        }),
      });
      setTitle('');
      setTerm('');
      setDescription('');
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="ln-btn ln-btn--outline ln-btn--sm" onClick={() => setOpen(true)}>
        新建课程
      </button>
    );
  }

  return (
    <form className="card" style={{ display: 'grid', gap: 12, width: '100%', marginBottom: 20 }} onSubmit={submit}>
      <div className="grid grid--2">
        <div className="ln-field">
          <label className="ln-label" htmlFor="course-title">
            课程名称
          </label>
          <input
            id="course-title"
            className="ln-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：法律英语精读 · 侵权法"
            required
          />
        </div>
        <div className="ln-field">
          <label className="ln-label" htmlFor="course-term">
            学期与课号
          </label>
          <input
            id="course-term"
            className="ln-input"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="2027 春季学期 · LAW 3211"
          />
        </div>
      </div>
      <div className="ln-field">
        <label className="ln-label" htmlFor="course-class">
          归属班级
        </label>
        <select
          id="course-class"
          className="ln-select"
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
        >
          <option value="">不归属班级（公开选修）</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <span className="ln-hint">挂到班级后，班内学生自动选修；不挂班的课程任何学生都能选。</span>
      </div>
      <div className="ln-field">
        <label className="ln-label" htmlFor="course-desc">
          课程说明
        </label>
        <textarea
          id="course-desc"
          className="ln-textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="一句话说明读本与训练目标。"
        />
      </div>
      {error ? <div className="notice notice--error">{error}</div> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ln-btn ln-btn--primary ln-btn--sm" type="submit" disabled={busy || title.trim().length < 2}>
          {busy ? '创建中…' : '创建'}
        </button>
        <button className="ln-btn ln-btn--quiet ln-btn--sm" type="button" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>
    </form>
  );
}
