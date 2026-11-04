'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
import type { PendingTermDTO } from '@/lib/types';

/**
 * 待审术语释义。
 *
 * 采纳 = 迁入正式词库（vocabulary_entries，origin 仍写 GLOSSARY），
 * 所以按钮上写的是「采纳进词库」而不是「通过」——动作后果要说清楚。
 */
export function TermSuggestionReview({ items }: { items: PendingTermDTO[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, action: 'approve' | 'reject') => {
    if (busy) return;
    setBusy(id);
    setError(null);
    try {
      const edited = drafts[id];
      await api('/api/terms/review', {
        method: 'POST',
        body: JSON.stringify({
          id,
          action,
          ...(action === 'approve' && edited !== undefined ? { edited } : {}),
        }),
      });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  if (!items.length) {
    return <div className="empty">没有待审术语。学生在阅读里查不到词时触发的 AI 释义会出现在这里。</div>;
  }

  return (
    <div className="review-list">
      {error ? <p className="notice notice--error">{error}</p> : null}
      {items.map((item) => (
        <article className="review-card" key={item.id}>
          <div className="review-term__head">
            <b className="pop__term">{item.term}</b>
            {item.phonetic ? <span className="pop__phon">{item.phonetic}</span> : null}
            {item.legalDomain ? <span className="term-ai__domain">{item.legalDomain}</span> : null}
          </div>
          <p className="review-card__en">{item.sentence}</p>
          <input
            className="review-card__editor"
            value={drafts[item.id] ?? item.definitionZh}
            onChange={(event) => setDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
            aria-label={`${item.term} 的释义`}
          />
          {item.example ? <p className="term-ai__example">{item.example}</p> : null}
          <div className="review-card__foot">
            <span className="review-card__meta">
              {item.model ?? 'AI 草稿'} · {item.createdAt.slice(0, 16).replace('T', ' ')}
            </span>
            <div className="review-card__actions">
              <button
                type="button"
                className="ln-btn ln-btn--outline ln-btn--sm"
                onClick={() => act(item.id, 'reject')}
                disabled={busy === item.id}
              >
                驳回
              </button>
              <button
                type="button"
                className="ln-btn ln-btn--primary ln-btn--sm"
                onClick={() => act(item.id, 'approve')}
                disabled={busy === item.id}
              >
                {busy === item.id ? '提交中…' : '采纳进词库'}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
