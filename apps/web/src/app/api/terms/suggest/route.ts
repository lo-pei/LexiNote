import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { suggestTerm } from '@/server/modules/ai/terms';

export const dynamic = 'force-dynamic';

const schema = z.object({
  term: z.string().trim().min(1).max(80),
  // 语境释义必须带句子，否则退回普通词典义，这个功能就失去意义了
  sentence: z.string().trim().min(1).max(600),
});

/** 术语在某句中的语境释义（AI 草稿，教师采纳后进正式词库）。 */
export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const { term, sentence } = parseBody(schema, body);
    return suggestTerm(term, sentence, user);
  });
}
