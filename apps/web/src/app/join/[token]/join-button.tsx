'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

export function JoinButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ classId: string; className: string; alreadyMember: boolean }>(
        `/api/classes/invites/${token}`,
        { method: 'POST' },
      );
      router.replace(`/classes/${result.classId}`);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button type="button" className="ln-btn ln-btn--primary" onClick={run} disabled={busy}>
        {busy ? '正在加入…' : '加入这个班级'}
      </button>
      {error ? <div className="notice notice--error">{error}</div> : null}
    </div>
  );
}
