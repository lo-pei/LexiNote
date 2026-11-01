'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ClassInvite } from '@ln/types';
import { api, errorMessage } from '@/lib/client';

/* ── 复制 ───────────────────────────────────────────────── */

export function CopyButton({ value, label = '复制' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // 老浏览器或非安全上下文：退回选中提示，不假装成功
      window.prompt('手动复制下面的内容：', value);
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  };

  return (
    <button type="button" className="ln-btn ln-btn--quiet ln-btn--sm" onClick={copy}>
      {done ? '已复制' : label}
    </button>
  );
}

/* ── 班级码 ─────────────────────────────────────────────── */

export function ClassCodePanel({
  classId,
  joinCode,
  joinOpen,
  isOwner,
}: {
  classId: string;
  joinCode: string;
  joinOpen: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState(joinCode);
  const [open, setOpen] = useState(joinOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rotate = async () => {
    if (!window.confirm('重置后旧班级码立即失效，已加入的学生不受影响。确定重置？')) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ joinCode: string }>(`/api/classes/${classId}/code`, { method: 'POST' });
      setCode(result.joinCode);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const toggleOpen = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/classes/${classId}`, {
        method: 'PATCH',
        body: JSON.stringify({ joinOpen: !open }),
      });
      setOpen(!open);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card class-panel">
      <div className="section__head" style={{ marginBottom: 10 }}>
        <h2 className="section__title">班级码</h2>
        <span className={`ln-badge${open ? '' : ' ln-badge--quiet'}`}>{open ? '开放加入' : '已关闭'}</span>
      </div>
      <div className="code-row">
        <span className="code-big">{code}</span>
        <CopyButton value={code} label="复制班级码" />
      </div>
      <p className="ln-hint">
        学生在注册页或「班级」页输入这 6 位码即可入班，入班后自动选修本班课程。
        {isOwner ? ' 班级码外流时，重置一次最省事。' : ''}
      </p>
      {isOwner ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" className="ln-btn ln-btn--outline ln-btn--sm" onClick={rotate} disabled={busy}>
            重置班级码
          </button>
          <button type="button" className="ln-btn ln-btn--quiet ln-btn--sm" onClick={toggleOpen} disabled={busy}>
            {open ? '关闭班级码加入' : '重新开放加入'}
          </button>
        </div>
      ) : null}
      {error ? <div className="notice notice--error">{error}</div> : null}
    </section>
  );
}

/* ── 邀请链接 ───────────────────────────────────────────── */

function inviteUrl(token: string): string {
  if (typeof window === 'undefined') return `/join/${token}`;
  return `${window.location.origin}/join/${token}`;
}

export function InvitePanel({
  classId,
  invites,
  isOwner,
}: {
  classId: string;
  invites: ClassInvite[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [list, setList] = useState(invites);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await api<ClassInvite>(`/api/classes/${classId}/invites`, {
        method: 'POST',
        body: JSON.stringify(isOwner ? { maxUses: 0, expiresInDays: null } : { maxUses: 3, expiresInDays: 7 }),
      });
      setList([created, ...list]);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card class-panel">
      <div className="section__head" style={{ marginBottom: 10 }}>
        <h2 className="section__title">邀请链接</h2>
        <span className="section__hint">{isOwner ? '不限次数，可随时停用' : '每位同学最多带 3 人，7 天有效'}</span>
      </div>
      <p className="ln-hint">
        链接发给同学，对方打开后注册或登录即自动入班，不必再输班级码。
      </p>
      <button type="button" className="ln-btn ln-btn--outline ln-btn--sm" onClick={create} disabled={busy}>
        {busy ? '生成中…' : '生成一条邀请链接'}
      </button>

      {list.length ? (
        <div className="invite-list">
          {list.map((invite) => {
            const used = invite.maxUses > 0 ? `${invite.usedCount}/${invite.maxUses} 次` : `已用 ${invite.usedCount} 次`;
            const expired = invite.expiresAt ? new Date(invite.expiresAt).getTime() < Date.now() : false;
            return (
              <div className="invite-row" key={invite.id}>
                <div className="invite-row__main">
                  <span className="invite-row__url" title={`/join/${invite.token}`}>
                    /join/{invite.token}
                  </span>
                  <span className="invite-row__meta">
                    {invite.createdByName} 生成 · {used}
                    {invite.expiresAt ? ` · ${expired ? '已过期' : `${new Date(invite.expiresAt).toLocaleDateString('zh-CN')} 到期`}` : ''}
                  </span>
                </div>
                <CopyButton value={inviteUrl(invite.token)} label="复制链接" />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="ln-hint" style={{ marginTop: 10 }}>
          还没有生成过邀请链接。
        </p>
      )}
      {error ? <div className="notice notice--error">{error}</div> : null}
    </section>
  );
}

/* ── 成员操作 ───────────────────────────────────────────── */

export function RemoveMember({ classId, userId, name }: { classId: string; userId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!window.confirm(`把 ${name} 移出班级？已选修的课程与笔记会保留。`)) return;
    setBusy(true);
    try {
      await api(`/api/classes/${classId}/members/${userId}`, { method: 'DELETE' });
      router.refresh();
    } catch (cause) {
      window.alert(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="ln-btn ln-btn--danger ln-btn--sm" onClick={run} disabled={busy}>
      移出
    </button>
  );
}

export function LeaveClass({ classId }: { classId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!window.confirm('退出班级？已选修的课程与笔记会保留，但不再收到这个班的新课程。')) return;
    setBusy(true);
    try {
      await api(`/api/classes/${classId}/leave`, { method: 'POST' });
      router.push('/classes');
      router.refresh();
    } catch (cause) {
      window.alert(errorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <button type="button" className="ln-btn ln-btn--quiet ln-btn--sm" onClick={run} disabled={busy}>
      {busy ? '退出中…' : '退出班级'}
    </button>
  );
}
