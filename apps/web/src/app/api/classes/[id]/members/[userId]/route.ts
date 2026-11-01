import { guard, requireUser } from '@/server/http';
import { removeMember } from '@/server/modules/classes';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: { id: string; userId: string } }) {
  return guard(async () => {
    const user = await requireUser();
    removeMember(user, params.id, params.userId);
    return { removed: true as const };
  });
}
