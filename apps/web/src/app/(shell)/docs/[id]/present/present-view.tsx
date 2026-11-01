'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EditorShell } from '@ln/editor';
import type { TiptapDoc, TiptapNode } from '@ln/types';

/**
 * 演示态（投屏用）。
 *
 * 整屏铺满、一屏一段：把文章按「渲染后的真实高度」切成若干屏，
 * 每一屏刚好落在可视区域之内，滚轮/方向键一次只前进一屏，
 * 因此不会出现上一屏的尾巴留在下半页、需要再滚一下才看完的情况。
 *
 * 切分完全依据脚本测出的版面高度（而不是字数估算），
 * 排版或字号变化后重新测量即可，不需要手工调分页参数。
 */

interface Slice {
  start: number;
  end: number;
  /** 单块超过一屏时按比例缩小，保证不出现内部滚动条 */
  zoom: number;
}

const isHeading = (node: TiptapNode | undefined): boolean => node?.type === 'heading';

export function PresentView({
  id,
  title,
  content,
  initial = 0,
}: {
  id: string;
  title: string;
  content: TiptapDoc;
  /** 从第几屏开始（?p=3），讲课时可以直接跳页 */
  initial?: number;
}) {
  const blocks = useMemo<TiptapNode[]>(() => content.content ?? [], [content]);
  const [slices, setSlices] = useState<Slice[]>([]);
  const [index, setIndex] = useState(Math.max(0, initial));
  const [chrome, setChrome] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(0);
  const wheelAccRef = useRef(0);
  const wheelAtRef = useRef(0);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── 测量与切分 ─────────────────────────────────────── */

  const measure = useCallback(() => {
    const sheet = sheetRef.current;
    const meter = meterRef.current;
    if (!sheet || !meter) return;

    const sheetBox = sheet.getBoundingClientRect();
    const sheetStyle = window.getComputedStyle(sheet);
    const available =
      sheetBox.height - Number.parseFloat(sheetStyle.paddingTop) - Number.parseFloat(sheetStyle.paddingBottom);
    if (!(available > 0) || !blocks.length) return;

    const nodes = Array.from(meter.querySelectorAll<HTMLElement>('.ln-prose > *'));
    const count = Math.min(nodes.length, blocks.length);
    if (!count) {
      setSlices([{ start: 0, end: blocks.length - 1, zoom: 1 }]);
      return;
    }

    const meterBox = meter.getBoundingClientRect();
    const meterStyle = window.getComputedStyle(meter);
    const origin = meterBox.top + Number.parseFloat(meterStyle.paddingTop);
    const tops: number[] = [];
    const bottoms: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const rect = nodes[i]!.getBoundingClientRect();
      tops.push(rect.top - origin);
      bottoms.push(rect.bottom - origin);
    }

    const out: Slice[] = [];
    let i = 0;
    while (i < blocks.length) {
      if (i >= count) {
        // 少数节点没有渲染成顶层元素（例如空段落被合并），剩下的各自单独成屏
        out.push({ start: i, end: blocks.length - 1, zoom: 1 });
        break;
      }
      const top = tops[i]!;
      const fits = (idx: number) => idx < count && idx < blocks.length && bottoms[idx]! - top <= available;
      let end = i;
      while (fits(end + 1)) {
        const next = end + 1;
        // 标题底下至少要跟一段正文；跟不住就把它整体挪到下一屏，别让大标题掉在页脚
        if (isHeading(blocks[next]) && next + 1 < blocks.length && !fits(next + 2)) break;
        end = next;
      }
      // 页尾还是标题（例如只剩标题一块）时往前收一块
      while (end > i && isHeading(blocks[end])) end -= 1;

      const height = bottoms[end]! - top;
      const zoom = height > available ? Math.max(0.45, available / height) : 1;
      out.push({ start: i, end, zoom });
      i = end + 1;
    }

    setSlices(out);
    setIndex((current) => Math.min(current, Math.max(0, out.length - 1)));
  }, [blocks]);

  useLayoutEffect(() => {
    measure();
    // 字体晚到会改变行高，等字体就绪再测一次
    void document.fonts?.ready.then(() => measure());
    const observer = new ResizeObserver(() => measure());
    if (stageRef.current) observer.observe(stageRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  /* ── 翻屏 ───────────────────────────────────────────── */

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => Math.max(0, Math.min(Math.max(0, slices.length - 1), current + delta)));
    },
    [slices.length],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const now = performance.now();
      if (now - lockRef.current < 460) return;
      // 停顿超过 260ms 视为新一轮滚动，避免上一段惯性把余量带过来
      if (now - wheelAtRef.current > 260) wheelAccRef.current = 0;
      wheelAtRef.current = now;
      wheelAccRef.current += event.deltaY;
      if (Math.abs(wheelAccRef.current) < 18) return;
      const delta = wheelAccRef.current > 0 ? 1 : -1;
      wheelAccRef.current = 0;
      lockRef.current = now;
      go(delta);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [go]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* 浏览器拒绝全屏时保持窗口最大化即可 */
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        go(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        go(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        setIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setIndex(Math.max(0, slices.length - 1));
      } else if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        void toggleFullscreen();
      } else if (event.key === 'Escape') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else window.location.href = `/docs/${id}`;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, id, slices.length, toggleFullscreen]);

  // 静止两秒半后收起浮层，把屏幕完整让给正文；动一下就回来
  const wake = useCallback(() => {
    setChrome(true);
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => setChrome(false), 2600);
  }, []);

  useEffect(() => {
    wake();
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [wake]);

  const slice = slices[index];
  const pageContent = useMemo<TiptapDoc>(
    () => ({ type: 'doc', content: slice ? blocks.slice(slice.start, slice.end + 1) : [] }),
    [blocks, slice],
  );
  const total = slices.length || 1;

  return (
    <div className={`present${chrome ? ' present--awake' : ''}`} onMouseMove={wake} onTouchStart={wake}>
      <div className="present__stage" ref={stageRef}>
        <div className="present__sheet" ref={sheetRef}>
          <div
            className="present__page"
            style={slice && slice.zoom < 1 ? { zoom: slice.zoom, width: `${100 / slice.zoom}%` } : undefined}
          >
            {/* Tiptap 实例只在挂载时取一次 content，换屏必须换 key 才会重挂 */}
            <EditorShell
              key={slice ? `${slice.start}-${slice.end}` : 'empty'}
              content={pageContent}
              mode="presentation"
              ariaLabel={title}
            />
          </div>
        </div>
      </div>

      {/* 离屏量版：与正式版面同宽同字，只用来取每块的真实高度 */}
      <div className="present__meter" aria-hidden="true">
        <div className="present__sheet" ref={meterRef}>
          <div className="present__page">
            <EditorShell content={content} mode="presentation" />
          </div>
        </div>
      </div>

      <div className="present__chrome">
        <div className="present__bar">
          <Link className="present__exit" href={`/docs/${id}`}>
            ← 退出
          </Link>
          <span className="present__title">{title}</span>
          <span className="present__count tnum">
            {index + 1} / {total}
          </span>
          <button type="button" className="present__nav present__nav--ghost" onClick={() => void toggleFullscreen()}>
            {fullscreen ? '退出全屏' : '全屏'}
          </button>
        </div>

        <div className="present__foot">
          <button type="button" className="present__nav" onClick={() => go(-1)} disabled={index === 0}>
            上一屏
          </button>
          <div className="present__progress" role="tablist" aria-label="演示分屏">
            {slices.map((item, dotIndex) => (
              <button
                key={`${item.start}-${item.end}`}
                type="button"
                className={`present__tick${dotIndex === index ? ' present__tick--on' : ''}`}
                onClick={() => setIndex(dotIndex)}
                aria-label={`第 ${dotIndex + 1} 屏`}
                aria-selected={dotIndex === index}
                role="tab"
              />
            ))}
          </div>
          <button type="button" className="present__nav" onClick={() => go(1)} disabled={index >= total - 1}>
            下一屏
          </button>
        </div>
      </div>
    </div>
  );
}
