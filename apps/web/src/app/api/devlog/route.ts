import { guard, requireUser } from '@/server/http';
import { listDevLog } from '@/server/modules/skill';

export const dynamic = 'force-dynamic';

export async function GET() {
  return guard(async () => {
    await requireUser();
    return listDevLog();
  });
}
