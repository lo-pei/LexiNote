'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
import type { PendingDraftDTO } from '@/lib/types';

/**
 * 待审译文卡片。
 *
 * 这里的每一个「通过」都会让一条 AI 草稿变成学生看到的人工审校译文，
 * 所以按钮文案写的是「通过（转正式）」「驳回」，不留模糊空间；
 * 译文直接在卡片里可改——实际使用中最常见的动作就是改两个词。
 */
export function TranslationReview({ items }: { items: PendingDraftDTO[] }) {
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
      await api('/api/translation/review', {
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
    return <div className="empty">没有待审译文。学生点开「AI 试译」生成的草稿会出现在这里。</div>;
  }

  return (
    <div className="review-list">
      {error ? <p className="notice notice--error">{error}</p> : null}
      {items.map((item) => (
        <article className="review-card" key={item.id}>
          <p className="review-card__en">{item.sourceText}</p>
          <textarea
            className="review-card__editor"
            rows={3}
            value={drafts[item.id] ?? item.translation}
            onChange={(event) => setDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
          />
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
                {busy === item.id ? '提交中…' : '通过（转正式）'}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
