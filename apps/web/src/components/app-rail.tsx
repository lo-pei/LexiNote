'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Role, SessionUser } from '@ln/types';
import { ThemeToggle } from './theme-toggle';

interface NavItem {
  href: string;
  label: string;
  /** 教师端显示的名字（与 label 不同处只有「我的文档 / 我的课件」） */
  teacherLabel?: string;
  roles?: Role[];
  match?: (path: string) => boolean;
}

/** 侧栏只有一个平铺列表，不再分组，也就没有目录标题 */
const NAV_ITEMS: NavItem[] = [
  // 班级已并进课程页：一门课一个班，班级码、名册、学情都在课程里
  { href: '/', label: '课程', match: (p) => p === '/' || p.startsWith('/courses') || p.startsWith('/classes') },
  { href: '/plan', label: '课程安排', match: (p) => p.startsWith('/plan') },
  {
    href: '/library',
    label: '我的文档',
    teacherLabel: '我的课件',
    match: (p) => p.startsWith('/library') || p.startsWith('/docs'),
  },
  { href: '/wordbooks', label: '生词本', match: (p) => p.startsWith('/wordbooks') },
  { href: '/forum', label: '讨论区', match: (p) => p.startsWith('/forum') },
  // 教材可直接精读，排在纯书目的「推荐阅读」之前
  { href: '/textbooks', label: '教材', match: (p) => p.startsWith('/textbooks') },
  // 推荐阅读排在导航末位
  { href: '/readings', label: '推荐阅读', match: (p) => p.startsWith('/readings') },
];

/**
 * 使用说明、隐私政策、使用条款不再占导航位，统一收到侧栏最底部。
 * 三者在视觉上比主导航弱一档，但始终可见，不用翻页找。
 */
const FOOT_LINKS: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: '/help', label: '使用说明', match: (p) => p === '/help' || p.startsWith('/admin') },
  { href: '/help/privacy', label: '隐私政策', match: (p) => p.startsWith('/help/privacy') },
  { href: '/help/terms', label: '使用条款', match: (p) => p.startsWith('/help/terms') },
];

const ROLE_LABEL: Record<Role, string> = { ADMIN: '管理员', TEACHER: '教师', STUDENT: '学生' };

export function AppRail({ user }: { user: SessionUser }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="rail">
      <Link href="/" className="rail__brand" aria-label="LexiNote 首页">
        <span className="rail__mark" aria-hidden="true">
          L
        </span>
        <span>
          <span className="rail__name">LexiNote</span>
          <span className="rail__sub">法律英语精读</span>
        </span>
      </Link>

      <nav className="rail__nav" aria-label="主导航">
        {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => {
          const active = item.match ? item.match(pathname) : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rail__link${active ? ' rail__link--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="rail__bullet" aria-hidden="true" />
              {user.role !== 'STUDENT' && item.teacherLabel ? item.teacherLabel : item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rail__foot">
        <div className="rail__user">
          <span className="avatar" aria-hidden="true">
            {user.initials}
          </span>
          <span>
            <span className="rail__user-name">{user.name}</span>
            <span className="rail__user-role">
              {ROLE_LABEL[user.role]} · {user.loginNo}
            </span>
          </span>
        </div>
        <ThemeToggle />
        <button type="button" className="rail__signout" onClick={signOut} disabled={busy}>
          {busy ? '正在退出…' : '退出登录'}
        </button>
      </div>

      <nav className="rail__legal" aria-label="帮助文档">
        {FOOT_LINKS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rail__legal-link${active ? ' rail__legal-link--on' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
