import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { joinByCode } from '@/server/modules/classes';

export const dynamic = 'force-dynamic';

const schema = z.object({
  code: z.string().trim().min(4, '请输入 6 位班级码。').max(12),
});

export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);
    return joinByCode(user, parsed.code);
  });
}
