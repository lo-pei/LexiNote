import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { createInvite } from '@/server/modules/classes';

export const dynamic = 'force-dynamic';

const schema = z.object({
  note: z.string().trim().max(80).optional(),
  maxUses: z.number().int().min(0).max(500).optional(),
  expiresInDays: z.number().int().min(0).max(180).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    return createInvite(user, params.id, parseBody(schema, body ?? {}));
  });
}
