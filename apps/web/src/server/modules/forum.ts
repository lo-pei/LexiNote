import type { Annotation, ForumPost, ForumTopic, Role, SessionUser, TiptapDoc } from '@ln/types';
import { getDb, parseJson } from '../db';
import { badRequest, forbidden, notFound } from '../http';
import { recordEvent } from './events';

const uid = (p: string) => `${p}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
const docOf = (text: string): TiptapDoc => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

function visibleCourse(courseId: string, user: SessionUser): boolean {
  const db = getDb();
  const course = db.get<{ teacher_id: string }>(`SELECT teacher_id FROM courses WHERE id = ?`, courseId);
  if (!course) return false;
  if (course.teacher_id === user.id) return true;
  return Boolean(db.get(`SELECT 1 FROM enrollments WHERE course_id = ? AND student_id = ?`, courseId, user.id));
}

export function listTopics(user: SessionUser, courseId?: string): ForumTopic[] {
  const db = getDb();
  const rows = db.all<{
    id: string;
    course_id: string;
    author_id: string;
    author_name: string;
    type: 'QUESTION' | 'ASSIGNMENT';
    title: string;
    body: string;
    is_graded: number;
    due_at: string | null;
    allowed_reply_roles: string;
    created_at: string;
    replies: number;
  }>(
    `SELECT t.*, u.name AS author_name,
       (SELECT COUNT(*) FROM forum_posts p WHERE p.topic_id = t.id) AS replies
     FROM forum_topics t JOIN users u ON u.id = t.author_id
     ${courseId ? 'WHERE t.course_id = ?' : ''}
     ORDER BY t.created_at DESC`,
    ...(courseId ? [courseId] : []),
  );

  return rows
    .filter((r) => visibleCourse(r.course_id, user))
    .map((r) => ({
      id: r.id,
      courseId: r.course_id,
      authorId: r.author_id,
      authorName: r.author_name,
      type: r.type,
      title: r.title,
      body: parseJson<TiptapDoc>(r.body, docOf('')),
      isGraded: Boolean(r.is_graded),
      dueAt: r.due_at,
      allowedReplyRoles: parseJson<Role[]>(r.allowed_reply_roles, ['TEACHER', 'STUDENT']),
      replyCount: r.replies,
      createdAt: r.created_at,
    }));
}

export interface TopicDetail extends ForumTopic {
  courseTitle: string;
  posts: ForumPost[];
  canReply: boolean;
}

export function getTopic(id: string, user: SessionUser): TopicDetail {
  const db = getDb();
  const row = db.get<{
    id: string;
    course_id: string;
    course_title: string;
    author_id: string;
    author_name: string;
    type: 'QUESTION' | 'ASSIGNMENT';
    title: string;
    body: string;
    is_graded: number;
    due_at: string | null;
    allowed_reply_roles: string;
    created_at: string;
  }>(
    `SELECT t.*, u.name AS author_name, c.title AS course_title
     FROM forum_topics t JOIN users u ON u.id = t.author_id JOIN courses c ON c.id = t.course_id
     WHERE t.id = ?`,
    id,
  );
  if (!row) throw notFound('主题不存在。');
  if (!visibleCourse(row.course_id, user)) throw forbidden('你不在该课程中。');

  const allowed = parseJson<Role[]>(row.allowed_reply_roles, ['TEACHER', 'STUDENT']);
  const posts = db.all<{
    id: string;
    topic_id: string;
    author_id: string;
    author_name: string;
    author_role: Role;
    parent_post_id: string | null;
    body: string;
    is_answer: number;
    score: number | null;
    created_at: string;
  }>(
    `SELECT p.*, u.name AS author_name, u.role AS author_role
     FROM forum_posts p JOIN users u ON u.id = p.author_id
     WHERE p.topic_id = ? ORDER BY p.created_at ASC`,
    id,
  );

  const annotations = db.all<{
    id: string;
    target_id: string;
    author_id: string;
    author_name: string;
    anchor: string;
    content: string;
    is_private: number;
    created_at: string;
  }>(
    `SELECT a.*, u.name AS author_name FROM annotations a JOIN users u ON u.id = a.author_id
     WHERE a.target_type = 'POST' AND a.target_id IN (SELECT id FROM forum_posts WHERE topic_id = ?)
     ORDER BY a.created_at ASC`,
    id,
  );

  return {
    id: row.id,
    courseId: row.course_id,
    courseTitle: row.course_title,
    authorId: row.author_id,
    authorName: row.author_name,
    type: row.type,
    title: row.title,
    body: parseJson<TiptapDoc>(row.body, docOf('')),
    isGraded: Boolean(row.is_graded),
    dueAt: row.due_at,
    allowedReplyRoles: allowed,
    createdAt: row.created_at,
    canReply: allowed.includes(user.role),
    posts: posts.map((p) => ({
      id: p.id,
      topicId: p.topic_id,
      authorId: p.author_id,
      authorName: p.author_name,
      authorRole: p.author_role,
      parentPostId: p.parent_post_id,
      body: parseJson<TiptapDoc>(p.body, docOf('')),
      isAnswer: Boolean(p.is_answer),
      score: p.score,
      createdAt: p.created_at,
      annotations: annotations
        .filter((a) => a.target_id === p.id)
        .map(
          (a): Annotation => ({
            id: a.id,
            targetType: 'POST',
            targetId: a.target_id,
            anchor: parseJson(a.anchor, {}),
            authorId: a.author_id,
            authorName: a.author_name,
            content: a.content,
            isPrivate: Boolean(a.is_private),
            createdAt: a.created_at,
          }),
        ),
    })),
  };
}

export function createTopic(
  user: SessionUser,
  input: { courseId: string; type: 'QUESTION' | 'ASSIGNMENT'; title: string; body: string; dueAt?: string | null },
): { id: string } {
  if (!visibleCourse(input.courseId, user)) throw forbidden('你不在该课程中。');
  if (input.type === 'ASSIGNMENT' && user.role !== 'TEACHER') throw forbidden('只有教师可以发布作业。');
  if (!input.title.trim()) throw badRequest('标题不能为空。', 'title');

  const id = uid('top');
  getDb().run(
    `INSERT INTO forum_topics (id, course_id, author_id, type, title, body, is_graded, due_at, allowed_reply_roles, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.courseId,
    user.id,
    input.type,
    input.title.trim(),
    JSON.stringify(docOf(input.body)),
    input.type === 'ASSIGNMENT' ? 1 : 0,
    input.dueAt ?? null,
    JSON.stringify(['TEACHER', 'STUDENT']),
    new Date().toISOString(),
  );
  return { id };
}

export function createPost(
  topicId: string,
  user: SessionUser,
  body: string,
  parentPostId?: string | null,
): { id: string } {
  const topic = getTopic(topicId, user);
  if (!topic.canReply) throw forbidden('你在该主题下没有回复权限。');
  if (!body.trim()) throw badRequest('内容不能为空。', 'body');

  const id = uid('pst');
  const db = getDb();
  db.run(
    `INSERT INTO forum_posts (id, topic_id, author_id, parent_post_id, body, is_answer, score, created_at)
     VALUES (?, ?, ?, ?, ?, 0, NULL, ?)`,
    id,
    topicId,
    user.id,
    parentPostId ?? null,
    JSON.stringify(docOf(body)),
    new Date().toISOString(),
  );

  // 回复计入学习事件与聚合表
  const courseId = topic.courseId;
  db.run(
    `UPDATE analytics_daily SET forum_replies = forum_replies + 1 WHERE course_id = ? AND student_id = ? AND day = ?`,
    courseId,
    user.id,
    new Date().toISOString().slice(0, 10),
  );
  recordEvent(user.id, 'DOC_OPEN', { courseId, reply: true });
  return { id };
}

export function setAnswer(postId: string, user: SessionUser, isAnswer: boolean, score?: number | null): void {
  if (user.role !== 'TEACHER') throw forbidden('只有教师可以标记参考答案。');
  const db = getDb();
  const post = db.get<{ topic_id: string }>(`SELECT topic_id FROM forum_posts WHERE id = ?`, postId);
  if (!post) throw notFound('回复不存在。');
  const topic = db.get<{ course_id: string }>(`SELECT course_id FROM forum_topics WHERE id = ?`, post.topic_id);
  const course = topic
    ? db.get<{ teacher_id: string }>(`SELECT teacher_id FROM courses WHERE id = ?`, topic.course_id)
    : undefined;
  if (!course || course.teacher_id !== user.id) throw forbidden('只能批改自己课程下的作业。');
  db.run(`UPDATE forum_posts SET is_answer = ?, score = ? WHERE id = ?`, isAnswer ? 1 : 0, score ?? null, postId);
}

export function addAnnotation(
  user: SessionUser,
  input: { targetType: 'POST' | 'DOCUMENT_SNAPSHOT'; targetId: string; content: string; isPrivate?: boolean },
): { id: string } {
  if (user.role !== 'TEACHER') throw forbidden('只有教师可以添加批注。');
  if (!input.content.trim()) throw badRequest('批注内容不能为空。');
  if (input.targetType === 'POST') {
    const post = getDb().get<{ topic_id: string }>(`SELECT topic_id FROM forum_posts WHERE id = ?`, input.targetId);
    if (!post) throw notFound('目标回复不存在。');
    getTopic(post.topic_id, user);
  }
  const id = uid('ann');
  getDb().run(
    `INSERT INTO annotations (id, target_type, target_id, anchor, author_id, content, is_private, created_at)
     VALUES (?, ?, ?, '{}', ?, ?, ?, ?)`,
    id,
    input.targetType,
    input.targetId,
    user.id,
    input.content.trim(),
    input.isPrivate ? 1 : 0,
    new Date().toISOString(),
  );
  return { id };
}
