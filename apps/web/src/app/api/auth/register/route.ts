import { z } from 'zod';
import { registerStudent } from '@/server/modules/accounts';
import { createSession, REMEMBER_SECONDS, sessionCookieOptions, SESSION_COOKIE } from '@/server/auth';
import { guard, parseBody } from '@/server/http';

export const dynamic = 'force-dynamic';

const schema = z.object({
  loginNo: z.string().trim().min(4, '请填写学号。').max(20, '学号最长 20 位。'),
  name: z.string().trim().min(2, '请填写姓名。').max(24, '姓名最长 24 个字。'),
  password: z.string().min(8, '密码至少 8 位。').max(64, '密码不要超过 64 位。'),
  classCode: z.string().trim().max(12).optional().nullable(),
  inviteToken: z.string().trim().max(80).optional().nullable(),
});

export async function POST(request: Request) {
  let token: string | null = null;

  const response = await guard(async () => {
    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);
    const result = registerStudent(parsed);
    token = await createSession(result.user, true);
    return {
      user: result.user,
      join: result.join,
      joinWarning: result.joinWarning,
      classId: result.join?.classId ?? null,
    };
  });

  if (token) {
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(REMEMBER_SECONDS));
  }
  return response;
}
