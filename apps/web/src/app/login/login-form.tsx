'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/client';

const LAST_ACCOUNT_KEY = 'ln:lastAccount';

/** 演示账号：与种子数据一致（npm run db:reset 会重建这两个号） */
const DEMO_PASSWORD = 'lexinote';
const DEMO_ACCOUNTS = [
  { account: '26320001', label: '学生', name: '林知远' },
  { account: 'T202601', label: '教师', name: '王红燕' },
];

export function LoginForm({ next, presetAccount }: { next: string | null; presetAccount: string }) {
  const router = useRouter();
  const [account, setAccount] = useState(presetAccount);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 自动记住上次使用的学号（只存在本机浏览器里，不上传）
  useEffect(() => {
    if (presetAccount) return;
    const saved = window.localStorage.getItem(LAST_ACCOUNT_KEY);
    if (saved) setAccount(saved);
  }, [presetAccount]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await login(account, password);
  };

  const login = async (accountNo: string, pass: string) => {
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ account: accountNo.trim(), password: pass, remember }),
      });
      window.localStorage.setItem(LAST_ACCOUNT_KEY, accountNo.trim());
      router.replace(next ?? '/');
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  /** 快捷登录：填好演示账号与口令，随即提交 */
  const quick = (accountNo: string) => {
    setAccount(accountNo);
    setPassword(DEMO_PASSWORD);
    void login(accountNo, DEMO_PASSWORD);
  };

  return (
    <form className="gate__form" onSubmit={submit}>
      <div>
        <h1 className="gate__title">回到你的读本</h1>
      </div>

      <div className="ln-field">
        <label className="ln-label" htmlFor="account">
          学号 / 工号
        </label>
        <input
          id="account"
          className="ln-input"
          type="text"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          value={account}
          onChange={(event) => setAccount(event.target.value)}
          placeholder="例如 26320001"
          required
        />
      </div>

      <div className="ln-field">
        <label className="ln-label" htmlFor="password">
          密码
        </label>
        <input
          id="password"
          className="ln-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <span className="ln-hint">密码至少 8 位，不要与学校统一身份认证的密码相同。</span>
      </div>

      <label className="ln-check">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
        />
        <span>在这台设备上保持登录 30 天</span>
      </label>

      {error ? (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      ) : null}

      <button className="ln-btn ln-btn--primary" type="submit" disabled={busy || !account.trim() || !password}>
        {busy ? '正在验证…' : '登录'}
      </button>

      <div className="gate__switch">
        还没有账号？<Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}>用学号注册</Link>
      </div>

      {/* 演示入口：只填演示库里的两个种子号，点一下直接登录 */}
      <div className="gate__quick">
        <span className="gate__quick-label">快捷登录（演示账号）</span>
        <div className="gate__quick-row">
          {DEMO_ACCOUNTS.map((item) => (
            <button
              key={item.account}
              type="button"
              className="gate__quick-btn"
              onClick={() => quick(item.account)}
              disabled={busy}
              title={`${item.name} · ${item.account} · 口令 ${DEMO_PASSWORD}`}
            >
              <b>{item.label}</b>
              <span>{item.account}</span>
            </button>
          ))}
        </div>
        <span className="gate__quick-note">
          演示库口令统一为 <code>{DEMO_PASSWORD}</code>；正式使用请用学号自行注册。
        </span>
      </div>
    </form>
  );
}
