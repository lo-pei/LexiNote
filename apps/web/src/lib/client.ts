import type { ApiMeta } from '@ln/types';

export interface Envelope<T> {
  data: T | null;
  error: { code: string; message: string; field?: string } | null;
  meta: ApiMeta;
}

export class ApiError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;

  constructor(message: string, code: string, status: number, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

/** 客户端统一出口：只认 { data, error, meta }，401 直接回登录页。 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  let payload: Envelope<T> | null = null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.error) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError(
      payload?.error?.message ?? '请求未完成，请稍后重试。',
      payload?.error?.code ?? 'NETWORK',
      response.status,
      payload?.error?.field,
    );
  }

  return payload.data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return '操作未完成，请稍后重试。';
}
