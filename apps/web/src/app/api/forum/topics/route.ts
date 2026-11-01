import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { createTopic, listTopics } from '@/server/modules/forum';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const courseId = new URL(request.url).searchParams.get('courseId') ?? undefined;
    return listTopics(user, courseId);
  });
}

const schema = z.object({
  courseId: z.string().trim().min(1, '请选择课程。'),
  type: z.enum(['QUESTION', 'ASSIGNMENT']),
  title: z.string().trim().min(2, '标题至少 2 个字。').max(160),
  body: z.string().trim().min(1, '请写下问题或要求。').max(4000),
  dueAt: z.string().trim().min(1).nullable().optional(),
});

export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    return createTopic(user, parseBody(schema, body));
  });
}
