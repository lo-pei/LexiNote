import { z } from 'zod';
import type { SessionUser } from '@ln/types';
import { initialsOf } from '@ln/utils';
import { getDb } from '@/server/db';
import {
  createSession,
  REMEMBER_SECONDS,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from '@/server/auth';
import { badRequest, guard, HttpError } from '@/server/http';

export const dynamic = 'force-dynamic';

const schema = z.object({
  /** 学号 / 工号；兼容旧客户端的 email 字段 */
  account: z.string().trim().min(3, '请输入学号。').max(120).optional(),
  loginNo: z.string().trim().min(3, '请输入学号。').max(120).optional(),
  email: z.string().trim().max(120).optional(),
  password: z.string().min(1, '请输入密码。').max(200),
  remember: z.boolean().optional(),
});

export async function POST(request: Request) {
  let token: string | null = null;
  let remember = true;

  const response = await guard(async () => {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? '登录信息不完整。', parsed.error.issues[0]?.path.join('.'));
    }

    const account = (parsed.data.account ?? parsed.data.loginNo ?? parsed.data.email ?? '').trim();
    if (!account) throw badRequest('请输入学号或工号。', 'account');
    remember = parsed.data.remember ?? true;

    const row = getDb().get<{
      id: string;
      login_no: string;
      email: string | null;
      name: string;
      role: SessionUser['role'];
      password_hash: string;
    }>(
      `SELECT id, login_no, email, name, role, password_hash FROM users
       WHERE lower(login_no) = lower(?) OR lower(email) = lower(?)`,
      account,
      account,
    );

    if (!row || !verifyPassword(parsed.data.password, row.password_hash)) {
      throw new HttpError(401, 'BAD_CREDENTIALS', '学号或密码不正确。', 'password');
    }

    const user: SessionUser = {
      id: row.id,
      loginNo: row.login_no,
      email: row.email,
      name: row.name,
      role: row.role,
      initials: initialsOf(row.name),
    };
    token = await createSession(user, remember);
    return user;
  });

  if (token) {
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(remember ? REMEMBER_SECONDS : undefined),
    );
  }
  return response;
}
