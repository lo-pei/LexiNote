'use client';

import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_KEY = 'ln:theme';

/**
 * 主题切换：日间 / 夜间 / 跟随系统。
 *
 * 三态而不是两态——「跟随系统」必须能被重新选回来，
 * 否则用户在夜里切一次日间，就再也回不到自动。
 *
 * 首屏防闪由 layout 里的内联脚本负责（在 React 水合前就把 data-theme 写好），
 * 这里只处理交互与系统偏好变化。
 */
function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function apply(mode: ThemeMode) {
  const theme = resolve(mode);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.mode = mode;
  // 让浏览器把滚动条、表单控件也切到对应色
  root.style.colorScheme = theme;
}

const OPTIONS: { value: ThemeMode; label: string; hint: string }[] = [
  { value: 'light', label: '日间', hint: '日间模式' },
  { value: 'dark', label: '夜间', hint: '夜间模式' },
  { value: 'system', label: '系统', hint: '跟随系统' },
];

function Icon({ mode }: { mode: ThemeMode }) {
  if (mode === 'light') {
    return (
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <circle cx="8" cy="8" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (mode === 'dark') {
    return (
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <path
          d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <rect x="1.8" y="2.6" width="12.4" height="8.4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.6 13.6h4.8M8 11v2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = (window.localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? 'system';
    const initial: ThemeMode = saved === 'light' || saved === 'dark' ? saved : 'system';
    setMode(initial);
    setReady(true);
    apply(initial);

    // 跟随系统时，系统配色变了要立刻跟上
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const current = (window.localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? 'system';
      if (current === 'system') apply('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const choose = (next: ThemeMode) => {
    setMode(next);
    window.localStorage.setItem(THEME_KEY, next);
    apply(next);
  };

  return (
    <div
      className={`theme${compact ? ' theme--compact' : ''}`}
      role="group"
      aria-label="外观"
      data-ready={ready ? 'true' : 'false'}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`theme__btn${mode === option.value ? ' theme__btn--on' : ''}`}
          onClick={() => choose(option.value)}
          aria-pressed={mode === option.value}
          title={option.hint}
        >
          <Icon mode={option.value} />
          <span className="theme__label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
