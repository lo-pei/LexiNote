import { guard, requireUser } from '@/server/http';
import { generateDigest } from '@/server/modules/ai/digest';

export const dynamic = 'force-dynamic';

/**
 * 生成（或读取今日缓存的）学情诊断。
 * 教师点了才生成，不自动跑——多数教学周里数字变化不大，没必要每天花一次模型钱。
 */
export async function POST(_request: Request, { params }: { params: { courseId: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return generateDigest(params.courseId, user);
  });
}
