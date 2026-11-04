import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { draftTranslation } from '@/server/modules/ai/translation';

export const dynamic = 'force-dynamic';

const schema = z.object({
  // 只收原句、不收哈希：哈希统一在服务端算，避免两端归一化口径不一致导致的静默 miss
  text: z.string().trim().min(1).max(600),
});

/**
 * 句级译文 AI 草稿。已有记录直接返回（cached:true），不产生模型调用。
 * 未配置模型时返回 status:'UNAVAILABLE'，前端保持「暂无预置译文」的原样。
 */
export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const { text } = parseBody(schema, body);
    return draftTranslation(text, user);
  });
}
