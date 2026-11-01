import { z } from 'zod';
import type { TiptapDoc } from '@ln/types';
import { guard, parseBody, requireUser } from '@/server/http';
import { getDocument, saveDocument } from '@/server/modules/documents';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return getDocument(params.id, user);
  });
}

const schema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  content: z.record(z.unknown()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);
    return saveDocument(params.id, user, {
      ...(parsed.title ? { title: parsed.title } : {}),
      ...(parsed.content ? { content: parsed.content as unknown as TiptapDoc } : {}),
      ...(parsed.status ? { status: parsed.status } : {}),
    });
  });
}
