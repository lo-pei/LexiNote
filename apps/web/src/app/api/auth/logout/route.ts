import { NextResponse } from 'next/server';
import type { ApiResponse } from '@ln/types';
import { SESSION_COOKIE } from '@/server/auth';

export async function POST() {
  const response = NextResponse.json<ApiResponse<{ signedOut: true }>>(
    { data: { signedOut: true }, error: null, meta: {} },
    { status: 200 },
  );
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
