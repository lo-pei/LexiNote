'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/client';

const LAST_ACCOUNT_KEY = 'ln:lastAccount';

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
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ account: account.trim(), password, remember }),
      });
      window.localStorage.setItem(LAST_ACCOUNT_KEY, account.trim());
      router.replace(next ?? '/');
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <form className="gate__form" onSubmit={submit}>
      <div>
        <h1 className="gate__title">回到你的读本</h1>
        <p className="gate__hint gate__hint--line">学号就是账号。课件、笔记、生词与讨论都留在你自己的账户里。</p>
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
          placeholder="例如 20230101"
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
        <span>
          在这台设备上保持登录 30 天
          <em>公用电脑请取消勾选，关闭浏览器即退出。</em>
        </span>
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
    </form>
  );
}
