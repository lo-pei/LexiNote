import { redirect } from 'next/navigation';
import { getSessionUser } from '@/server/auth';
import { AppRail } from '@/components/app-rail';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="shell">
      <AppRail user={user} />
      <main className="shell__main">{children}</main>
    </div>
  );
}
