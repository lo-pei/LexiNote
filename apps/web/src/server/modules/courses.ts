import type { Course, CourseDetail, CoursewareSummary, SessionUser, TiptapDoc } from '@ln/types';
import { countTerms, countWords, textOf } from '@ln/utils';
import { getDb, parseJson } from '../db';
import { forbidden, notFound } from '../http';
import { recordEvent } from './events';

interface CourseRow {
  id: string;
  teacher_id: string;
  teacher_name: string;
  class_id: string | null;
  class_name: string | null;
  title: string;
  description: string | null;
  term: string | null;
  created_at: string;
}

interface DocRow {
  id: string;
  title: string;
  kind: 'COURSEWARE' | 'NOTE';
  status: 'DRAFT' | 'PUBLISHED';
  content: string;
  updated_at: string;
}

const toCourse = (row: CourseRow): Course => ({
  id: row.id,
  teacherId: row.teacher_id,
  teacherName: row.teacher_name,
  classId: row.class_id,
  className: row.class_name,
  title: row.title,
  description: row.description,
  term: row.term,
  createdAt: row.created_at,
});

export function listCourses(user: SessionUser): CourseDetail[] {
  const db = getDb();
  const rows = db.all<CourseRow>(
    `SELECT c.*, u.name AS teacher_name, cl.name AS class_name
     FROM courses c JOIN users u ON u.id = c.teacher_id
     LEFT JOIN classes cl ON cl.id = c.class_id
     ORDER BY c.created_at ASC`,
  );

  return rows.map((row) => {
    const course = toCourse(row);
    const enrolled = Boolean(
      db.get(`SELECT 1 FROM enrollments WHERE course_id = ? AND student_id = ?`, row.id, user.id),
    );
    const courseware = db.all<DocRow>(
      `SELECT id, title, kind, status, content, updated_at FROM documents
       WHERE course_id = ? AND kind = 'COURSEWARE' AND deleted_at IS NULL
       ORDER BY sort_order ASC`,
      row.id,
    );
    const assignments = db.all<{
      id: string;
      course_id: string;
      author_id: string;
      type: 'QUESTION' | 'ASSIGNMENT';
      title: string;
      body: string;
      is_graded: number;
      due_at: string | null;
      allowed_reply_roles: string;
      created_at: string;
    }>(
      `SELECT * FROM forum_topics WHERE course_id = ? AND type = 'ASSIGNMENT' ORDER BY created_at DESC`,
      row.id,
    );
    const studentCount =
      db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM enrollments WHERE course_id = ?`, row.id)?.n ?? 0;

    return {
      ...course,
      enrolled,
      studentCount,
      courseware: courseware.map((d) => {
        const doc = parseJson<TiptapDoc>(d.content, { type: 'doc', content: [] });
        return {
          id: d.id,
          title: d.title,
          kind: d.kind,
          status: d.status,
          words: countWords(textOf(doc)),
          termCount: countTerms(doc),
          updatedAt: d.updated_at,
        } satisfies CoursewareSummary;
      }),
      assignments: assignments.map((t) => ({
        id: t.id,
        courseId: t.course_id,
        authorId: t.author_id,
        type: t.type,
        title: t.title,
        body: parseJson(t.body, { type: 'doc', content: [] }) as TiptapDoc,
        isGraded: Boolean(t.is_graded),
        dueAt: t.due_at,
        allowedReplyRoles: parseJson(t.allowed_reply_roles, ['TEACHER', 'STUDENT'] as SessionUser['role'][]),
        createdAt: t.created_at,
      })),
    };
  });
}

export function getCourse(courseId: string, user: SessionUser): CourseDetail {
  const found = listCourses(user).find((c) => c.id === courseId);
  if (!found) throw notFound('课程不存在。');
  return found;
}

export function enroll(courseId: string, user: SessionUser): { enrolled: boolean; studentCount: number } {
  const db = getDb();
  const course = db.get<{ teacher_id: string; class_id: string | null }>(
    `SELECT teacher_id, class_id FROM courses WHERE id = ?`,
    courseId,
  );
  if (!course) throw notFound('课程不存在。');
  if (user.role !== 'STUDENT') throw forbidden('只有学生可以选课。');

  // 挂班的课程只对班内学生开放：选课入口统一收敛到「凭班级码加入」
  if (course.class_id) {
    const member = db.get(
      'SELECT 1 FROM class_members WHERE class_id = ? AND user_id = ?',
      course.class_id,
      user.id,
    );
    if (!member) {
      throw forbidden('这门课属于教学班，请先用班级码或邀请链接加入班级。');
    }
  }

  const exists = db.get(`SELECT 1 FROM enrollments WHERE course_id = ? AND student_id = ?`, courseId, user.id);
  if (!exists) {
    db.run(
      `INSERT INTO enrollments (id, student_id, course_id, created_at) VALUES (?, ?, ?, ?)`,
      `enr_${globalThis.crypto.randomUUID().slice(0, 16)}`,
      user.id,
      courseId,
      new Date().toISOString(),
    );
    recordEvent(user.id, 'DOC_OPEN', { courseId });
  }
  const studentCount =
    db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM enrollments WHERE course_id = ?`, courseId)?.n ?? 0;
  return { enrolled: true, studentCount };
}

export function createCourse(
  input: { title: string; description?: string; term?: string; classId?: string | null },
  user: SessionUser,
): Course {
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') throw forbidden('只有教师可以创建课程。');
  const db = getDb();
  const classId = input.classId?.trim() || null;

  if (classId) {
    const owned = db.get<{ teacher_id: string }>('SELECT teacher_id FROM classes WHERE id = ?', classId);
    if (!owned) throw forbidden('班级不存在。');
    if (owned.teacher_id !== user.id) throw forbidden('只能把课程挂在自己的班级下。');
  }

  const id = `crs_${globalThis.crypto.randomUUID().slice(0, 16)}`;
  const iso = new Date().toISOString();
  db.run(
    `INSERT INTO courses (id, teacher_id, class_id, title, description, term, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    user.id,
    classId,
    input.title.trim(),
    input.description?.trim() || null,
    input.term?.trim() || null,
    iso,
    iso,
  );

  // 课程挂到班级后，班里已有的学生不必再手动选一次课
  if (classId) {
    const members = db.all<{ user_id: string }>(
      'SELECT user_id FROM class_members WHERE class_id = ?',
      classId,
    );
    for (const member of members) {
      db.run(
        'INSERT OR IGNORE INTO enrollments (id, student_id, course_id, created_at) VALUES (?, ?, ?, ?)',
        `enr_${globalThis.crypto.randomUUID().slice(0, 16)}`,
        member.user_id,
        id,
        iso,
      );
    }
  }

  const className = classId
    ? (db.get<{ name: string }>('SELECT name FROM classes WHERE id = ?', classId)?.name ?? null)
    : null;

  return {
    id,
    teacherId: user.id,
    teacherName: user.name,
    classId,
    className,
    title: input.title.trim(),
    description: input.description ?? null,
    term: input.term ?? null,
    createdAt: iso,
  };
}
