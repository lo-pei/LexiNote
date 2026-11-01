'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorShell, collectHeadings, countTerms, textOf } from '@ln/editor';
import type { TermActivation } from '@ln/editor';
import type { DocumentWithMeta, ReadLevel, SessionUser, TiptapDoc, Wordbook } from '@ln/types';
import { countWords, formatRelative, splitSentences } from '@ln/utils';
import { api, errorMessage } from '@/lib/client';
import type { SentenceMatch, SaveState } from '@/lib/types';
import { TermMaker, TermPopover, TranslationPopover } from '@/components/overlays';
import type { AnchorRect, TermCardData } from '@/components/overlays';

type Mode = 'read' | 'edit';

const AUTOSAVE_MS = 1200;

function rectOf(element: Element): AnchorRect {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

export interface DocumentWorkspaceProps {
  doc: DocumentWithMeta;
  user: SessionUser;
  wordbooks: Wordbook[];
}

export function DocumentWorkspace({ doc, user, wordbooks }: DocumentWorkspaceProps) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReady = useCallback((instance: Editor | null) => {
    setEditor(instance);
  }, []);

  const [mode, setMode] = useState<Mode>(doc.canEdit ? 'edit' : 'read');
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState<TiptapDoc>(doc.content);
  const contentRef = useRef(content);
  const [state, setState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(doc.updatedAt);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [term, setTerm] = useState<TermCardData | null>(null);
  const [trans, setTrans] = useState<{ rect: AnchorRect; lines: SentenceMatch[]; loading: boolean; error: string | null } | null>(null);
  const [transMode, setTransMode] = useState(false);
  const [maker, setMaker] = useState<{ label: string; rect: AnchorRect } | null>(null);
  const [busy, setBusy] = useState(false);

  const words = useMemo(() => countWords(textOf(content)), [content]);
  const terms = useMemo(() => countTerms(content), [content]);
  const headings = useMemo(() => collectHeadings(content), [content]);
  const editable = doc.canEdit && mode === 'edit';

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const save = useCallback(async () => {
    if (!doc.canEdit) return;
    setState('saving');
    try {
      const result = await api<{ updatedAt: string }>(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: title.trim() || doc.title, content }),
      });
      setSavedAt(result.updatedAt);
      setState('saved');
    } catch (cause) {
      setError(errorMessage(cause));
      setState('error');
    }
  }, [content, doc.canEdit, doc.id, doc.title, title]);

  // 自动保存：编辑态下停止输入 1.2 秒落库；离开页面前强制保存一次。
  useEffect(() => {
    if (!editable || state !== 'dirty') return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void save();
    }, AUTOSAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [content, title, editable, save, state]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (state === 'dirty' || state === 'saving') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [state]);

  const onTermActivate = (payload: TermActivation) => {
    setTrans(null);
    setTerm({
      termId: payload.termId,
      label: payload.label,
      phonetic: payload.phonetic,
      definition: payload.definition,
      rect: payload.rect,
    });
    void api('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'TERM_CLICK',
        payload: { term: payload.label, ...(doc.courseId ? { courseId: doc.courseId } : {}) },
      }),
    }).catch(() => undefined);
  };

  const lookupTranslation = async (block: Element) => {
    const text = (block.textContent ?? '').trim();
    if (!text) return;
    const texts = splitSentences(text)
      .map((sentence) => sentence.text)
      .slice(0, 24);
    setTerm(null);
    setTrans({ rect: rectOf(block), lines: [], loading: true, error: null });
    try {
      const lines = await api<SentenceMatch[]>('/api/translation/match', {
        method: 'POST',
        body: JSON.stringify({ texts, ...(doc.courseId ? { courseId: doc.courseId } : {}) }),
      });
      setTrans({ rect: rectOf(block), lines, loading: false, error: null });
    } catch (cause) {
      setTrans({ rect: rectOf(block), lines: [], loading: false, error: errorMessage(cause) });
    }
  };

  const onBodyClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (mode === 'edit' || !transMode) return;
    const target = event.target as HTMLElement;
    if (target.closest('.ln-term')) return;
    const block = target.closest('p, li, blockquote, td');
    if (!block) return;
    void lookupTranslation(block);
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/documents/${doc.id}/publish`, { method: 'POST' });
      setToast('课件已发布，选课学生现在可以阅读。');
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const clone = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: string }>(`/api/documents/${doc.id}/clone`, { method: 'POST' });
      router.push(`/docs/${created.id}`);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  const toggleSidebarLevel = async (itemId: string, level: ReadLevel) => {
    try {
      await api(`/api/sidebar/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ level: level === 'REQUIRED' ? 'OPTIONAL' : 'REQUIRED' }),
      });
      setToast('阅读分级已更新。');
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const scrollToHeading = (index: number) => {
    const nodes = document.querySelectorAll('.ln-prose h1, .ln-prose h2, .ln-prose h3');
    nodes[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const makeTerm = (value: { phonetic: string; definition: string }) => {
    if (!editor) return;
    const ok = editor.chain().focus().setLegalTerm({ phonetic: value.phonetic, definition: value.definition }).run();
    setMaker(null);
    setToast(ok ? '已标为术语。' : '请先选中要标注的词语。');
  };

  const onStartTerm = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      setToast('请先用鼠标选中要标注的词语。');
      return;
    }
    const label = editor.state.doc.textBetween(from, to, ' ');
    const coords = editor.view.coordsAtPos(from);
    setMaker({
      label: label.slice(0, 80),
      rect: { left: coords.left, top: coords.bottom, width: 1, height: 1 },
    });
  };

  const saveStateLabel: Record<SaveState, string> = {
    idle: savedAt ? `已保存于 ${formatRelative(savedAt)}` : '尚未保存',
    dirty: '有未保存的修改',
    saving: '正在保存…',
    saved: '已保存',
    error: '保存失败',
  };

  return (
    <div className="wrap wrap--wide">
      <div className="doc__bar">
        <Link className="ln-btn ln-btn--quiet ln-btn--sm" href={doc.courseId ? `/courses/${doc.courseId}` : '/library'}>
          ← {doc.courseId ? '课程' : '我的文档'}
        </Link>
        <span className="doc__bar-title">{doc.title}</span>
        <span className="doc__bar-spacer" />

        {doc.canEdit ? (
          <span className={`save-state save-state--${state}`}>
            <span className="save-state__dot" aria-hidden="true" />
            {state === 'error' ? '保存失败' : saveStateLabel[state]}
          </span>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {transMode && mode !== 'edit' ? (
            <span className="ln-badge ln-badge--required">点段落看译文</span>
          ) : null}
          <button
            type="button"
            className={`ln-btn ln-btn--sm ${transMode ? 'ln-btn--primary' : 'ln-btn--outline'}`}
            onClick={() => {
              setTransMode((value) => !value);
              setTrans(null);
            }}
            aria-pressed={transMode}
          >
            对照译文
          </button>
          <Link className="ln-btn ln-btn--outline ln-btn--sm" href={`/docs/${doc.id}/present`}>
            演示
          </Link>
          {doc.canEdit ? (
            <>
              <button
                type="button"
                className={`ln-btn ln-btn--sm ${mode === 'edit' ? 'ln-btn--primary' : 'ln-btn--outline'}`}
                onClick={() => setMode(mode === 'edit' ? 'read' : 'edit')}
              >
                {mode === 'edit' ? '完成编辑' : '编辑'}
              </button>
              {mode === 'edit' ? (
                <button type="button" className="ln-btn ln-btn--outline ln-btn--sm" onClick={() => void save()} disabled={state === 'saving'}>
                  保存
                </button>
              ) : null}
            </>
          ) : doc.status === 'PUBLISHED' && doc.kind === 'COURSEWARE' ? (
            <button type="button" className="ln-btn ln-btn--primary ln-btn--sm" onClick={clone} disabled={busy}>
              {busy ? '处理中…' : '纳入我的笔记库'}
            </button>
          ) : null}
          {doc.canEdit && doc.kind === 'COURSEWARE' && doc.status === 'DRAFT' ? (
            <button type="button" className="ln-btn ln-btn--primary ln-btn--sm" onClick={publish} disabled={busy}>
              {busy ? '发布中…' : '发布'}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="notice notice--error" style={{ marginBottom: 16 }} role="alert">
          {error}
          <button type="button" className="ln-btn ln-btn--quiet ln-btn--sm" onClick={() => setError(null)}>
            知道了
          </button>
        </div>
      ) : null}

      {toast ? (
        <div className="notice" style={{ marginBottom: 16 }} role="status">
          {toast}
        </div>
      ) : null}

      {doc.readOnlyReason && mode !== 'edit' && doc.canEdit === false ? (
        <div className="notice" style={{ marginBottom: 16 }}>
          <span>{doc.readOnlyReason}</span>
        </div>
      ) : null}

      <div className="doc">
        <div>
          <article className="doc__paper">
            {editable ? (
              <>
                <textarea
                  className="doc__title"
                  value={title}
                  rows={1}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setState('dirty');
                  }}
                  placeholder="标题"
                  aria-label="文档标题"
                />
                {doc.subtitle ? <p className="doc__subtitle">{doc.subtitle}</p> : null}
              </>
            ) : (
              <>
                <h1 className="doc__title" style={{ marginBottom: doc.subtitle ? 6 : 0 }}>
                  {title}
                </h1>
                {doc.subtitle ? <p className="doc__subtitle">{doc.subtitle}</p> : null}
              </>
            )}

            <div className="doc__rule" />

            <div onClick={onBodyClick}>
              <EditorShell
                content={content}
                mode={editable ? 'edit' : 'readonly'}
                placeholder="从这里开始写这一讲……"
                onReady={handleReady}
                onChange={(next) => {
                  // 挂载时的首次 transaction 会和初始内容等价，别把它当成「修改」去触发自动保存
                  const serialized = JSON.stringify(next);
                  if (serialized === JSON.stringify(contentRef.current)) return;
                  contentRef.current = next;
                  setContent(next);
                  setState('dirty');
                }}
                onTermActivate={onTermActivate}
                ariaLabel={title}
              />
            </div>
          </article>
        </div>

        <aside className="doc__aside">
          {headings.length ? (
            <div className="aside-block">
              <div className="aside-block__title">
                <span>目录</span>
                <span>{headings.length}</span>
              </div>
              <nav className="toc" aria-label="文档目录">
                {headings.map((heading) => (
                  <button
                    type="button"
                    key={`${heading.index}-${heading.text}`}
                    className={`toc__item${heading.level === 2 ? ' toc__item--l2' : heading.level === 3 ? ' toc__item--l3' : ''}`}
                    style={{ textAlign: 'left', border: 0, background: 'transparent', cursor: 'pointer' }}
                    onClick={() => scrollToHeading(heading.index)}
                  >
                    {heading.text}
                  </button>
                ))}
              </nav>
            </div>
          ) : null}

          {doc.sidebar.length ? (
            <div className="aside-block">
              <div className="aside-block__title">
                <span>侧栏阅读</span>
                <span>{doc.sidebar.filter((item) => item.level === 'REQUIRED').length} 必读</span>
              </div>
              {doc.sidebar.map((item) => (
                <div className="side-item" key={item.id}>
                  <div className="side-item__title">
                    <span className={`ln-badge${item.level === 'REQUIRED' ? ' ln-badge--required' : ''}`}>
                      {item.level === 'REQUIRED' ? '必读' : '选读'}
                    </span>
                    <span>{item.title}</span>
                  </div>
                  <p className="side-item__body">{textOf(item.content)}</p>
                  {user.role === 'TEACHER' && doc.canEdit && mode === 'read' ? (
                    <button
                      type="button"
                      className="ln-btn ln-btn--quiet ln-btn--sm"
                      style={{ marginTop: 4, paddingLeft: 0 }}
                      onClick={() => void toggleSidebarLevel(item.id, item.level)}
                    >
                      设为{item.level === 'REQUIRED' ? '选读' : '必读'}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="aside-block">
            <div className="aside-block__title">
              <span>这篇文档</span>
            </div>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 12 }}>
              <dt className="muted">作者</dt>
              <dd style={{ margin: 0 }}>{doc.ownerName}</dd>
              <dt className="muted">类型</dt>
              <dd style={{ margin: 0 }}>
                {doc.kind === 'COURSEWARE' ? '课件' : '笔记'} · {doc.status === 'PUBLISHED' ? '已发布' : '草稿'}
              </dd>
              {doc.originTitle ? (
                <>
                  <dt className="muted">来源</dt>
                  <dd style={{ margin: 0 }}>原课件 · {doc.originTitle}</dd>
                </>
              ) : null}
              <dt className="muted">字数</dt>
              <dd style={{ margin: 0 }} className="tnum">
                {words}
              </dd>
              <dt className="muted">术语</dt>
              <dd style={{ margin: 0 }} className="tnum">
                {terms}
              </dd>
              <dt className="muted">更新</dt>
              <dd style={{ margin: 0 }}>{formatRelative(savedAt ?? doc.updatedAt)}</dd>
            </dl>
            <p className="ln-hint" style={{ marginTop: 10 }}>
              {mode === 'edit'
                ? '编辑态下每 1.2 秒自动保存一次；选中词语后按「术语」可加注音与释义。'
                : '阅读态下点击虚线术语查看释义；开启「对照译文」后点段落查看逐句译文。'}
            </p>
          </div>
        </aside>
      </div>

      {editable ? <Toolbar editor={editor} onTerm={onStartTerm} /> : null}

      {term ? (
        <TermPopover
          data={term}
          wordbooks={wordbooks.filter((book) => book.kind !== 'GLOSSARY')}
          source={{
            sourceType: doc.kind === 'COURSEWARE' ? 'COURSE' : 'DOCUMENT',
            sourceDocId: doc.id,
            sourceContext: null,
            courseId: doc.courseId,
          }}
          onClose={() => setTerm(null)}
          onToast={setToast}
        />
      ) : null}

      {trans ? (
        <TranslationPopover
          rect={trans.rect}
          lines={trans.lines}
          loading={trans.loading}
          error={trans.error}
          onClose={() => setTrans(null)}
        />
      ) : null}

      {maker ? (
        <TermMaker label={maker.label} rect={maker.rect} onSubmit={makeTerm} onClose={() => setMaker(null)} />
      ) : null}
    </div>
  );
}

/* ── 编辑工具条（悬浮窗） ─────────────────────────────────
   正文区域不再常驻一条工具栏：有选中文本时贴在选区上方浮出，
   没有选中时收在视口底部居中，随时可折叠成一枚小圆钮。
   ──────────────────────────────────────────────────────── */

function Toolbar({ editor, onTerm }: { editor: Editor | null; onTerm: () => void }) {
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(true);
  const [anchor, setAnchor] = useState<{ left: number; top: number; below: boolean } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => setTick((value) => value + 1);
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  // 有选中文本 → 浮到选区上方；光标收起 → 回到底部停靠位
  useEffect(() => {
    if (!editor) {
      setAnchor(null);
      return;
    }
    const { from, to } = editor.state.selection;
    if (from === to) {
      setAnchor(null);
      return;
    }
    try {
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const left = Math.min(Math.max((start.left + end.right) / 2, 150), window.innerWidth - 150);
      const top = Math.min(start.top, end.top);
      // 选区靠近顶部时改放在下方，否则浮窗会顶出视口
      const below = top < 72;
      setAnchor({ left, top: below ? Math.max(start.bottom, end.bottom) + 10 : top - 12, below });
    } catch {
      setAnchor(null);
    }
  }, [editor, tick]);

  const run = (fn: (instance: Editor) => void) => {
    if (!editor) return;
    fn(editor);
    editor.commands.focus();
  };

  const button = (label: string, active: boolean, action: () => void, title?: string) => (
    <button
      type="button"
      className={`toolbar__btn${active ? ' toolbar__btn--on' : ''}`}
      // 按下时先别让编辑器失焦，否则选区没了、命令也丢了
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
      title={title ?? label}
      aria-label={title ?? label}
      aria-pressed={active}
    >
      {label}
    </button>
  );

  if (!open) {
    return (
      <button
        type="button"
        className="toolbar__fab"
        onClick={() => setOpen(true)}
        title="展开排版工具"
        aria-label="展开排版工具"
      >
        Aa
      </button>
    );
  }

  return (
    <div
      className={`toolbar${anchor ? ` toolbar--float${anchor.below ? ' toolbar--below' : ''}` : ' toolbar--dock'}`}
      role="toolbar"
      aria-label="排版工具"
      style={anchor ? { left: anchor.left, top: anchor.top } : undefined}
      onMouseDown={(event) => event.preventDefault()}
    >
      {button('B', Boolean(editor?.isActive('bold')), () => run((e) => e.chain().focus().toggleBold().run()), '加粗')}
      {button('I', Boolean(editor?.isActive('italic')), () => run((e) => e.chain().focus().toggleItalic().run()), '斜体')}
      <span className="toolbar__sep" />
      {button('H1', Boolean(editor?.isActive('heading', { level: 1 })), () => run((e) => e.chain().focus().toggleHeading({ level: 1 }).run()))}
      {button('H2', Boolean(editor?.isActive('heading', { level: 2 })), () => run((e) => e.chain().focus().toggleHeading({ level: 2 }).run()))}
      {button('H3', Boolean(editor?.isActive('heading', { level: 3 })), () => run((e) => e.chain().focus().toggleHeading({ level: 3 }).run()))}
      <span className="toolbar__sep" />
      {button('•', Boolean(editor?.isActive('bulletList')), () => run((e) => e.chain().focus().toggleBulletList().run()), '无序列表')}
      {button('1.', Boolean(editor?.isActive('orderedList')), () => run((e) => e.chain().focus().toggleOrderedList().run()), '有序列表')}
      {button('“”', Boolean(editor?.isActive('blockquote')), () => run((e) => e.chain().focus().toggleBlockquote().run()), '引文')}
      <span className="toolbar__sep" />
      {button('要点', Boolean(editor?.isActive('callout')), () => run((e) => e.chain().focus().toggleCallout('key').run()), '重点论述块')}
      <button
        type="button"
        className="toolbar__btn toolbar__btn--accent"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onTerm}
        title="把选中的词标为术语"
      >
        术语
      </button>
      <button
        type="button"
        className="toolbar__btn toolbar__btn--tuck"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen(false)}
        title="收起工具栏"
        aria-label="收起工具栏"
      >
        ⌄
      </button>
    </div>
  );
}
