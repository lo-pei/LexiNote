'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SourceType, Wordbook } from '@ln/types';
import { api, errorMessage } from '@/lib/client';
import type { SentenceMatch, TermSuggestionDTO } from '@/lib/types';
import { Pronounce } from './wordbook-controls';

export interface AnchorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const GAP = 12;
const WIDTH = 330;

/** 浮层统一贴在锚点下方；空间不足时翻到上方，并保证不出视口。 */
function usePopoverPosition(rect: AnchorRect | null, ref: React.RefObject<HTMLDivElement>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !rect) return;
    const height = el.offsetHeight || 220;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - WIDTH - 16));
    let top = rect.top + rect.height + GAP;
    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, rect.top - height - GAP);
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [rect, ref]);
}

/**
 * 点浮层以外的地方就关。
 *
 * 之前把正文的 p / li / blockquote 一并豁免，本意是避免和「点段落看译文」打架，
 * 结果点在正文任何位置上术语卡都不关，反而像卡住了。现在只豁免浮层本身与
 * 术语节点：点别处一律关闭；对照译文模式下点段落，旧浮层先关、新的随即打开。
 */
function useDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.pop') || target?.closest('.ln-term')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);
}

/* ── 术语卡 ─────────────────────────────────────────────── */

export interface TermCardData {
  termId: string;
  label: string;
  phonetic: string;
  definition: string;
  rect: AnchorRect;
  /** 该术语所在的原句：用于 AI 语境释义，也随生词一起保存供复习出题 */
  context: string | null;
}

export function TermPopover({
  data,
  wordbooks,
  source,
  aiEnabled,
  onClose,
  onToast,
}: {
  data: TermCardData;
  wordbooks: Wordbook[];
  source: { sourceType: SourceType; sourceDocId: string; sourceContext: string | null; courseId: string | null };
  /** 模型是否可用；不可用时不显示 AI 入口 */
  aiEnabled: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [bookId, setBookId] = useState(wordbooks[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<TermSuggestionDTO | null>(null);
  const [asking, setAsking] = useState(false);
  usePopoverPosition(data.rect, ref);
  useDismiss(onClose);

  /** 语境释义按需生成：学生点开一个查不到的词，才有必要花一次模型调用 */
  const askAi = async () => {
    if (!data.context || asking) return;
    setAsking(true);
    setError(null);
    try {
      const res = await api<TermSuggestionDTO>('/api/terms/suggest', {
        method: 'POST',
        body: JSON.stringify({ term: data.label, sentence: data.context }),
      });
      if (res.status === 'UNAVAILABLE') setError('AI 暂时不可用，请稍后再试。');
      else setSuggestion(res);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setAsking(false);
    }
  };

  const add = async () => {
    if (!bookId) {
      setError('还没有词表，请先在生词本里新建一个。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ created: boolean }>(`/api/wordbooks/${bookId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          term: data.label,
          definitionZh: data.definition || '待补充释义',
          phonetic: data.phonetic || undefined,
          sourceType: source.sourceType,
          sourceDocId: source.sourceDocId,
          sourceContext: source.sourceContext,
          courseId: source.courseId,
        }),
      });
      onToast(result.created ? `已加入「${wordbooks.find((w) => w.id === bookId)?.name ?? '生词本'}」` : '这个词已经在词表里了');
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pop" ref={ref} role="dialog" aria-label={`术语 ${data.label}`}>
      <div className="pop__head">
        <span className="pop__term">{data.label}</span>
        {/* 朗读按钮贴着词走：连字符词按空格读，避免念成「common dash law」 */}
        <Pronounce term={data.label.replace(/-/g, ' ')} label={`朗读 ${data.label}`} />
        {data.phonetic ? <span className="pop__phon">{data.phonetic}</span> : null}
      </div>
      <p className="pop__def">{data.definition || '这份课件还没有为它写释义。'}</p>
      <p className="pop__meta">术语节点 · 点击可加入生词本，来源随词条一起保存</p>

      {aiEnabled && data.context ? (
        suggestion?.status === 'REJECTED' ? (
          <p className="term-ai__note">本词释义待教师补充。</p>
        ) : suggestion?.definitionZh ? (
          <div className="term-ai">
            <p className="term-ai__label">
              本句语境 · AI 释义
              {suggestion.legalDomain ? <span className="term-ai__domain">{suggestion.legalDomain}</span> : null}
            </p>
            <p className="pop__def" style={{ marginTop: 2 }}>
              {suggestion.definitionZh}
            </p>
            {suggestion.example ? <p className="term-ai__example">{suggestion.example}</p> : null}
            <p className="term-ai__note">AI 草稿 · 已提交教师审校，采纳后才进公共词库</p>
          </div>
        ) : (
          <button
            type="button"
            className="trans-line__ai"
            style={{ marginTop: 8 }}
            onClick={askAi}
            disabled={asking}
          >
            {asking ? '生成中…' : '看本句语境释义（AI）'}
          </button>
        )
      ) : null}

      {error ? (
        <p className="ln-hint" style={{ marginTop: 8, color: 'var(--accent-ink)' }}>
          {error}
        </p>
      ) : null}

      <div className="pop__actions">
        {wordbooks.length > 1 ? (
          <select
            className="ln-select ln-btn--sm"
            style={{ height: 28, width: 'auto', fontSize: 12 }}
            value={bookId}
            onChange={(event) => setBookId(event.target.value)}
            aria-label="选择词表"
          >
            {wordbooks.map((book) => (
              <option key={book.id} value={book.id}>
                {book.name}
              </option>
            ))}
          </select>
        ) : null}
        <button type="button" className="ln-btn ln-btn--primary ln-btn--sm" onClick={add} disabled={busy}>
          {busy ? '加入中…' : '加入生词本'}
        </button>
      </div>
    </div>
  );
}

/* ── 句子对照译文 ───────────────────────────────────────── */

export function TranslationPopover({
  rect,
  lines,
  loading,
  error,
  aiEnabled,
  draftingHash,
  rejectedHashes,
  onDraft,
  onClose,
}: {
  rect: AnchorRect;
  lines: SentenceMatch[];
  loading: boolean;
  error: string | null;
  /** 模型是否可用：不可用时不显示「AI 试译」，避免出现点了必然失败的按钮 */
  aiEnabled: boolean;
  draftingHash: string | null;
  /** 被教师驳回过的句子，不再提示重试 */
  rejectedHashes: string[];
  onDraft: (hash: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePopoverPosition(rect, ref);
  useDismiss(onClose);

  const ready = lines.filter((line) => line.matched).length;
  const drafts = lines.filter((line) => line.status === 'AI_DRAFT').length;

  return (
    <div className="pop" ref={ref} role="dialog" aria-label="对照译文">
      <div className="pop__head">
        <span className="pop__term" style={{ fontSize: 14, fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
          对照译文
        </span>
        <span className="pop__phon">
          {loading
            ? '查表中'
            : `${ready}/${lines.length} 句有译文${drafts > 0 ? `（其中 ${drafts} 句待审）` : ''}`}
        </span>
      </div>

      {error ? <p className="pop__def" style={{ color: 'var(--accent-ink)' }}>{error}</p> : null}

      <div className="trans-list">
        {loading && !lines.length ? <p className="trans-line__none">正在按句查预置译文…</p> : null}
        {lines.map((line, index) => {
          const rejected = rejectedHashes.includes(line.hash);
          const drafting = draftingHash === line.hash;
          return (
            <div className="trans-line" key={`${line.hash}-${index}`}>
              <p className="trans-line__en">{line.text}</p>
              {line.matched && line.translation ? (
                line.status === 'AI_DRAFT' ? (
                  // 草稿必须和人工译文看得出区别，否则教师审校就形同虚设
                  <p className="trans-line__zh trans-line__zh--draft">
                    {line.translation}
                    <span className="trans-line__badge">AI 草稿 · 未审校</span>
                  </p>
                ) : (
                  <p className="trans-line__zh">{line.translation}</p>
                )
              ) : (
                <p className="trans-line__none">
                  {rejected ? '本句译文待教师补充' : '暂无预置译文'}
                  {rejected || !aiEnabled ? null : (
                    <button
                      type="button"
                      className="trans-line__ai"
                      onClick={() => onDraft(line.hash)}
                      disabled={drafting}
                    >
                      {drafting ? '生成中…' : 'AI 试译'}
                    </button>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 录入术语（编辑态） ─────────────────────────────────── */

export function TermMaker({
  label,
  rect,
  onSubmit,
  onClose,
}: {
  label: string;
  rect: AnchorRect;
  onSubmit: (value: { phonetic: string; definition: string }) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phonetic, setPhonetic] = useState('');
  const [definition, setDefinition] = useState('');
  usePopoverPosition(rect, ref);
  useDismiss(onClose);

  return (
    <div className="pop" ref={ref} role="dialog" aria-label="录入术语">
      <button type="button" className="pop__close" onClick={onClose} aria-label="关闭">
        ×
      </button>
      <div className="pop__head">
        <span className="pop__term">{label}</span>
        <span className="pop__phon">新术语</span>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <input
          className="ln-input"
          style={{ height: 30 }}
          value={phonetic}
          onChange={(event) => setPhonetic(event.target.value)}
          placeholder="音标（可留空）"
        />
        <textarea
          className="ln-textarea"
          style={{ minHeight: 64 }}
          value={definition}
          onChange={(event) => setDefinition(event.target.value)}
          placeholder="中文释义，例如：要约，一方作出的、愿意受特定条款约束的意思表示。"
        />
        <button
          type="button"
          className="ln-btn ln-btn--primary ln-btn--sm"
          onClick={() => onSubmit({ phonetic: phonetic.trim(), definition: definition.trim() })}
          disabled={!definition.trim()}
        >
          标为术语
        </button>
      </div>
    </div>
  );
}
