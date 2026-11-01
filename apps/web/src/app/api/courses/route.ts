import { z } from 'zod';
import { guard, parseBody, requireUser } from '@/server/http';
import { createCourse, listCourses } from '@/server/modules/courses';

export const dynamic = 'force-dynamic';

export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    return listCourses(user);
  });
}

const schema = z.object({
  title: z.string().trim().min(2, '课程名称至少 2 个字。').max(80),
  description: z.string().trim().max(400).optional(),
  term: z.string().trim().max(60).optional(),
  /** 可选：把课程挂到自己的某个班级下 */
  classId: z.string().trim().min(1).nullable().optional(),
  /** 授课班级名称：与其他两栏一起构成新建课程的四栏 */
  className: z.string().trim().min(2, '请填写授课班级。').max(60).optional(),
  /** 班级码：没选已有班级时，用它新建教学班 */
  joinCode: z.string().trim().max(8).optional(),
});

export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    return createCourse(parseBody(schema, body), user);
  });
}
