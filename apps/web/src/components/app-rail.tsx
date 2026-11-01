'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Role, SessionUser } from '@ln/types';

interface NavItem {
  href: string;
  label: string;
  roles?: Role[];
  match?: (path: string) => boolean;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: '学习',
    items: [
      { href: '/', label: '课程', match: (p) => p === '/' || p.startsWith('/courses') },
      { href: '/plan', label: '课程安排', match: (p) => p.startsWith('/plan') },
      { href: '/classes', label: '班级', match: (p) => p.startsWith('/classes') },
      { href: '/library', label: '我的文档', match: (p) => p.startsWith('/library') || p.startsWith('/docs') },
      { href: '/wordbooks', label: '生词本', match: (p) => p.startsWith('/wordbooks') },
      { href: '/forum', label: '讨论区', match: (p) => p.startsWith('/forum') },
    ],
  },
  {
    label: '教学',
    items: [
      {
        href: '/analytics',
        label: '学情',
        roles: ['TEACHER', 'ADMIN'],
        match: (p) => p.startsWith('/analytics'),
      },
    ],
  },
  {
    label: '帮助',
    items: [
      {
        href: '/help',
        label: '使用说明',
        match: (p) => p.startsWith('/help') || p.startsWith('/admin'),
      },
    ],
  },
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
        {GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.roles || item.roles.includes(user.role));
          if (!items.length) return null;
          return (
            <div className="rail__group" key={group.label}>
              <span className="rail__label">{group.label}</span>
              {items.map((item) => {
                const active = item.match ? item.match(pathname) : pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rail__link${active ? ' rail__link--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="rail__bullet" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
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
        <button type="button" className="ln-btn ln-btn--quiet ln-btn--sm" onClick={signOut} disabled={busy}>
          {busy ? '正在退出…' : '退出登录'}
        </button>
      </div>
    </aside>
  );
}
