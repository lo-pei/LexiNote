import { guard, requireUser } from '@/server/http';
import { deleteWordbook } from '@/server/modules/vocabulary';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    deleteWordbook(params.id, user);
    return { ok: true };
  });
}