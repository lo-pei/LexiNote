import { z } from 'zod';
import { guard, notFound, parseBody, requireRole, requireUser } from '@/server/http';
import { reviewDraft } from '@/server/modules/ai/translation';

export const dynamic = 'force-dynamic';

const schema = z.object({
  id: z.string().trim().min(1),
  action: z.enum(['approve', 'reject']),
  /** approve 时允许教师直接改写译文：AI 草稿最常见的用法就是改两个词 */
  edited: z.string().trim().max(4000).optional(),
});

/** 审校一条 AI 草稿：通过即转 APPROVED，驳回则此后不再对该句调用模型。 */
export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    requireRole(user, 'TEACHER', 'ADMIN');
    const body = await request.json().catch(() => null);
    const { id, action, edited } = parseBody(schema, body);

    const result = reviewDraft(id, action, user, edited);
    if (!result) throw notFound('该译文不存在或已被处理。');
    return result;
  });
}
