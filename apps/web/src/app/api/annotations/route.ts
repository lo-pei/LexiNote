import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { addAnnotation } from '@/server/modules/forum';

export const dynamic = 'force-dynamic';

const schema = z.object({
  targetType: z.enum(['POST', 'DOCUMENT_SNAPSHOT']),
  targetId: z.string().trim().min(1),
  content: z.string().trim().min(1, '批注内容不能为空。').max(1000),
  isPrivate: z.boolean().optional(),
});

export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    return addAnnotation(user, parseBody(schema, body));
  });
}
