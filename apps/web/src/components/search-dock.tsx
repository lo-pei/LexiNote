'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * 常驻底部的搜索栏。
 *
 * 原先「搜索」是侧栏里的一个入口，要先想起来、再点进去才能查。
 * 检索是随时发生的动作（读到一半想找另一个课件），所以改成吸底常驻：
 * 在任何页面都能直接输入，回车跳到 /search?q=。
 *
 * 两个细节：
 * - /search 页自身有检索框，底栏在这一页隐藏，避免两个输入框抢焦点；
 * - 按 `/` 聚焦（不劫持正在输入的场景），是检索类界面的通用习惯。
 */
export function SearchDock() {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const hidden = pathname.startsWith('/search');

  useEffect(() => {
    if (hidden) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typing) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hidden]);

  if (hidden) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form className="searchdock" role="search" onSubmit={submit}>
      <svg className="searchdock__icon" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        className="searchdock__input"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="搜索课件、笔记、教材、法条"
        aria-label="全站搜索"
        spellCheck={false}
      />
      <kbd className="searchdock__kbd" aria-hidden="true">
        /
      </kbd>
      <button className="searchdock__go" type="submit" disabled={!value.trim()}>
        搜索
      </button>
    </form>
  );
}
