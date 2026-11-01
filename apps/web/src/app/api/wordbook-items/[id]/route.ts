import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { removeItem, updateMastery } from '@/server/modules/vocabulary';

export const dynamic = 'force-dynamic';

const schema = z.object({ masteryLevel: z.number().int().min(0).max(3) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);
    updateMastery(params.id, parsed.masteryLevel, user);
    return { masteryLevel: parsed.masteryLevel };
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    removeItem(params.id, user);
    return { removed: true };
  });
}
