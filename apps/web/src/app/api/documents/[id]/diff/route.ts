import { guard, badRequest, requireUser } from '@/server/http';
import { computeDiff } from '@/server/modules/documents';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!from || !to) throw badRequest('请选择两个快照进行对比。');
    return computeDiff(params.id, from, to, user);
  });
}
