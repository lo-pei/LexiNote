import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { setAnswer } from '@/server/modules/forum';

export const dynamic = 'force-dynamic';

const schema = z.object({
  isAnswer: z.boolean(),
  score: z.number().int().min(0).max(100).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);
    setAnswer(params.id, user, parsed.isAnswer, parsed.score ?? null);
    return { updated: true };
  });
}
