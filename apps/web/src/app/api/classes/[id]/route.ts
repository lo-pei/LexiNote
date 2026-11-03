import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { dissolveClass, getClassDetail, updateClass } from '@/server/modules/classes';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return getClassDetail(params.id, user);
  });
}

const schema = z.object({
  name: z.string().trim().min(2, '班级名称至少 2 个字。').max(48).optional(),
  term: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(400).nullable().optional(),
  joinOpen: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    return updateClass(user, params.id, parseBody(schema, body));
  });
}

/** 解散班级：课程解绑保留，成员与邀请清空 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    const user = await requireUser();
    return dissolveClass(user, params.id);
  });
}
