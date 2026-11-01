'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

export function NewCourseware({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: string }>('/api/documents', {
        method: 'POST',
        body: JSON.stringify({ title, kind: 'COURSEWARE', courseId }),
      });
      router.push(`/docs/${created.id}`);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="ln-btn ln-btn--primary ln-btn--sm" onClick={() => setOpen(true)}>
        新建课件
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div className="ln-field" style={{ minWidth: 280 }}>
        <input
          className="ln-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="第一讲 · 要约的构成"
          autoFocus
          required
        />
        {error ? <span className="ln-hint" style={{ color: 'var(--accent-ink)' }}>{error}</span> : null}
      </div>
      <button className="ln-btn ln-btn--primary ln-btn--sm" type="submit" disabled={busy || !title.trim()}>
        {busy ? '创建中…' : '创建并打开'}
      </button>
      <button className="ln-btn ln-btn--quiet ln-btn--sm" type="button" onClick={() => setOpen(false)}>
        取消
      </button>
    </form>
  );
}
