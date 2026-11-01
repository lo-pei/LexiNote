import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { addItem, listItems } from '@/server/modules/vocabulary';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return listItems(params.id, user);
  });
}

const schema = z.object({
  term: z.string().trim().min(1, '术语不能为空。').max(120),
  definitionZh: z.string().trim().min(1, '释义不能为空。').max(400),
  phonetic: z.string().trim().max(80).optional(),
  sourceType: z.enum(['COURSE', 'DOCUMENT', 'FORUM', 'MANUAL']),
  sourceDocId: z.string().trim().min(1).nullable().optional(),
  sourceContext: z.string().trim().max(400).nullable().optional(),
  courseId: z.string().trim().min(1).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);
    return addItem(user, { ...parsed, wordbookId: params.id });
  });
}
