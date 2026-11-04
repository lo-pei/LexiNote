import { redirect } from 'next/navigation';

/**
 * 班级已并入课程：一门课对应一个教学班，班名、班级码、邀请、名册与学情
 * 都在课程页里。旧地址留着跳转，注册、入班、邀请链接落地的流程不受影响。
 */
export default function ClassesPage() {
  redirect('/');
}
