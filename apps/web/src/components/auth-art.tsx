'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 登录 / 注册页共用的左侧画面：四组照片 + 四句关于「词语与法律」的引文，逐页轮播。
 *
 * 设计取舍：
 * 1) 每句引文配一张新闻摄影，文字的落点由照片本身的明暗决定——四张图各自
 *    给了不同的 align / 遮罩方向，不套同一个模板，避免压在人脸和主体上。
 * 2) 每 3 秒自动前进一页，鼠标移入或聚焦即暂停；页码点与键盘左右键都能手动翻页。
 *    不放左右箭头按钮，底部只留圆点，画面更干净。
 * 3) 窄屏（≤860px）画面整体隐藏，表单自己撑满，这几张图不进首屏下载。
 */
interface Slide {
  /** 图片文件（4:5，已按主体裁切） */
  photo: string;
  /** 引文正文 */
  quote: string;
  /** 出处 */
  by: string;
  /** 原文（西文作者给英文，中文作者留空） */
  original?: string;
  /** 文字块垂直位置 */
  align: 'top' | 'bottom';
  /** 暗角方向：决定遮罩从哪一侧压下来 */
  veil: 'top' | 'bottom' | 'left' | 'right';
  /** 图片焦点，窄屏裁切时保住主体 */
  focus?: string;
}

const SLIDES: Slide[] = [
  {
    photo: '/photos/gate-01.jpg',
    quote: '语言的界限意味着世界的界限。',
    by: '维特根斯坦',
    original: 'Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt.',
    // 黑白群像，人脸集中在中下部：文字压顶部，遮罩自上而下
    align: 'top',
    veil: 'top',
    focus: '50% 42%',
  },
  {
    photo: '/photos/gate-02.jpg',
    quote: '词语终究是符号，符号的意义随接受者心智中的知识与经验而变化。',
    by: '卡多佐',
    original: 'Words are symbols, and their meaning varies with the knowledge and experience of the mind that receives them.',
    // 法庭内景，被告偏左、法官在右：文字压左下，遮罩自左自下
    align: 'bottom',
    veil: 'left',
    focus: '46% 40%',
  },
  {
    photo: '/photos/gate-03.jpg',
    quote: '一个词并非水晶，透明且一成不变；它是活生生思想的外皮，其色彩与内容会随使用时的情境与时间而发生巨大变化。',
    by: '霍姆斯',
    original: 'A word is not a crystal, transparent and unchanged; it is the skin of a living thought.',
    // 大幅暗部在左下与顶部：文字压左下角，遮罩自左
    align: 'bottom',
    veil: 'left',
    focus: '52% 45%',
  },
  {
    photo: '/photos/gate-04.jpg',
    quote: '法律之明了，不尽在其条文之详尽，乃在其用意之明显，而民得其喻也。',
    by: '霍布斯',
    // 人群上部为亮天光，下部为深色衣影：文字压底部，遮罩自下
    align: 'bottom',
    veil: 'bottom',
    focus: '48% 40%',
  },
];

const INTERVAL = 3000;

export function AuthArt({ footer = 'LAW 2103 · 2026 秋季学期' }: { footer?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = SLIDES.length;
  const rootRef = useRef<HTMLElement | null>(null);

  const go = useCallback(
    (delta: number) => setIndex((current) => (current + delta + total) % total),
    [total],
  );

  // 每 3 秒自动前进；鼠标移入、聚焦或切到后台即停
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIndex((current) => (current + 1) % total), INTERVAL);
    return () => window.clearInterval(id);
  }, [paused, total]);

  // 左右方向键翻页；只在这一块有焦点或未聚焦别处时生效
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    }
  };

  return (
    <section
      className="gate__art"
      ref={rootRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
      aria-roledescription="轮播"
      aria-label="关于词语与法律的四则引文"
    >
      {/* 底图：四张常驻图层叠放，靠 opacity 交叉淡入，避免切图闪白 */}
      <div className="gate__art-media" aria-hidden="true">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.photo}
            className="gate__art-photo"
            data-on={i === index ? 'true' : 'false'}
            style={{
              backgroundImage: `url("${slide.photo}")`,
              backgroundPosition: slide.focus ?? '50% 50%',
            }}
          />
        ))}
        <div className="gate__art-veil" data-veil={SLIDES[index]!.veil} />
        <div className="gate__art-grain" />
      </div>

      <Link href="/login" className="rail__brand gate__art-brand">
        <span className="rail__mark" aria-hidden="true">
          L
        </span>
        <span>
          <span className="rail__name" style={{ color: 'var(--color-paper)' }}>
            LexiNote
          </span>
          <span className="rail__sub" style={{ color: 'color-mix(in oklab, var(--color-paper) 60%, transparent)' }}>
            法律英语精读
          </span>
        </span>
      </Link>

      <div className="gate__art-stage" data-align={SLIDES[index]!.align}>
        <div className="gate__art-slide" key={index}>
          <p className="gate__quote">{SLIDES[index]!.quote}</p>
          <p className="gate__cite">
            <span className="gate__cite-by">{SLIDES[index]!.by}</span>
            {SLIDES[index]!.original ? (
              <span className="gate__cite-orig">{SLIDES[index]!.original}</span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="gate__art-bar">
        {/* 只有页码点，不放左右箭头：四则引文靠自动轮播切换，点圆点可直接跳转 */}
        <span className="gate__art-dots">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.photo}
              type="button"
              className="gate__art-dot"
              data-on={i === index ? 'true' : 'false'}
              onClick={() => setIndex(i)}
              aria-label={`第 ${i + 1} 则：${slide.by}`}
              aria-current={i === index ? 'true' : undefined}
            />
          ))}
        </span>

        <div className="gate__art-foot">
          <span>{footer}</span>
          <span className="gate__art-legal">
            <Link href="/privacy">隐私政策</Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms">使用条款</Link>
          </span>
        </div>
      </div>
    </section>
  );
}