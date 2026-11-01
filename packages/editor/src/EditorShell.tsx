'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Editor } from '@tiptap/core';
import type { EditorMode, TiptapDoc } from '@ln/types';
import { useEffect, useRef } from 'react';
import { LegalTerm } from './legal-term';
import { Callout } from './callout';
import { Flowchart } from './flowchart';
import { CourseImage } from './image';

export interface TermActivation {
  termId: string;
  label: string;
  phonetic: string;
  definition: string;
  rect: { left: number; top: number; width: number; height: number };
  element: HTMLElement;
}

export interface EditorShellProps {
  content: TiptapDoc;
  mode: EditorMode;
  onChange?: (doc: TiptapDoc) => void;
  onReady?: (editor: Editor | null) => void;
  onTermActivate?: (payload: TermActivation) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * 全库唯一的 Tiptap 实例化入口（说明书 §10.3）。
 * 编辑态 / 只读态 / 演示态共用同一套扩展与渲染管线，差异只在 editable 与交互层。
 */
export function EditorShell({
  content,
  mode,
  onChange,
  onReady,
  onTermActivate,
  placeholder = '从这里开始写……',
  className,
  ariaLabel,
}: EditorShellProps) {
  const editable = mode === 'edit';
  const rootRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    content,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        horizontalRule: false,
        dropcursor: { color: 'var(--accent)', width: 2 },
      }),
      Placeholder.configure({ placeholder }),
      LegalTerm,
      Callout,
      Flowchart,
      CourseImage,
    ],
    editorProps: {
      attributes: {
        class: 'ln-prose',
        spellcheck: 'false',
        'aria-label': ariaLabel ?? '文档内容',
        ...(editable ? {} : { role: 'document' }),
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange?.(instance.getJSON() as TiptapDoc);
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    onReady?.(editor);
    return () => onReady?.(null);
  }, [editor, onReady]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !onTermActivate) return;

    const activate = (target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      onTermActivate({
        termId: target.getAttribute('data-term-id') ?? '',
        label: target.getAttribute('data-term-label') ?? target.textContent ?? '',
        phonetic: target.getAttribute('data-phonetic') ?? '',
        definition: target.getAttribute('data-definition') ?? '',
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        element: target,
      });
    };

    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('.ln-term');
      if (!target) return;
      if (editable) return;
      event.preventDefault();
      activate(target);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('.ln-term');
      if (!target || editable) return;
      event.preventDefault();
      activate(target);
    };

    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKey);
    };
  }, [onTermActivate, editable]);

  return (
    <div ref={rootRef} className={['ln-editor', `ln-editor--${mode}`, className].filter(Boolean).join(' ')}>
      <EditorContent editor={editor} />
    </div>
  );
}
