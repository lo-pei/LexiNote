'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

export function NewNote() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: string }>('/api/documents', {
        method: 'POST',
        body: JSON.stringify({ kind: 'NOTE', title: '未命名笔记' }),
      });
      router.push(`/docs/${created.id}`);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {error ? <span className="ln-hint" style={{ color: 'var(--accent-ink)' }}>{error}</span> : null}
      <button type="button" className="ln-btn ln-btn--primary ln-btn--sm" onClick={create} disabled={busy}>
        {busy ? '创建中…' : '新建笔记'}
      </button>
    </span>
  );
}
