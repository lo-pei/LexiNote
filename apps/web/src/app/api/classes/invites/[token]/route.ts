import { getSessionUser } from '@/server/auth';
import { guard, requireUser } from '@/server/http';
import { acceptInvite, previewInvite } from '@/server/modules/classes';

export const dynamic = 'force-dynamic';

/** 邀请预览：未登录也能读，用来在注册页展示「你要加入哪个班」 */
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  return guard(async () => {
    const user = await getSessionUser();
    return previewInvite(params.token, user);
  });
}

export async function POST(_request: Request, { params }: { params: { token: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return acceptInvite(user, params.token);
  });
}
