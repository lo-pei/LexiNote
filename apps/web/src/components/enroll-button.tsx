'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/courses/${courseId}/enroll`, { method: 'POST' });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {error ? <span className="ln-hint" style={{ color: 'var(--accent-ink)' }}>{error}</span> : null}
      <button type="button" className="ln-btn ln-btn--outline ln-btn--sm" onClick={run} disabled={busy}>
        {busy ? '加入中…' : '选修此课'}
      </button>
    </span>
  );
}
