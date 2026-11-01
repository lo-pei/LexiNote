import { guard, requireUser } from '@/server/http';
import { listSnapshots } from '@/server/modules/documents';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return listSnapshots(params.id, user);
  });
}
