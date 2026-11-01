import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { updateSidebarItem } from '@/server/modules/documents';

export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  level: z.enum(['REQUIRED', 'OPTIONAL']).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    updateSidebarItem(params.id, parseBody(schema, body), user);
    return { updated: true };
  });
}
