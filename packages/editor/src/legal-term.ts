import { Node, mergeAttributes } from '@tiptap/core';

export interface LegalTermOptions {
  HTMLAttributes: Record<string, string>;
}

export interface LegalTermAttrs {
  termId: string;
  phonetic: string;
  definition: string;
  color?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    legalTerm: {
      /** 把当前选区包成 legalTerm 行内节点 */
      setLegalTerm: (attrs: Omit<LegalTermAttrs, 'termId'> & { termId?: string }) => ReturnType;
      /** 拆回普通文本 */
      unsetLegalTerm: () => ReturnType;
      /** 更新光标所在术语的释义 */
      updateLegalTerm: (attrs: Partial<LegalTermAttrs>) => ReturnType;
    };
  }
}

const slug = (text: string): string => {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return `term-${Math.abs(h).toString(36)}`;
};

/**
 * legalTerm —— 行内术语节点（说明书 §5.1）。
 * 保留内部文本（可继续编辑），虚线渲染，点击由应用层委托处理并弹出卡片。
 * 该节点不依赖 API 客户端：数据只存在于 attrs 与 DOM dataset。
 */
export const LegalTerm = Node.create<LegalTermOptions>({
  name: 'legalTerm',
  inline: true,
  group: 'inline',
  content: 'text*',
  selectable: true,
  atom: false,
  marks: '',

  addOptions() {
    return { HTMLAttributes: { class: 'ln-term' } };
  },

  addAttributes() {
    return {
      termId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-term-id'),
        renderHTML: (attrs) => (attrs.termId ? { 'data-term-id': attrs.termId } : {}),
      },
      phonetic: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-phonetic') ?? '',
        renderHTML: (attrs) => (attrs.phonetic ? { 'data-phonetic': attrs.phonetic } : {}),
      },
      definition: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-definition') ?? '',
        renderHTML: (attrs) => (attrs.definition ? { 'data-definition': attrs.definition } : {}),
      },
      color: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-color'),
        renderHTML: (attrs) => (attrs.color ? { 'data-color': attrs.color } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-term-id]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const label = node.textContent || '';
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-term-label': label,
        role: 'button',
        tabindex: '0',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setLegalTerm:
        (attrs) =>
        ({ state, dispatch }) => {
          const { from, to, empty } = state.selection;
          if (empty) return false;
          const text = state.doc.textBetween(from, to, ' ');
          const node = state.schema.nodes.legalTerm?.create(
            {
              termId: attrs.termId ?? slug(text),
              phonetic: attrs.phonetic,
              definition: attrs.definition,
              color: attrs.color ?? null,
            },
            text ? state.schema.text(text) : null,
          );
          if (!node) return false;
          if (dispatch) dispatch(state.tr.replaceWith(from, to, node).scrollIntoView());
          return true;
        },

      unsetLegalTerm:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d > 0; d -= 1) {
            const node = $from.node(d);
            if (node.type.name === 'legalTerm') {
              if (dispatch) {
                const pos = $from.before(d);
                dispatch(state.tr.replaceWith(pos, pos + node.nodeSize, state.schema.text(node.textContent)));
              }
              return true;
            }
          }
          return false;
        },

      updateLegalTerm:
        (attrs) =>
        ({ state, dispatch }) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d >= 0; d -= 1) {
            const node = $from.node(d);
            if (node.type.name === 'legalTerm') {
              if (dispatch) dispatch(state.tr.setNodeMarkup($from.before(d), undefined, { ...node.attrs, ...attrs }));
              return true;
            }
          }
          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-t': () => {
        const { from, to } = this.editor.state.selection;
        if (from === to) return false;
        return this.editor.commands.setLegalTerm({ phonetic: '', definition: '' });
      },
    };
  },
});

export function legalTermSlug(text: string): string {
  return slug(text);
}
