import type { SessionUser } from '@ln/types';
import { getSessionUser } from '@/server/auth';
import { guard } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  return guard(async (): Promise<SessionUser | null> => getSessionUser());
}
