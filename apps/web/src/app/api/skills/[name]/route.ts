import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { getSkill, updateSkill } from '@/server/modules/skill';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { name: string } }) {
  return guard(async () => {
    await requireUser();
    return getSkill(params.name);
  });
}

const schema = z.object({ yaml: z.string().min(1, 'YAML 不能为空。').max(20000) });

export async function PUT(request: Request, { params }: { params: { name: string } }) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);
    return updateSkill(params.name, parsed.yaml, user);
  });
}
