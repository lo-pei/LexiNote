import { NextResponse } from 'next/server';
import type { z } from 'zod';
import type { ApiMeta, ApiResponse, Role, SessionUser } from '@ln/types';
import { getSessionUser } from './auth';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: string;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export const unauthorized = () => new HttpError(401, 'UNAUTHENTICATED', '请先登录。');
export const forbidden = (message = '没有权限执行该操作。') => new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = '对象不存在或已删除。') => new HttpError(404, 'NOT_FOUND', message);
export const badRequest = (message: string, field?: string) => new HttpError(400, 'BAD_REQUEST', message, field);

export function ok<T>(data: T, meta: ApiMeta = {}): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>({ data, error: null, meta });
}

export function fail(error: HttpError): NextResponse<ApiResponse<null>> {
  return NextResponse.json<ApiResponse<null>>(
    {
      data: null,
      error: { code: error.code, message: error.message, ...(error.field ? { field: error.field } : {}) },
      meta: {},
    },
    { status: error.status },
  );
}

/** 所有 Route Handler 的统一出口：把异常收敛成 { data, error, meta } */
export async function guard<T>(fn: () => Promise<T>): Promise<NextResponse<ApiResponse<T>> | NextResponse<ApiResponse<null>>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    if (error instanceof HttpError) return fail(error);
    console.error('[api] unhandled', error);
    return fail(new HttpError(500, 'INTERNAL', '服务器开小差了，请稍后再试。'));
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

export function requireRole(user: SessionUser, ...roles: Role[]): void {
  if (!roles.includes(user.role)) throw forbidden();
}

export function isTeacherOf(user: SessionUser, teacherId: string): boolean {
  return user.role === 'TEACHER' && user.id === teacherId;
}

/**
 * 请求体校验的唯一入口：把 zod 的 issue 收敛成 400，而不是冒泡成 500。
 * 字段名随错误一起返回，前端可直接定位到具体输入框。
 */
export function parseBody<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.length ? issue.path.join('.') : undefined;
    throw badRequest(issue?.message ?? '提交的数据不完整。', field);
  }
  return parsed.data as z.infer<S>;
}
