import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { createClass, listClasses } from '@/server/modules/classes';

export const dynamic = 'force-dynamic';

export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    return listClasses(user);
  });
}

const schema = z.object({
  name: z.string().trim().min(2, '班级名称至少 2 个字。').max(48, '班级名称不要超过 48 个字。'),
  term: z.string().trim().max(60).optional(),
  description: z.string().trim().max(400).optional(),
});

export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    return createClass(user, parseBody(schema, body));
  });
}
