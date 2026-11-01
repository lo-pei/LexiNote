'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

export function NewClass() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [term, setTerm] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: string }>('/api/classes', {
        method: 'POST',
        body: JSON.stringify({
          name,
          term: term || undefined,
          description: description || undefined,
        }),
      });
      router.push(`/classes/${created.id}`);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="ln-btn ln-btn--primary ln-btn--sm" onClick={() => setOpen(true)}>
        创设班级
      </button>
    );
  }

  return (
    <form className="card" style={{ display: 'grid', gap: 12, width: '100%', marginBottom: 22 }} onSubmit={submit}>
      <div className="grid grid--2">
        <div className="ln-field">
          <label className="ln-label" htmlFor="class-name">
            班级名称
          </label>
          <input
            id="class-name"
            className="ln-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：法学 2103 · 合同法精读"
            required
          />
        </div>
        <div className="ln-field">
          <label className="ln-label" htmlFor="class-term">
            学期
          </label>
          <input
            id="class-term"
            className="ln-input"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="2026 秋季学期"
          />
        </div>
      </div>
      <div className="ln-field">
        <label className="ln-label" htmlFor="class-desc">
          上课时间与说明
        </label>
        <textarea
          id="class-desc"
          className="ln-textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="周三 3–4 节，文科楼 402。课件与作业都在这里。"
        />
      </div>
      {error ? <div className="notice notice--error">{error}</div> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ln-btn ln-btn--primary ln-btn--sm" type="submit" disabled={busy || name.trim().length < 2}>
          {busy ? '创建中…' : '创建并生成班级码'}
        </button>
        <button className="ln-btn ln-btn--quiet ln-btn--sm" type="button" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>
    </form>
  );
}
