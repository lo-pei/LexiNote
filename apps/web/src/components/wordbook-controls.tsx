'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '@/lib/client';

/* ── 发音 ───────────────────────────────────────────────── */

/** 只挑英语音色，避免中文卷进英文单词里读成拼音 */
function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
  if (!en.length) return null;
  // 优先本地音色（离线可用、延迟低），再优先 en-US / en-GB
  return (
    en.find((voice) => voice.localService && voice.lang === 'en-US') ??
    en.find((voice) => voice.localService) ??
    en.find((voice) => voice.lang === 'en-US') ??
    en[0] ??
    null
  );
}

/**
 * 点击朗读单词。
 * 浏览器原生 SpeechSynthesis 在 Chrome / Edge / Safari 都有，不额外引第三方音频接口；
 * 不支持的浏览器直接把按钮隐藏，不留一个点了没反应的控件。
 */
export function Pronounce({ term, label }: { term: string; label?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const startTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (startTimerRef.current !== null) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    // 部分浏览器音色列表是异步返回的
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
      clearTimers();
    };
  }, []);

  const speak = () => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    // 连点同一个词时先掐掉上一条，避免排队重读
    clearTimers();
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(term);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    utterance.pitch = 1;
    const voice = pickEnglishVoice(voicesRef.current);
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      clearTimers();
      setSpeaking(false);
    };
    utterance.onerror = () => {
      clearTimers();
      setSpeaking(false);
    };
    setSpeaking(true);
    // cancel() 之后 onend 在部分浏览器不回调，按单词长度估一个兜底复位时间
    resetTimerRef.current = window.setTimeout(
      () => {
        setSpeaking(false);
        resetTimerRef.current = null;
      },
      Math.max(1600, term.length * 280),
    );
    // cancel 与 speak 紧挨着调用时 Chrome 偶发静默丢句，让出一拍再排
    startTimerRef.current = window.setTimeout(() => {
      startTimerRef.current = null;
      synth.speak(utterance);
    }, 40);
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`wb-say${speaking ? ' wb-say--on' : ''}`}
      onClick={speak}
      title={`朗读 ${term}`}
      aria-label={label ?? `朗读 ${term}`}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M3.4 6.1h2.1L8.4 3.6v8.8L5.5 9.9H3.4z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M10.6 5.9a2.9 2.9 0 0 1 0 4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M12.3 4.2a5.2 5.2 0 0 1 0 7.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/* ── 删除词表 ───────────────────────────────────────────── */

export function DeleteWordbook({ wordbookId, name }: { wordbookId: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/wordbooks/${wordbookId}`, { method: 'DELETE' });
      setConfirming(false);
      router.push('/wordbooks');
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        className="ln-btn ln-btn--quiet ln-btn--sm ln-btn--danger"
        onClick={() => setConfirming(true)}
      >
        删除词表
      </button>
    );
  }

  return (
    <span className="wb-confirm" role="group" aria-label="确认删除词表">
      <span className="wb-confirm__text">
        删除「{name}」及其全部词条？
      </span>
      {error ? <span className="wb-confirm__err">{error}</span> : null}
      <button type="button" className="ln-btn ln-btn--danger ln-btn--sm" onClick={remove} disabled={busy}>
        {busy ? '删除中…' : '确认删除'}
      </button>
      <button
        type="button"
        className="ln-btn ln-btn--quiet ln-btn--sm"
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        disabled={busy}
      >
        取消
      </button>
    </span>
  );
}

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
