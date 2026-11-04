import { guard, requireUser } from '@/server/http';
import { aiStatus } from '@/server/modules/ai/provider';

export const dynamic = 'force-dynamic';

/**
 * AI 能力开关查询：前端据此决定是否显示「AI 释义」「生成草稿」这类入口。
 * 未配置密钥时返回 enabled:false，界面保持接入前的样子，不出现点了会失败的按钮。
 */
export async function GET() {
  return guard(async () => {
    await requireUser();
    return aiStatus();
  });
}
