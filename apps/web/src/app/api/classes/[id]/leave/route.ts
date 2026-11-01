import { guard, requireUser } from '@/server/http';
import { leaveClass } from '@/server/modules/classes';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    leaveClass(user, params.id);
    return { left: true as const };
  });
}
