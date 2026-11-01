import type { SessionUser } from '@ln/types';
import { getCoursePlan, type PlanCourse, type PlanCourseware, type PlanTopic } from '../content/plan';
import { getDb } from '../db';
import { badRequest, forbidden } from '../http';

/**
 * 授课课件的选定与读取。
 *
 * 课件本身写在 data/course-plan.local.json 的 coursewares 数组里（每套自带专题表，
 * 教师后续换讲法只需往数组里加一项）；「这学期用哪套」是一条可变的配置，
 * 保存在 app_meta 里，不新建表。
 */

const KEY = 'plan.courseware';

export interface ActivePlan {
  course: PlanCourse;
  coursewares: PlanCourseware[];
  /** 当前生效的课件 id：没选过时就是第一套 */
  activeId: string;
  topics: PlanTopic[];
  note?: string;
  source: 'local' | 'example';
}

export function getActivePlan(): ActivePlan {
  const { plan, source } = getCoursePlan();
  const row = getDb().get<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', KEY);
  const active = plan.coursewares.find((item) => item.id === row?.value) ?? plan.coursewares[0]!;
  return {
    course: plan.course,
    coursewares: plan.coursewares,
    activeId: active.id,
    topics: active.topics,
    note: active.note,
    source,
  };
}

export function selectCourseware(coursewareId: string, user: SessionUser): void {
  if (user.role === 'STUDENT') throw forbidden('只有任课教师可以更换授课课件。');
  const { plan } = getCoursePlan();
  if (!plan.coursewares.some((item) => item.id === coursewareId)) {
    throw badRequest('没有这套授课课件，刷新页面后再试。');
  }
  getDb().run(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    KEY,
    coursewareId,
  );
}
