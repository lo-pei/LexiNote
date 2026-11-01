import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthArt } from '@/components/auth-art';
import { getSessionUser } from '@/server/auth';
import { LoginForm } from './login-form';

export const metadata = { title: '登录 · LexiNote' };
export const dynamic = 'force-dynamic';

/** 只接受站内路径，避免 ?next= 被拿来做开放跳转 */
function safeNext(value: string | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; account?: string };
}) {
  const user = await getSessionUser();
  const next = safeNext(searchParams.next);
  if (user) redirect(next ?? '/');

  return (
    <div className="gate">
      <AuthArt />
      <section className="gate__formwrap">
        <div className="gate__stack">
          <LoginForm next={next} presetAccount={searchParams.account ?? ''} />
          <div className="gate__legal">
            <p>
              这是独立部署的教学工具，与学校统一身份认证、教务系统没有打通。
              <Link href="/register">首次使用？用学号注册</Link>
            </p>
            <p className="gate__legal-links">
              <Link href="/privacy">隐私政策</Link>
              <span aria-hidden="true">·</span>
              <Link href="/terms">使用说明</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
