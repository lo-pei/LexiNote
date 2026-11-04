'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { InvitePreview } from '@ln/types';
import { api, errorMessage } from '@/lib/client';

interface RegisterResponse {
  user: { id: string; name: string };
  join: { classId: string; className: string; alreadyMember: boolean; enrolledCourses: number } | null;
  joinWarning: string | null;
  classId: string | null;
}

export function RegisterForm({
  presetCode,
  inviteToken,
  invite,
  next,
}: {
  presetCode: string;
  inviteToken: string | null;
  invite: InvitePreview | null;
  next: string | null;
}) {
  const router = useRouter();
  const [loginNo, setLoginNo] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [classCode, setClassCode] = useState(presetCode);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!agree) {
      setError('请先确认你已了解密码安全提示。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          loginNo: loginNo.trim(),
          name: name.trim(),
          password,
          classCode: inviteToken ? null : classCode.trim() || null,
          inviteToken,
        }),
      });
      window.localStorage.setItem('ln:lastAccount', loginNo.trim());
      if (result.classId) {
        router.replace(`/classes/${result.classId}`);
      } else if (result.joinWarning) {
        router.replace('/?joinFailed=1');
      } else {
        router.replace(next ?? '/');
      }
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <form className="gate__form" onSubmit={submit}>
      <div>
        <h1 className="gate__title">建一个属于你的读本</h1>
        <p className="gate__hint" style={{ marginTop: 8 }}>
          学号即账号，注册后无需邮箱验证。已有账号？
          <Link className="gate__hint-link" href="/login">
            直接登录
          </Link>
        </p>
      </div>

      {invite ? (
        <div className="invite-brief">
          <span className="rail__label">你正在加入</span>
          <b>{invite.className}</b>
          <span>
            {invite.teacherName} · {invite.memberCount} 人
            {invite.term ? ` · ${invite.term}` : ''}
          </span>
          {invite.exhausted ? <em>这条邀请已过期或已用完，注册后仍可用班级码加入。</em> : null}
        </div>
      ) : null}

      <div className="grid grid--2" style={{ gap: 12 }}>
        <div className="ln-field">
          <label className="ln-label" htmlFor="loginNo">
            学号
          </label>
          <input
            id="loginNo"
            className="ln-input"
            value={loginNo}
            onChange={(event) => setLoginNo(event.target.value.replace(/\s/g, ''))}
            placeholder="26320001"
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            required
          />
        </div>
        <div className="ln-field">
          <label className="ln-label" htmlFor="name">
            姓名
          </label>
          <input
            id="name"
            className="ln-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="与教务系统一致"
            autoComplete="name"
            required
          />
        </div>
      </div>

      <div className="ln-field">
        <label className="ln-label" htmlFor="reg-password">
          密码
        </label>
        <input
          id="reg-password"
          className="ln-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <span className="ln-hint">至少 8 位，需含字母、数字或符号中的两类；不能与学号相同。</span>
      </div>

      <div className="warn-box">
        <b>请不要使用学校密码</b>
        <p>
          教务系统、校园门户的密码不要用在这里。本站独立部署，数据库与运维都不在校内；
          复用密码时，任一侧泄露都会危及成绩、选课与个人信息。请单独设一个只在这里用的密码。
        </p>
      </div>

      {inviteToken ? null : (
        <div className="ln-field">
          <label className="ln-label" htmlFor="classCode">
            班级码（可留空）
          </label>
          <input
            id="classCode"
            className="ln-input"
            value={classCode}
            onChange={(event) => setClassCode(event.target.value.toUpperCase())}
            placeholder="老师给的 6 位班级码，例如 LAW26A"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <span className="ln-hint ln-hint--nowrap">
            留空也能注册，登录后在「课程」首页用班级码或邀请链接加入。
          </span>
        </div>
      )}

      <label className="ln-check">
        <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
        <span>
          我已阅读上面的提示，并确认这里的密码与学校密码不同。
        </span>
      </label>

      {error ? (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      ) : null}

      <button className="ln-btn ln-btn--primary" type="submit" disabled={busy}>
        {busy ? '正在建号…' : '注册并登录'}
      </button>
    </form>
  );
}
