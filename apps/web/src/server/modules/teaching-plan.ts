import { getCoursePlan, type PlanCourse, type PlanCourseware, type PlanTopic } from '../content/plan';

/**
 * 授课课件的选定与读取。
 *
 * 课件本身写在 data/course-plan.local.json 的 coursewares 数组里（每套自带专题表）。
 * 课程安排页不再展示备选课件与切换入口——一门课只按一套讲，换讲法改本机文件即可。
 */

export interface ActivePlan {
  course: PlanCourse;
  coursewares: PlanCourseware[];
  /** 当前生效的课件 id（本地文件里的第一套） */
  activeId: string;
  topics: PlanTopic[];
  note?: string;
  source: 'local' | 'example';
}

export function getActivePlan(): ActivePlan {
  const { plan, source } = getCoursePlan();
  // 授课课件不再提供页面切换：以本地文件里的第一套为准
  const active = plan.coursewares[0]!;
  return {
    course: plan.course,
    coursewares: plan.coursewares,
    activeId: active.id,
    topics: active.topics,
    note: active.note,
    source,
  };
}
