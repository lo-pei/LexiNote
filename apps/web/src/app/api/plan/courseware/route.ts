import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { selectCourseware } from '@/server/modules/teaching-plan';

export const dynamic = 'force-dynamic';

const schema = z.object({
  coursewareId: z.string().trim().min(1, '请选择一套授课课件。'),
});

export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    selectCourseware(parseBody(schema, body).coursewareId, user);
    return { ok: true };
  });
}
