import { guard, requireRole, requireUser } from '@/server/http';
import { countPendingTermSuggestions, listPendingTermSuggestions } from '@/server/modules/ai/terms';

export const dynamic = 'force-dynamic';

/** 教师端待审术语释义列表。 */
export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    requireRole(user, 'TEACHER', 'ADMIN');
    return { total: countPendingTermSuggestions(), items: listPendingTermSuggestions(40) };
  });
}
