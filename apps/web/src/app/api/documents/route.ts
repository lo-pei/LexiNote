import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { createDocument, listLibrary } from '@/server/modules/documents';

export const dynamic = 'force-dynamic';

export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    return listLibrary(user);
  });
}

const schema = z.object({
  title: z.string().trim().min(1, '请填写标题。').max(120),
  kind: z.enum(['COURSEWARE', 'NOTE']),
  courseId: z.string().trim().min(1).nullable().optional(),
});

export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);
    return createDocument(
      { title: parsed.title, kind: parsed.kind, courseId: parsed.courseId ?? null },
      user,
    );
  });
}
