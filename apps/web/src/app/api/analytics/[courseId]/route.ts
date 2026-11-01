import { guard, requireUser } from '@/server/http';
import { overview } from '@/server/modules/analytics';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { courseId: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return overview(params.courseId, user);
  });
}
