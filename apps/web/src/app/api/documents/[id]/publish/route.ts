import { guard, requireUser } from '@/server/http';
import { publishDocument } from '@/server/modules/documents';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    publishDocument(params.id, user);
    return { published: true };
  });
}
