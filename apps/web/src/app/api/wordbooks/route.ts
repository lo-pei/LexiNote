import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { createWordbook, listWordbooks } from '@/server/modules/vocabulary';

export const dynamic = 'force-dynamic';

export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    return listWordbooks(user);
  });
}

const schema = z.object({
  name: z.string().trim().min(1, '请填写词表名称。').max(60),
  description: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);
    return createWordbook(user, parsed.name, parsed.description);
  });
}
