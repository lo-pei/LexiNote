import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    courseImage: {
      setCourseImage: (attrs: { src: string; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

/**
 * image —— 块级图片（说明书 §5.1）。src / alt / caption。
 * 仅允许 http(s) 与 / 开头的站内路径，避免 javascript: 协议注入。
 */
export const CourseImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).getAttribute('src'),
        renderHTML: (attrs) => (attrs.src ? { src: attrs.src } : {}),
      },
      alt: {
        default: '',
        parseHTML: (element) => (element as HTMLElement).getAttribute('alt') ?? '',
        renderHTML: (attrs) => ({ alt: attrs.alt ?? '' }),
      },
      caption: {
        default: '',
        parseHTML: (element) => (element as HTMLElement).getAttribute('data-caption') ?? '',
        renderHTML: (attrs) => (attrs.caption ? { 'data-caption': attrs.caption } : {}),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'figure[data-image]' },
      { tag: 'img[src]' },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const src = String(node.attrs.src ?? '');
    const safe = /^(https?:\/\/|\/)/i.test(src) ? src : '';
    const caption = String(node.attrs.caption ?? '');
    return [
      'figure',
      mergeAttributes(HTMLAttributes, { 'data-image': '' }),
      ['img', { src: safe, alt: String(node.attrs.alt ?? ''), loading: 'lazy' }],
      ...(caption ? [['figcaption', {}, caption]] : []),
    ];
  },

  addCommands() {
    return {
      setCourseImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
