import { guard, requireUser } from '@/server/http';
import { getCourse } from '@/server/modules/courses';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return getCourse(params.id, user);
  });
}
