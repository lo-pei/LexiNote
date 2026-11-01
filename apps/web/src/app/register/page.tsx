import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthArt } from '@/components/auth-art';
import { getSessionUser } from '@/server/auth';
import { previewInvite } from '@/server/modules/classes';
import type { InvitePreview } from '@ln/types';
import { RegisterForm } from './register-form';

export const metadata = { title: '注册 · LexiNote' };
export const dynamic = 'force-dynamic';

function safeNext(value: string | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { code?: string; invite?: string; next?: string };
}) {
  const user = await getSessionUser();
  const next = safeNext(searchParams.next);
  if (user) redirect(next ?? '/');

  let invite: InvitePreview | null = null;
  if (searchParams.invite) {
    try {
      invite = previewInvite(searchParams.invite, null);
    } catch {
      invite = null;
    }
  }

  return (
    <div className="gate">
      <AuthArt footer="注册即建号 · 学号即账号" />
      <section className="gate__formwrap">
        <div className="gate__stack">
          <RegisterForm
            presetCode={searchParams.code ?? ''}
            inviteToken={invite ? searchParams.invite! : null}
            invite={invite}
            next={next}
          />
          <p className="gate__legal" style={{ width: '100%' }}>
            注册即表示你已阅读<Link href="/privacy">隐私政策</Link>与<Link href="/terms">使用条款</Link>：
            数据只存在本课程的部署机上，用于教学；请为这里单独设一个密码。
          </p>
        </div>
      </section>
    </div>
  );
}
