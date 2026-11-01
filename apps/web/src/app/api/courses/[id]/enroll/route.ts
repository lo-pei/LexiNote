import { guard, requireUser } from '@/server/http';
import { enroll } from '@/server/modules/courses';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return enroll(params.id, user);
  });
}
