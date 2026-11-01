import { guard, requireUser } from '@/server/http';
import { rotateJoinCode } from '@/server/modules/classes';

export const dynamic = 'force-dynamic';

/** 重置班级码：旧码立即失效，用于班级码外流的补救 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return rotateJoinCode(user, params.id);
  });
}
