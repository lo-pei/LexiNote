import { Node, mergeAttributes } from '@tiptap/core';
import type { FlowchartData } from '@ln/types';

const NODE_W = 172;
const NODE_H = 52;
const PAD = 34;
const TONE: Record<string, { fill: string; stroke: string; text: string }> = {
  ink: { fill: 'var(--ink)', stroke: 'var(--ink)', text: 'var(--paper)' },
  accent: { fill: 'var(--accent-wash)', stroke: 'var(--accent)', text: 'var(--accent-ink)' },
  quiet: { fill: 'var(--paper)', stroke: 'var(--rule)', text: 'var(--ink)' },
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string> = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/**
 * flowchart —— 块级流程图（说明书 §5.1）。
 * attrs.data 与 React Flow 的 nodes/edges 形状兼容，可后续直接替换渲染器；
 * 学生端 editable=false 时为纯只读视图。
 */
export const Flowchart = Node.create({
  name: 'flowchart',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      data: {
        default: { nodes: [], edges: [] } as FlowchartData,
        parseHTML: (element) => {
          const raw = (element as HTMLElement).getAttribute('data-graph');
          if (!raw) return { nodes: [], edges: [] };
          try {
            return JSON.parse(raw) as FlowchartData;
          } catch {
            return { nodes: [], edges: [] };
          }
        },
        renderHTML: (attrs) => ({ 'data-graph': JSON.stringify(attrs.data) }),
      },
      editable: {
        default: false,
        parseHTML: (element) => (element as HTMLElement).getAttribute('data-editable') === 'true',
        renderHTML: (attrs) => ({ 'data-editable': String(Boolean(attrs.editable)) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-flowchart]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes, { 'data-flowchart': '' })];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'ln-flow';

      const svg = el('svg', { class: 'ln-flow__svg', role: 'img' });
      wrapper.appendChild(svg);

      const render = (current: FlowchartData, editable: boolean) => {
        svg.replaceChildren();
        const nodes = current.nodes ?? [];
        const edges = current.edges ?? [];
        if (!nodes.length) {
          const empty = document.createElement('div');
          empty.className = 'ln-flow__empty';
          empty.textContent = '流程图暂无节点';
          wrapper.replaceChildren(empty);
          return;
        }
        if (!wrapper.contains(svg)) wrapper.replaceChildren(svg);

        const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_W));
        const maxY = Math.max(...nodes.map((n) => n.position.y + NODE_H));
        const width = maxX + PAD;
        const height = maxY + PAD;
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', '100%');
        svg.style.aspectRatio = `${width} / ${height}`;

        const defs = el('defs');
        const marker = el('marker', {
          id: 'ln-flow-arrow',
          viewBox: '0 0 10 10',
          refX: '9',
          refY: '5',
          markerWidth: '7',
          markerHeight: '7',
          orient: 'auto-start-reverse',
        });
        marker.appendChild(el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'var(--ink-3)' }));
        defs.appendChild(marker);
        svg.appendChild(defs);

        const byId = new Map(nodes.map((n) => [n.id, n]));
        for (const edge of edges) {
          const a = byId.get(edge.source);
          const b = byId.get(edge.target);
          if (!a || !b) continue;
          const x1 = a.position.x + NODE_W;
          const y1 = a.position.y + NODE_H / 2;
          const x2 = b.position.x;
          const y2 = b.position.y + NODE_H / 2;
          const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
          let d: string;
          if (horizontal) {
            const mid = Math.max(24, Math.abs(x2 - x1) * 0.45);
            d = `M ${x1} ${y1} C ${x1 + mid} ${y1}, ${x2 - mid} ${y2}, ${x2} ${y2}`;
          } else {
            const sx = a.position.x + NODE_W / 2;
            const sy = a.position.y + NODE_H;
            const tx = b.position.x + NODE_W / 2;
            const ty = b.position.y;
            const mid = Math.max(24, Math.abs(ty - sy) * 0.45);
            d = `M ${sx} ${sy} C ${sx} ${sy + mid}, ${tx} ${ty - mid}, ${tx} ${ty}`;
          }
          svg.appendChild(
            el('path', {
              d,
              fill: 'none',
              stroke: 'var(--ink-3)',
              'stroke-width': '1.25',
              'marker-end': 'url(#ln-flow-arrow)',
            }),
          );
        }

        for (const n of nodes) {
          const tone = TONE[n.data.tone ?? 'quiet'] ?? TONE.quiet!;
          const g = el('g', { class: 'ln-flow__node', 'data-node-id': n.id });
          g.setAttribute('transform', `translate(${n.position.x} ${n.position.y})`);
          g.appendChild(
            el('rect', {
              width: String(NODE_W),
              height: String(NODE_H),
              rx: '2',
              fill: tone.fill,
              stroke: tone.stroke,
              'stroke-width': '1',
            }),
          );
          const fo = el('foreignObject', {
            x: '0',
            y: '0',
            width: String(NODE_W),
            height: String(NODE_H),
          });
          const box = document.createElement('div');
          box.className = 'ln-flow__label';
          box.style.color = tone.text;
          box.textContent = n.data.label;
          fo.appendChild(box);
          g.appendChild(fo);
          svg.appendChild(g);

          if (editable) {
            g.style.cursor = 'grab';
            let start: { x: number; y: number; ox: number; oy: number } | null = null;

            const onMove = (ev: PointerEvent) => {
              if (!start) return;
              const scale = width / (svg.getBoundingClientRect().width || width);
              const nx = Math.max(0, start.ox + (ev.clientX - start.x) * scale);
              const ny = Math.max(0, start.oy + (ev.clientY - start.y) * scale);
              n.position = { x: Math.round(nx / 8) * 8, y: Math.round(ny / 8) * 8 };
              g.setAttribute('transform', `translate(${n.position.x} ${n.position.y})`);
            };

            const onUp = () => {
              start = null;
              g.style.cursor = 'grab';
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
              if (typeof getPos === 'function') {
                editor.view.dispatch(
                  editor.view.state.tr.setNodeMarkup(getPos(), undefined, {
                    ...editor.view.state.doc.nodeAt(getPos())?.attrs,
                    data: { nodes: [...nodes], edges: [...edges] },
                  }),
                );
              }
            };

            g.addEventListener('pointerdown', (ev) => {
              const pe = ev as PointerEvent;
              pe.preventDefault();
              start = { x: pe.clientX, y: pe.clientY, ox: n.position.x, oy: n.position.y };
              g.style.cursor = 'grabbing';
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
            });
          }
        }
      };

      let attrs = node.attrs as { data: FlowchartData; editable: boolean };
      render(attrs.data, attrs.editable);
      if (attrs.editable) wrapper.setAttribute('data-editable', 'true');

      return {
        dom: wrapper,
        update: (updated) => {
          if (updated.type.name !== node.type.name) return false;
          attrs = updated.attrs as { data: FlowchartData; editable: boolean };
          render(attrs.data, attrs.editable);
          return true;
        },
        stopEvent: () => false,
        ignoreMutation: () => true,
      };
    };
  },
});
