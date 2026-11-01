import { redirect } from 'next/navigation';
import type { SessionUser } from '@ln/types';
import { getSessionUser } from '@/server/auth';

/**
 * 页面级守卫（服务端）。前端隐藏按钮不构成安全边界，
 * 所有受保护页面必须先在服务端拿到用户，再交给模块层做资源级裁决。
 */
export async function requirePageUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export const ROLE_LABEL: Record<SessionUser['role'], string> = {
  ADMIN: '管理员',
  TEACHER: '教师',
  STUDENT: '学生',
};
