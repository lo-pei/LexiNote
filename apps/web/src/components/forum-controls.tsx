'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

export interface CourseOption {
  id: string;
  title: string;
}

/* ── 发起讨论 / 布置作业 ────────────────────────────────── */

export function NewTopic({ courses, isTeacher }: { courses: CourseOption[]; isTeacher: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [type, setType] = useState<'QUESTION' | 'ASSIGNMENT'>('QUESTION');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: string }>('/api/forum/topics', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          type,
          title,
          body,
          dueAt: type === 'ASSIGNMENT' && dueAt ? new Date(`${dueAt}T23:00:00`).toISOString() : null,
        }),
      });
      router.push(`/forum/${created.id}`);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="ln-btn ln-btn--primary ln-btn--sm" onClick={() => setOpen(true)}>
        {isTeacher ? '布置作业 / 发起讨论' : '提问'}
      </button>
    );
  }

  return (
    <form className="card" style={{ display: 'grid', gap: 12, width: '100%', marginBottom: 24 }} onSubmit={submit}>
      <div className="grid grid--3">
        <div className="ln-field">
          <label className="ln-label" htmlFor="topic-course">
            课程
          </label>
          <select
            id="topic-course"
            className="ln-select"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
        <div className="ln-field">
          <label className="ln-label" htmlFor="topic-type">
            类型
          </label>
          <select
            id="topic-type"
            className="ln-select"
            value={type}
            onChange={(event) => setType(event.target.value as 'QUESTION' | 'ASSIGNMENT')}
          >
            <option value="QUESTION">课堂提问</option>
            {isTeacher ? <option value="ASSIGNMENT">作业</option> : null}
          </select>
        </div>
        {type === 'ASSIGNMENT' ? (
          <div className="ln-field">
            <label className="ln-label" htmlFor="topic-due">
              截止日期
            </label>
            <input
              id="topic-due"
              className="ln-input"
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div className="ln-field">
        <label className="ln-label" htmlFor="topic-title">
          标题
        </label>
        <input
          id="topic-title"
          className="ln-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：Carlill 案里，「存款」是构成要件还是证据？"
          required
        />
      </div>

      <div className="ln-field">
        <label className="ln-label" htmlFor="topic-body">
          内容
        </label>
        <textarea
          id="topic-body"
          className="ln-textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
        />
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ln-btn ln-btn--primary ln-btn--sm" type="submit" disabled={busy}>
          {busy ? '发布中…' : '发布'}
        </button>
        <button className="ln-btn ln-btn--quiet ln-btn--sm" type="button" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>
    </form>
  );
}

/* ── 回复 ───────────────────────────────────────────────── */

export function ReplyForm({ topicId, disabled }: { topicId: string; disabled?: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return <div className="notice">你在这个主题下没有回复权限。</div>;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/forum/topics/${topicId}`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      setBody('');
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="compose" onSubmit={submit}>
      <textarea
        className="ln-textarea"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="写下你的判断，并指出依据在判决书的哪一段……"
        aria-label="回复内容"
      />
      {error ? <div className="notice notice--error">{error}</div> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="ln-btn ln-btn--primary ln-btn--sm" type="submit" disabled={busy || !body.trim()}>
          {busy ? '提交中…' : '提交回复'}
        </button>
        <span className="ln-hint">回复会同时计入你的学情记录。</span>
      </div>
    </form>
  );
}

/* ── 教师批注 ───────────────────────────────────────────── */

export function AnnotationForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api('/api/annotations', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'POST', targetId: postId, content: content.trim() }),
      });
      setContent('');
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
      <button type="button" className="ln-btn ln-btn--quiet ln-btn--sm" onClick={() => setOpen(true)}>
        写批注
      </button>
    );
  }

  return (
    <form className="annotation-form" onSubmit={submit}>
      <textarea
        className="ln-textarea"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="只给学生看的批注：指出问题、给一句改法，或标注可继续追问的点。"
        aria-label="批注内容"
        autoFocus
      />
      {error ? <div className="notice notice--error">{error}</div> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ln-btn ln-btn--primary ln-btn--sm" type="submit" disabled={busy || !content.trim()}>
          {busy ? '提交中…' : '添加批注'}
        </button>
        <button className="ln-btn ln-btn--quiet ln-btn--sm" type="button" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>
    </form>
  );
}

/* ── 教师评分与参考答案 ─────────────────────────────────── */

export function GradeForm({ postId, score, isAnswer }: { postId: string; score: number | null; isAnswer: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(score === null ? '' : String(score));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (markAnswer: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/posts/${postId}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          isAnswer: markAnswer,
          score: value === '' ? null : Number(value),
        }),
      });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      <input
        className="ln-input"
        style={{ width: 76, height: 28, fontSize: 12.5 }}
        value={value}
        onChange={(event) => setValue(event.target.value.replace(/[^\d]/g, '').slice(0, 3))}
        placeholder="分数"
        aria-label="分数"
      />
      <button
        type="button"
        className="ln-btn ln-btn--outline ln-btn--sm"
        onClick={() => void submit(isAnswer)}
        disabled={busy}
      >
        {isAnswer ? '更新成绩' : '评分'}
      </button>
      {!isAnswer ? (
        <button
          type="button"
          className="ln-btn ln-btn--quiet ln-btn--sm"
          onClick={() => void submit(true)}
          disabled={busy}
        >
          设为参考答案
        </button>
      ) : (
        <span className="ln-badge ln-badge--required">参考答案 {score ?? '—'} 分</span>
      )}
      {error ? <span className="ln-hint" style={{ color: 'var(--accent-ink)' }}>{error}</span> : null}
    </div>
  );
}
