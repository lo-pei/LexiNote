import type {
  ClassCourse,
  ClassDetail,
  ClassInvite,
  ClassMember,
  ClassSummary,
  InvitePreview,
  JoinResult,
  SessionUser,
} from '@ln/types';
import { getDb } from '../db';
import { badRequest, forbidden, notFound } from '../http';

const uid = (p: string) => `${p}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
const nowIso = () => new Date().toISOString();

/** 班级码字符集：去掉 0/O/1/I 这类念出来会歧义的字符 */
const CODE_ALPHABET = 'ACDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 6): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return out;
}

function uniqueJoinCode(): string {
  const db = getDb();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomCode();
    if (!db.get('SELECT 1 FROM classes WHERE join_code = ?', code)) return code;
  }
  throw badRequest('班级码生成失败，请重试。');
}

interface ClassRow {
  id: string;
  teacher_id: string;
  teacher_name: string;
  name: string;
  term: string | null;
  description: string | null;
  join_code: string;
  join_open: number;
  created_at: string;
  member_count: number;
  course_count: number;
}

const SUMMARY_SELECT = `
  SELECT c.*, u.name AS teacher_name,
    (SELECT COUNT(*) FROM class_members m WHERE m.class_id = c.id) AS member_count,
    (SELECT COUNT(*) FROM courses co WHERE co.class_id = c.id) AS course_count
  FROM classes c JOIN users u ON u.id = c.teacher_id`;

function toSummary(row: ClassRow, user: SessionUser): ClassSummary {
  return {
    id: row.id,
    name: row.name,
    term: row.term,
    description: row.description,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    joinCode: row.join_code,
    joinOpen: Boolean(row.join_open),
    memberCount: row.member_count,
    courseCount: row.course_count,
    isOwner: row.teacher_id === user.id,
    createdAt: row.created_at,
  };
}

export function listClasses(user: SessionUser): ClassSummary[] {
  const rows = getDb().all<ClassRow>(
    `${SUMMARY_SELECT}
     WHERE c.teacher_id = ?
        OR EXISTS (SELECT 1 FROM class_members m WHERE m.class_id = c.id AND m.user_id = ?)
     ORDER BY c.created_at DESC`,
    user.id,
    user.id,
  );
  return rows.map((row) => toSummary(row, user));
}

function requireClassRow(classId: string, user: SessionUser): ClassRow {
  const row = getDb().get<ClassRow>(`${SUMMARY_SELECT} WHERE c.id = ?`, classId);
  if (!row) throw notFound('班级不存在。');
  const member = getDb().get(
    'SELECT 1 FROM class_members WHERE class_id = ? AND user_id = ?',
    classId,
    user.id,
  );
  if (row.teacher_id !== user.id && !member && user.role !== 'ADMIN') {
    throw forbidden('你不在这个班级里。');
  }
  return row;
}

export function getClassDetail(classId: string, user: SessionUser): ClassDetail {
  const row = requireClassRow(classId, user);
  const db = getDb();

  const members = db.all<{
    id: string;
    user_id: string;
    login_no: string | null;
    display_name: string | null;
    name: string;
    login_no_current: string;
    member_role: 'STUDENT' | 'ASSISTANT';
    source: ClassMember['source'];
    joined_at: string;
  }>(
    `SELECT m.*, u.name, u.login_no AS login_no_current
     FROM class_members m JOIN users u ON u.id = m.user_id
     WHERE m.class_id = ? ORDER BY m.joined_at ASC`,
    classId,
  );

  const invites = db.all<{
    id: string;
    class_id: string;
    token: string;
    note: string | null;
    created_by: string;
    created_by_name: string;
    max_uses: number;
    used_count: number;
    expires_at: string | null;
    created_at: string;
  }>(
    `SELECT i.*, u.name AS created_by_name FROM class_invites i JOIN users u ON u.id = i.created_by
     WHERE i.class_id = ? ORDER BY i.created_at DESC`,
    classId,
  );

  const courses = db.all<{
    id: string;
    title: string;
    term: string | null;
    courseware: number;
  }>(
    `SELECT co.id, co.title, co.term,
       (SELECT COUNT(*) FROM documents d WHERE d.course_id = co.id AND d.kind = 'COURSEWARE' AND d.deleted_at IS NULL) AS courseware
     FROM courses co WHERE co.class_id = ? ORDER BY co.created_at ASC`,
    classId,
  );

  return {
    ...toSummary(row, user),
    members: members.map((m) => ({
      id: m.id,
      userId: m.user_id,
      loginNo: m.login_no_current || m.login_no || '',
      name: m.name || m.display_name || '',
      memberRole: m.member_role,
      source: m.source,
      joinedAt: m.joined_at,
    })),
    invites: invites
      .filter((i) => row.teacher_id === user.id || i.created_by === user.id)
      .map(
        (i): ClassInvite => ({
          id: i.id,
          classId: i.class_id,
          token: i.token,
          note: i.note,
          createdByName: i.created_by_name,
          maxUses: i.max_uses,
          usedCount: i.used_count,
          expiresAt: i.expires_at,
          createdAt: i.created_at,
        }),
      ),
    courses: courses.map(
      (c): ClassCourse => ({
        id: c.id,
        title: c.title,
        term: c.term,
        coursewareCount: c.courseware,
      }),
    ),
  };
}

export function createClass(
  user: SessionUser,
  input: { name: string; term?: string; description?: string },
): ClassSummary {
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') throw forbidden('只有教师可以创建班级。');
  const db = getDb();
  const id = uid('cls');
  const iso = nowIso();
  const joinCode = uniqueJoinCode();

  db.run(
    `INSERT INTO classes (id, teacher_id, name, term, description, join_code, join_open, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    id,
    user.id,
    input.name.trim(),
    input.term?.trim() || null,
    input.description?.trim() || null,
    joinCode,
    iso,
  );

  return {
    id,
    name: input.name.trim(),
    term: input.term?.trim() || null,
    description: input.description?.trim() || null,
    teacherId: user.id,
    teacherName: user.name,
    joinCode,
    joinOpen: true,
    memberCount: 0,
    courseCount: 0,
    isOwner: true,
    createdAt: iso,
  };
}

export function updateClass(
  user: SessionUser,
  classId: string,
  input: { name?: string; term?: string | null; description?: string | null; joinOpen?: boolean },
): ClassSummary {
  const row = requireClassRow(classId, user);
  if (row.teacher_id !== user.id) throw forbidden('只有建班教师可以修改班级信息。');
  const db = getDb();
  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.name !== undefined) {
    sets.push('name = ?');
    params.push(input.name.trim());
  }
  if (input.term !== undefined) {
    sets.push('term = ?');
    params.push(input.term?.trim() || null);
  }
  if (input.description !== undefined) {
    sets.push('description = ?');
    params.push(input.description?.trim() || null);
  }
  if (input.joinOpen !== undefined) {
    sets.push('join_open = ?');
    params.push(input.joinOpen ? 1 : 0);
  }
  if (sets.length) {
    db.run(`UPDATE classes SET ${sets.join(', ')} WHERE id = ?`, ...params, classId);
  }
  return toSummary(requireClassRow(classId, user), user);
}

/** 重置班级码：旧码立即失效，已加入的成员不受影响 */
export function rotateJoinCode(user: SessionUser, classId: string): { joinCode: string } {
  const row = requireClassRow(classId, user);
  if (row.teacher_id !== user.id) throw forbidden('只有建班教师可以重置班级码。');
  const code = uniqueJoinCode();
  getDb().run('UPDATE classes SET join_code = ? WHERE id = ?', code, classId);
  return { joinCode: code };
}

export function createInvite(
  user: SessionUser,
  classId: string,
  input: { note?: string; maxUses?: number; expiresInDays?: number | null },
): ClassInvite {
  const row = requireClassRow(classId, user);
  const isOwner = row.teacher_id === user.id;

  // 同学之间也可以互拉，但只限班级开放加入时，且次数与有效期都收紧
  if (!isOwner && !row.join_open) {
    throw forbidden('这个班级暂时不接受新成员，邀请链接已停用。');
  }

  const token = globalThis.crypto.randomUUID().replace(/-/g, '');
  const id = uid('inv');
  const iso = nowIso();
  const maxUses = isOwner
    ? Math.max(0, Math.min(500, input.maxUses ?? 0))
    : Math.max(1, Math.min(10, input.maxUses ?? 3));
  const days = isOwner ? (input.expiresInDays ?? null) : (input.expiresInDays ?? 7);
  const expiresAt = days && days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;

  getDb().run(
    `INSERT INTO class_invites (id, class_id, token, created_by, note, max_uses, used_count, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    classId,
    token,
    user.id,
    input.note?.trim() || null,
    maxUses,
    expiresAt,
    iso,
  );

  return {
    id,
    classId,
    token,
    note: input.note?.trim() || null,
    createdByName: user.name,
    maxUses,
    usedCount: 0,
    expiresAt,
    createdAt: iso,
  };
}

function addMember(
  classId: string,
  user: SessionUser,
  source: ClassMember['source'],
  invitedBy: string | null,
): boolean {
  const db = getDb();
  const exists = db.get('SELECT 1 FROM class_members WHERE class_id = ? AND user_id = ?', classId, user.id);
  if (exists) return false;
  db.run(
    `INSERT INTO class_members (id, class_id, user_id, login_no, display_name, member_role, source, invited_by, joined_at)
     VALUES (?, ?, ?, ?, ?, 'STUDENT', ?, ?, ?)`,
    uid('mem'),
    classId,
    user.id,
    user.loginNo,
    user.name,
    source,
    invitedBy,
    nowIso(),
  );
  return true;
}

/** 加入班级即自动选修该班已开设的课程（幂等） */
function enrollClassCourses(classId: string, userId: string): number {
  const db = getDb();
  const courses = db.all<{ id: string }>('SELECT id FROM courses WHERE class_id = ?', classId);
  let added = 0;
  for (const course of courses) {
    const exists = db.get(
      'SELECT 1 FROM enrollments WHERE course_id = ? AND student_id = ?',
      course.id,
      userId,
    );
    if (exists) continue;
    db.run(
      'INSERT INTO enrollments (id, student_id, course_id, created_at) VALUES (?, ?, ?, ?)',
      uid('enr'),
      userId,
      course.id,
      nowIso(),
    );
    added += 1;
  }
  return added;
}

function joinClass(
  classId: string,
  className: string,
  user: SessionUser,
  source: ClassMember['source'],
  invitedBy: string | null,
): JoinResult {
  const added = addMember(classId, user, source, invitedBy);
  const enrolledCourses = added ? enrollClassCourses(classId, user.id) : 0;
  return { classId, className, alreadyMember: !added, enrolledCourses };
}

export function joinByCode(user: SessionUser, rawCode: string): JoinResult {
  if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
    throw forbidden('教师账号不能以学生身份加入班级。');
  }
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, '');
  if (code.length < 4) throw badRequest('请输入完整的班级码。', 'code');

  const row = getDb().get<{ id: string; name: string; join_open: number }>(
    'SELECT id, name, join_open FROM classes WHERE join_code = ?',
    code,
  );
  if (!row) throw badRequest('班级码不正确，请向任课教师确认。', 'code');
  if (!row.join_open) throw badRequest('这个班级已关闭班级码加入，请向老师索取邀请链接。', 'code');
  return joinClass(row.id, row.name, user, 'CODE', null);
}

interface InviteRow {
  id: string;
  class_id: string;
  token: string;
  created_by: string;
  note: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  class_name: string;
  term: string | null;
  teacher_name: string;
  member_count: number;
  course_count: number;
}

function loadInvite(token: string): InviteRow {
  const row = getDb().get<InviteRow>(
    `SELECT i.*, c.name AS class_name, c.term, u.name AS teacher_name,
       (SELECT COUNT(*) FROM class_members m WHERE m.class_id = c.id) AS member_count,
       (SELECT COUNT(*) FROM courses co WHERE co.class_id = c.id) AS course_count
     FROM class_invites i
     JOIN classes c ON c.id = i.class_id
     JOIN users u ON u.id = c.teacher_id
     WHERE i.token = ?`,
    token,
  );
  if (!row) throw notFound('邀请链接不存在或已被撤销。');
  return row;
}

function inviteExhausted(row: InviteRow): boolean {
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return true;
  return row.max_uses > 0 && row.used_count >= row.max_uses;
}

export function previewInvite(token: string, user: SessionUser | null): InvitePreview {
  const row = loadInvite(token);
  const alreadyMember = user
    ? Boolean(
        getDb().get('SELECT 1 FROM class_members WHERE class_id = ? AND user_id = ?', row.class_id, user.id) ||
          getDb().get('SELECT 1 FROM classes WHERE id = ? AND teacher_id = ?', row.class_id, user.id),
      )
    : false;
  return {
    token: row.token,
    classId: row.class_id,
    className: row.class_name,
    term: row.term,
    teacherName: row.teacher_name,
    memberCount: row.member_count,
    courseCount: row.course_count,
    note: row.note,
    expiresAt: row.expires_at,
    exhausted: inviteExhausted(row),
    alreadyMember,
  };
}

export function acceptInvite(user: SessionUser, token: string): JoinResult {
  const row = loadInvite(token);
  if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
    throw forbidden('教师账号不能以学生身份加入班级。');
  }
  if (inviteExhausted(row)) throw badRequest('这条邀请已过期或已用完，请向老师索取新的链接。');

  const result = joinClass(row.class_id, row.class_name, user, 'INVITE', row.created_by);
  if (!result.alreadyMember) {
    getDb().run('UPDATE class_invites SET used_count = used_count + 1 WHERE id = ?', row.id);
  }
  return result;
}

export function removeMember(user: SessionUser, classId: string, memberUserId: string): void {
  const row = requireClassRow(classId, user);
  if (row.teacher_id !== user.id) throw forbidden('只有建班教师可以移除成员。');
  if (memberUserId === user.id) throw badRequest('不能把自己移出班级。');
  getDb().run('DELETE FROM class_members WHERE class_id = ? AND user_id = ?', classId, memberUserId);
}

/** 学生主动退出：已选修课程与笔记保留，避免误删学习记录 */
export function leaveClass(user: SessionUser, classId: string): void {
  const row = requireClassRow(classId, user);
  if (row.teacher_id === user.id) throw badRequest('建班教师不能退出自己的班级。');
  getDb().run('DELETE FROM class_members WHERE class_id = ? AND user_id = ?', classId, user.id);
}

export function classOptions(user: SessionUser): { id: string; name: string; term: string | null }[] {
  return getDb().all<{ id: string; name: string; term: string | null }>(
    'SELECT id, name, term FROM classes WHERE teacher_id = ? ORDER BY created_at DESC',
    user.id,
  );
}

/** 课程卡片上显示班级名，避免教师在多班之间串课 */
export function classNamesByIds(ids: (string | null)[]): Map<string, string> {
  const unique = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (!unique.length) return new Map();
  const rows = getDb().all<{ id: string; name: string }>(
    `SELECT id, name FROM classes WHERE id IN (${unique.map(() => '?').join(',')})`,
    ...unique,
  );
  return new Map(rows.map((r) => [r.id, r.name]));
}
