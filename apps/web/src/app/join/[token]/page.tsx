import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/server/auth';
import { previewInvite } from '@/server/modules/classes';
import type { InvitePreview } from '@ln/types';
import { JoinButton } from './join-button';

export const metadata = { title: '班级邀请 · LexiNote' };
export const dynamic = 'force-dynamic';

export default async function JoinPage({ params }: { params: { token: string } }) {
  const user = await getSessionUser();

  let invite: InvitePreview | null = null;
  try {
    invite = previewInvite(params.token, user);
  } catch {
    invite = null;
  }
  if (!invite) notFound();

  const next = `/join/${params.token}`;
  const registerHref = `/register?invite=${encodeURIComponent(params.token)}&next=${encodeURIComponent(next)}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="landing">
      <header className="landing__top">
        <Link href="/" className="rail__brand" style={{ padding: 0 }}>
          <span className="rail__mark" aria-hidden="true">
            L
          </span>
          <span>
            <span className="rail__name">LexiNote</span>
            <span className="rail__sub">法律英语精读</span>
          </span>
        </Link>
        <span className="eyebrow-free-label">班级邀请</span>
      </header>

      <main className="landing__card">
        <span className="rail__label">你被邀请加入</span>
        <h1 className="landing__title">{invite.className}</h1>
        <p className="landing__meta">
          {invite.teacherName} 老师
          {invite.term ? ` · ${invite.term}` : ''} · {invite.memberCount} 人 · {invite.courseCount} 门课
        </p>
        {invite.note ? <p className="landing__note">{invite.note}</p> : null}

        {invite.exhausted ? (
          <div className="notice notice--error" style={{ marginTop: 22 }}>
            这条邀请链接已过期或用完。仍想加入？请向 {invite.teacherName} 老师要一个新的链接，或直接使用 6 位班级码。
          </div>
        ) : invite.alreadyMember ? (
          <div className="landing__actions">
            <p className="ln-hint">你已经在班内，可以直接进入。</p>
            <Link className="ln-btn ln-btn--primary" href={`/classes/${invite.classId}`}>
              进入班级
            </Link>
          </div>
        ) : user ? (
          <div className="landing__actions">
            <JoinButton token={invite.token} />
            <p className="ln-hint">
              加入后自动选修该班已开设的 {invite.courseCount} 门课程；以后可从左侧「班级」进入。
            </p>
          </div>
        ) : (
          <div className="landing__actions">
            <Link className="ln-btn ln-btn--primary" href={registerHref}>
              用学号注册并加入
            </Link>
            <Link className="ln-btn ln-btn--outline" href={loginHref}>
              我已有账号，先登录
            </Link>
            <p className="ln-hint">注册只需要学号、姓名与一个只在这里使用的密码。</p>
          </div>
        )}
      </main>
    </div>
  );
}
