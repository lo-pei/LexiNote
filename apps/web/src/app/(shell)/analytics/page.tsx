import { redirect } from 'next/navigation';

/** 学情已并入课程页（每个班一门课，学情在本课程页里），旧地址保留重定向 */
export default function AnalyticsPage() {
  redirect('/');
}
