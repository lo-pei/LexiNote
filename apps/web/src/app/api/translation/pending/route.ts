import { guard, requireRole, requireUser } from '@/server/http';
import { countPendingDrafts, listPendingDrafts } from '@/server/modules/ai/translation';

export const dynamic = 'force-dynamic';

/** 教师端待审译文列表。学生调用一律 403——审校权不下放。 */
export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    requireRole(user, 'TEACHER', 'ADMIN');
    return { total: countPendingDrafts(), items: listPendingDrafts(80) };
  });
}
