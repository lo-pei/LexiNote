'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

interface JoinResponse {
  classId: string;
  className: string;
  alreadyMember: boolean;
}

/** 学生凭 6 位班级码加入。邀请链接走 /join/[token]，两条入口最终落到同一个班级。 */
export function JoinClass({ defaultCode = '' }: { defaultCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(defaultCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<JoinResponse>('/api/classes/join', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      router.push(`/classes/${result.classId}`);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <form className="joinbox" onSubmit={submit}>
      <div>
        <b>输入班级码加入</b>
        <p className="ln-hint">
          班级码由任课教师提供，共 6 位。收到同学发来的邀请链接时，直接打开链接即可，不用再输码。
        </p>
      </div>
      <div className="joinbox__row">
        <input
          className="ln-input joinbox__input"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="LAW103"
          aria-label="班级码"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <button className="ln-btn ln-btn--primary" type="submit" disabled={busy || code.trim().length < 4}>
          {busy ? '加入中…' : '加入'}
        </button>
      </div>
      {error ? <div className="notice notice--error">{error}</div> : null}
    </form>
  );
}
