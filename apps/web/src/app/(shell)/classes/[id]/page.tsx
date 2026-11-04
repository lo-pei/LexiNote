import { redirect } from 'next/navigation';
import { requirePageUser } from '@/lib/session';
import { getClassDetail } from '@/server/modules/classes';

/**
 * 旧班级详情地址 → 这门课的课程页。
 *
 * 班级内容已经搬进课程页，但注册完成、输入班级码、打开邀请链接这几条路
 * 都还落在 /classes/{id}，所以这里做一次转跳：班里有几门课就进第一门，
 * 没有课程（建了班还没建课）就回课程总览。
 *
 * 注意 redirect() 是靠抛异常跳的，不能写在 try 里，否则会被 catch 吞掉。
 */
export default async function ClassDetailRedirect({ params }: { params: { id: string } }) {
  const user = await requirePageUser();
  let target = '/';

  try {
    const detail = getClassDetail(params.id, user);
    const [first] = detail.courses;
    if (first) target = `/courses/${first.id}`;
  } catch {
    // 不在班里或班级已解散，落到课程总览，不抛 404
  }

  redirect(target);
}
