import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { Role, SessionUser } from '@ln/types';
import { initialsOf } from '@ln/utils';
import { getDb, parseJson } from './db';

const COOKIE = 'ln_session';
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'lexinote-dev-secret-do-not-use-in-production-0001',
);

/** 勾选「记住登录」后的会话时长：30 天免登录 */
export const REMEMBER_SECONDS = 60 * 60 * 24 * 30;
/** 不勾选时为浏览器会话期（实际由 JWT 兜底 12 小时） */
export const SESSION_SECONDS = 60 * 60 * 12;

export { hashPassword, verifyPassword } from '@ln/utils/password';

/* ── 会话 ───────────────────────────────────────────────── */

export interface SessionPayload {
  sub: string;
  role: Role;
  name: string;
  loginNo: string;
  email: string | null;
}

export async function createSession(user: SessionUser, remember = true): Promise<string> {
  const seconds = remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  const token = await new SignJWT({
    role: user.role,
    name: user.name,
    loginNo: user.loginNo,
    email: user.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(SECRET);
  return token;
}

export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      role: (payload.role as Role) ?? 'STUDENT',
      name: String(payload.name ?? ''),
      loginNo: String(payload.loginNo ?? ''),
      email: payload.email ? String(payload.email) : null,
    };
  } catch {
    return null;
  }
}

/** 服务端读取当前用户（前端隐藏按钮不构成安全边界） */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  const payload = await readSessionToken(token);
  if (!payload) return null;
  const row = getDb().get<{
    id: string;
    login_no: string;
    email: string | null;
    name: string;
    role: Role;
  }>('SELECT id, login_no, email, name, role FROM users WHERE id = ?', payload.sub);
  if (!row) return null;
  return {
    id: row.id,
    loginNo: row.login_no,
    email: row.email,
    name: row.name,
    role: row.role,
    initials: initialsOf(row.name),
  };
}

export const SESSION_COOKIE = COOKIE;

/**
 * 不传 maxAge 时写出的是「浏览器会话 cookie」——关掉浏览器即失效；
 * 传了就按持久 cookie 处理，对应登录页的「记住我」。
 */
export function sessionCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  };
}

export function decodeRoles(value: unknown): Role[] {
  return parseJson<Role[]>(value, ['TEACHER', 'STUDENT']);
}
