import { z } from 'zod';
import { guard, notFound, parseBody, requireRole, requireUser } from '@/server/http';
import { reviewTermSuggestion } from '@/server/modules/ai/terms';

export const dynamic = 'force-dynamic';

const schema = z.object({
  id: z.string().trim().min(1),
  action: z.enum(['approve', 'reject']),
  /** 采纳时允许教师改写释义；改写后的文本才是进词库的那一版 */
  edited: z.string().trim().max(200).optional(),
});

/** 审校一条 AI 术语释义：采纳即迁入 vocabulary_entries。 */
export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    requireRole(user, 'TEACHER', 'ADMIN');
    const body = await request.json().catch(() => null);
    const { id, action, edited } = parseBody(schema, body);

    const result = reviewTermSuggestion(id, action, user, edited);
    if (!result) throw notFound('该术语建议不存在或已被处理。');
    return result;
  });
}
