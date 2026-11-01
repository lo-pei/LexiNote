import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { createPost, getTopic } from '@/server/modules/forum';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return getTopic(params.id, user);
  });
}

const schema = z.object({
  body: z.string().trim().min(1, '回复内容不能为空。').max(4000),
  parentPostId: z.string().trim().min(1).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    const payload = await request.json().catch(() => null);
    const parsed = parseBody(schema, payload);
    return createPost(params.id, user, parsed.body, parsed.parentPostId ?? null);
  });
}
