'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

/* ── 新建词表 ───────────────────────────────────────────── */

export function NewWordbook() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/wordbooks', {
        method: 'POST',
        body: JSON.stringify({ name, description: description || undefined }),
      });
      setName('');
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
        新建词表
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div className="ln-field" style={{ width: 240 }}>
        <input
          className="ln-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="词表名称，例如：判例阅读高频词"
          autoFocus
          required
        />
        {error ? <span className="ln-hint" style={{ color: 'var(--accent-ink)' }}>{error}</span> : null}
      </div>
      <button className="ln-btn ln-btn--primary ln-btn--sm" type="submit" disabled={busy || !name.trim()}>
        {busy ? '创建中…' : '创建'}
      </button>
      <button className="ln-btn ln-btn--quiet ln-btn--sm" type="button" onClick={() => setOpen(false)}>
        取消
      </button>
    </form>
  );
}

/* ── 掌握度 ─────────────────────────────────────────────── */

const LEVELS = ['生词', '眼熟', '能译', '会用'];

export function MasteryDots({ itemId, level }: { itemId: string; level: number }) {
  const router = useRouter();
  const [value, setValue] = useState(level);
  const [busy, setBusy] = useState(false);

  const update = async (next: number) => {
    setValue(next);
    setBusy(true);
    try {
      await api(`/api/wordbook-items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ masteryLevel: next }),
      });
      router.refresh();
    } catch {
      setValue(level);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="mastery" role="group" aria-label="掌握程度">
        {LEVELS.map((label, index) => (
          <button
            key={label}
            type="button"
            className={`mastery__dot${index <= value ? ' mastery__dot--on' : ''}`}
            onClick={() => void update(index)}
            disabled={busy}
            title={`标记为「${label}」`}
            aria-label={`标记为「${label}」`}
            aria-pressed={index === value}
          />
        ))}
      </span>
      <span className="ln-hint">{LEVELS[value]}</span>
    </div>
  );
}

/* ── 移除词条 ───────────────────────────────────────────── */

export function RemoveItem({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await api(`/api/wordbook-items/${itemId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="ln-btn ln-btn--quiet ln-btn--sm ln-btn--danger"
      onClick={remove}
      disabled={busy}
      aria-label="从词表移除"
    >
      移除
    </button>
  );
}

/* ── 手动添加 ───────────────────────────────────────────── */

export function AddTerm({ wordbookId }: { wordbookId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [definitionZh, setDefinitionZh] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/wordbooks/${wordbookId}/items`, {
        method: 'POST',
        body: JSON.stringify({ term, definitionZh, sourceType: 'MANUAL' }),
      });
      setTerm('');
      setDefinitionZh('');
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
        手动添加
      </button>
    );
  }

  return (
    <form className="card" style={{ display: 'grid', gap: 10, marginBottom: 18 }} onSubmit={submit}>
      <div className="grid grid--2">
        <div className="ln-field">
          <label className="ln-label">术语</label>
          <input className="ln-input" value={term} onChange={(event) => setTerm(event.target.value)} required autoFocus />
        </div>
        <div className="ln-field">
          <label className="ln-label">释义</label>
          <input
            className="ln-input"
            value={definitionZh}
            onChange={(event) => setDefinitionZh(event.target.value)}
            required
          />
        </div>
      </div>
      {error ? <div className="notice notice--error">{error}</div> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ln-btn ln-btn--primary ln-btn--sm" type="submit" disabled={busy}>
          {busy ? '保存中…' : '加入词表'}
        </button>
        <button className="ln-btn ln-btn--quiet ln-btn--sm" type="button" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>
    </form>
  );
}
