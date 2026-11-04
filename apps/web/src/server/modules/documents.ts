import type {
  DocKind,
  DocStatus,
  DocumentSnapshot,
  DocumentWithMeta,
  ReadLevel,
  SessionUser,
  SidebarItem,
  SidebarType,
  TiptapDoc,
} from '@ln/types';
import { countTerms, countWords, textOf, wordDiff, diffStats } from '@ln/utils';
import { getDb, parseJson } from '../db';
import { badRequest, forbidden, notFound } from '../http';
import { indexDocument } from './search';

interface DocRow {
  id: string;
  owner_id: string;
  course_id: string | null;
  parent_doc_id: string | null;
  textbook_id: string | null;
  chapter_no: number | null;
  legal_slug: string | null;
  legal_category: string | null;
  legal_published_on: string | null;
  title: string;
  subtitle: string | null;
  content: string;
  status: DocStatus;
  kind: DocKind;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface SidebarRow {
  id: string;
  doc_id: string;
  type: SidebarType;
  title: string;
  content: string;
  level: ReadLevel;
  sort_order: number;
}

const uid = (prefix: string) => `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

function sidebarOf(docId: string, locked: boolean): (SidebarItem & { locked: boolean })[] {
  const rows = getDb().all<SidebarRow>(
    `SELECT * FROM sidebar_items WHERE doc_id = ? ORDER BY
       CASE level WHEN 'REQUIRED' THEN 0 ELSE 1 END, sort_order ASC`,
    docId,
  );
  return rows.map((r) => ({
    id: r.id,
    docId: r.doc_id,
    type: r.type,
    title: r.title,
    content: parseJson<TiptapDoc>(r.content, { type: 'doc', content: [] }),
    level: r.level,
    sortOrder: r.sort_order,
    locked,
  }));
}

function canViewCourse(user: SessionUser, courseId: string | null): boolean {
  if (!courseId) return false;
  const db = getDb();
  const course = db.get<{ teacher_id: string }>(`SELECT teacher_id FROM courses WHERE id = ?`, courseId);
  if (!course) return false;
  if (course.teacher_id === user.id) return true;
  return Boolean(db.get(`SELECT 1 FROM enrollments WHERE course_id = ? AND student_id = ?`, courseId, user.id));
}

/** 判定一份文档对当前用户是否可读；getDocument 与 docRefs 共用同一套规则 */
function canViewRow(
  row: { owner_id: string; course_id: string | null; kind: DocKind; status: DocStatus },
  user: SessionUser,
): boolean {
  const db = getDb();
  const isOwner = row.owner_id === user.id;
  const isCourseTeacher = Boolean(
    row.course_id &&
      db.get<{ teacher_id: string }>(`SELECT teacher_id FROM courses WHERE id = ?`, row.course_id)
        ?.teacher_id === user.id,
  );
  // 教材与英文法律是公共读物：已发布即对全部登录用户开放，不看选课（两者都不挂课程）
  const isPublicRead = (row.kind === 'TEXTBOOK' || row.kind === 'LAW') && row.status === 'PUBLISHED';
  return (
    isOwner ||
    isCourseTeacher ||
    isPublicRead ||
    (row.status === 'PUBLISHED' && canViewCourse(user, row.course_id))
  );
}

/**
 * 把一批文档 id 换成「当前用户读得到的」标题。
 *
 * 课程安排页的专题与案例挂的是课件 id，标题一律现取：文档改名、删除或
 * 收回权限后，页面自动跟着变，不会留一条点进去 403 的死链。
 */
export function docRefs(ids: string[], user: SessionUser): Map<string, { title: string; kind: DocKind }> {
  const out = new Map<string, { title: string; kind: DocKind }>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return out;

  const db = getDb();
  for (const id of unique) {
    const row = db.get<{
      id: string;
      title: string;
      kind: DocKind;
      status: DocStatus;
      owner_id: string;
      course_id: string | null;
    }>(`SELECT id, title, kind, status, owner_id, course_id FROM documents WHERE id = ? AND deleted_at IS NULL`, id);
    if (!row || !canViewRow(row, user)) continue;
    out.set(row.id, { title: row.title, kind: row.kind });
  }
  return out;
}

export function getDocument(id: string, user: SessionUser): DocumentWithMeta {
  const db = getDb();
  const row = db.get<DocRow>(`SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL`, id);
  if (!row) throw notFound('文档不存在或已删除。');

  const isOwner = row.owner_id === user.id;
  // 教材与法律正文不开放编辑，连导入账号（所有者）也不例外——否则一次误保存就改了原文
  const editableKind = row.kind !== 'TEXTBOOK' && row.kind !== 'LAW';
  const canEdit = isOwner && editableKind;
  if (!canViewRow(row, user)) throw forbidden('你还没有权限阅读这份文档。');

  const owner = db.get<{ name: string }>(`SELECT name FROM users WHERE id = ?`, row.owner_id);
  const course = row.course_id
    ? db.get<{ title: string }>(`SELECT title FROM courses WHERE id = ?`, row.course_id)
    : undefined;
  const origin = row.parent_doc_id
    ? db.get<{ title: string }>(`SELECT title FROM documents WHERE id = ?`, row.parent_doc_id)
    : undefined;

  return {
    id: row.id,
    ownerId: row.owner_id,
    courseId: row.course_id,
    parentDocId: row.parent_doc_id,
    textbookId: row.textbook_id,
    chapterNo: row.chapter_no,
    legalSlug: row.legal_slug,
    legalCategory: row.legal_category,
    legalPublishedOn: row.legal_published_on,
    title: row.title,
    subtitle: row.subtitle,
    content: parseJson<TiptapDoc>(row.content, { type: 'doc', content: [] }),
    status: row.status,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerName: owner?.name ?? '未知',
    courseTitle: course?.title ?? null,
    originTitle: origin?.title ?? null,
    canEdit,
    readOnlyReason: canEdit
      ? null
      : row.kind === 'TEXTBOOK'
        ? '教材正文为只读：可以在阅读页标生词、对照译文、做批注，正文本体不提供编辑。'
        : row.kind === 'LAW'
          ? '英文法律正文为只读：译本取自全国人大官网，站内只用于阅读与术语标注。'
          : row.kind === 'COURSEWARE'
            ? '教师发布的课件为只读；纳入我的笔记库后可自由编辑。'
            : '仅文档所有者可以编辑。',
    sidebar: sidebarOf(row.parent_doc_id ?? row.id, Boolean(row.parent_doc_id)),
  };
}

export interface LibraryEntry {
  id: string;
  title: string;
  subtitle: string | null;
  kind: DocKind;
  status: DocStatus;
  updatedAt: string;
  originTitle: string | null;
  /** 所属课程名；两门课同名时用班名区分，未挂课时为 null */
  courseTitle: string | null;
  words: number;
  terms: number;
}

export function listLibrary(user: SessionUser): LibraryEntry[] {
  const db = getDb();
  const rows = db.all<DocRow & { origin_title: string | null; course_title: string | null }>(
    // 教材章节归教材库管理、英文法律归专题管理，都不混进「我的文档」，
    // 否则一次导入就是上百行噪音
    // 两门课都叫「法律英语」，光看课程名分不清是哪个班，所以优先用班级名
    `SELECT d.*, o.title AS origin_title, COALESCE(cl.name, c.title) AS course_title
     FROM documents d
     LEFT JOIN documents o ON o.id = d.parent_doc_id
     LEFT JOIN courses c ON c.id = d.course_id
     LEFT JOIN classes cl ON cl.id = c.class_id
     WHERE d.owner_id = ? AND d.deleted_at IS NULL AND d.kind NOT IN ('TEXTBOOK','LAW')
     ORDER BY d.updated_at DESC`,
    user.id,
  );
  return rows.map((r) => {
    const doc = parseJson<TiptapDoc>(r.content, { type: 'doc', content: [] });
    return {
      id: r.id,
      title: r.title,
      subtitle: r.subtitle,
      kind: r.kind,
      status: r.status,
      updatedAt: r.updated_at,
      originTitle: r.origin_title,
      courseTitle: r.course_title,
      words: countWords(textOf(doc)),
      terms: countTerms(doc),
    };
  });
}

export function createDocument(
  input: { title: string; kind: DocKind; courseId?: string | null; content?: TiptapDoc },
  user: SessionUser,
): { id: string } {
  const db = getDb();
  if (input.kind === 'TEXTBOOK') throw badRequest('教材由导入流程生成，不能手工创建。', 'kind');
  if (input.kind === 'LAW') throw badRequest('英文法律由导入流程生成，不能手工创建。', 'kind');
  const id = uid('doc');
  const iso = new Date().toISOString();
  const content: TiptapDoc =
    input.content ??
    // 标题已经单独存在 title 字段里，正文不再重复一份「未命名笔记」；
    // DOCUMENT / NOTE 建出来就是一张白纸，光标落在首行由编辑器负责。
    (input.kind === 'COURSEWARE'
      ? {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: input.title || '未命名' }] },
            { type: 'paragraph' },
          ],
        }
      : { type: 'doc', content: [{ type: 'paragraph' }] });

  if (input.kind === 'COURSEWARE') {
    if (user.role !== 'TEACHER') throw forbidden('只有教师可以创建课件。');
    // 挂课的课件必须是自己教的课；不挂课的放个人课件库，之后可再归到某门课
    if (input.courseId) {
      const course = db.get<{ teacher_id: string }>(`SELECT teacher_id FROM courses WHERE id = ?`, input.courseId);
      if (!course) throw notFound('课程不存在。');
      if (course.teacher_id !== user.id) throw forbidden('只能在自己的课程下创建课件。');
    }
  }

  db.run(
    `INSERT INTO documents (id, owner_id, course_id, parent_doc_id, title, subtitle, content, status, kind, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, NULL, ?, 'DRAFT', ?, 0, ?, ?)`,
    id,
    user.id,
    input.courseId ?? null,
    // 占位符顺序是 title → content，别写反：写反会让标题存成 JSON、正文只剩标题
    input.title.trim() || '未命名文档',
    JSON.stringify(content),
    input.kind,
    iso,
    iso,
  );
  // 索引失败不影响建文档本身，indexDocument 内部已吞掉异常
  indexDocument(id);
  return { id };
}

const SNAPSHOT_EVERY_MS = 5 * 60 * 1000;

export function saveDocument(
  id: string,
  user: SessionUser,
  patch: { title?: string; content?: TiptapDoc; status?: DocStatus },
): { updatedAt: string; snapshotId: string | null } {
  const db = getDb();
  const row = db.get<DocRow>(`SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL`, id);
  if (!row) throw notFound('文档不存在。');
  if (row.owner_id !== user.id) throw forbidden('只有文档所有者可以保存。');
  if (row.kind === 'TEXTBOOK') throw forbidden('教材正文为只读，不能保存修改。');
  if (row.kind === 'LAW') throw forbidden('英文法律正文为只读，不能保存修改。');

  const iso = new Date().toISOString();
  const content = patch.content ? JSON.stringify(patch.content) : row.content;
  const title = patch.title?.trim() || row.title;
  const status = patch.status ?? row.status;

  db.run(
    `UPDATE documents SET title = ?, content = ?, status = ?, updated_at = ? WHERE id = ?`,
    title,
    content,
    status,
    iso,
    id,
  );

  // 每次保存创建快照，但 5 分钟内的高频保存合并，避免快照爆炸
  const last = db.get<{ created_at: string }>(
    `SELECT created_at FROM document_snapshots WHERE document_id = ? ORDER BY created_at DESC LIMIT 1`,
    id,
  );
  let snapshotId: string | null = null;
  if (!last || Date.now() - new Date(last.created_at).getTime() > SNAPSHOT_EVERY_MS) {
    snapshotId = uid('snp');
    db.run(
      `INSERT INTO document_snapshots (id, document_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)`,
      snapshotId,
      id,
      user.id,
      content,
      iso,
    );
  }

  // 正文可能已变：同步检索索引。放最后是因为快照失败时不该留下「索引比正文新」的状态
  indexDocument(id);

  return { updatedAt: iso, snapshotId };
}

export function publishDocument(id: string, user: SessionUser): void {
  const db = getDb();
  const row = db.get<DocRow>(`SELECT * FROM documents WHERE id = ?`, id);
  if (!row) throw notFound('文档不存在。');
  if (row.owner_id !== user.id) throw forbidden();
  if (row.kind !== 'COURSEWARE') throw badRequest('只有课件可以发布。');
  db.run(`UPDATE documents SET status = 'PUBLISHED', updated_at = ? WHERE id = ?`, new Date().toISOString(), id);
}

export function cloneToLibrary(sourceId: string, user: SessionUser): { id: string } {
  const db = getDb();
  const row = db.get<DocRow>(`SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL`, sourceId);
  if (!row) throw notFound('文档不存在。');
  if (row.status !== 'PUBLISHED') throw forbidden('该课件尚未发布。');
  if (!canViewCourse(user, row.course_id)) throw forbidden('请先选修该课程。');

  const existing = db.get<{ id: string }>(
    `SELECT id FROM documents WHERE owner_id = ? AND parent_doc_id = ? AND deleted_at IS NULL`,
    user.id,
    sourceId,
  );
  if (existing) return { id: existing.id };

  const id = uid('doc');
  const iso = new Date().toISOString();
  db.run(
    `INSERT INTO documents (id, owner_id, course_id, parent_doc_id, title, subtitle, content, status, kind, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', 'NOTE', 0, ?, ?)`,
    id,
    user.id,
    row.course_id,
    sourceId,
    `${row.title}（我的笔记）`,
    row.subtitle ? `来自课件 · ${row.title}` : '来自课件',
    row.content,
    iso,
    iso,
  );
  db.run(
    `INSERT INTO document_snapshots (id, document_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)`,
    uid('snp'),
    id,
    user.id,
    row.content,
    iso,
  );
  return { id };
}

export function listSnapshots(docId: string, user: SessionUser): DocumentSnapshot[] {
  const db = getDb();
  const row = db.get<DocRow>(`SELECT * FROM documents WHERE id = ?`, docId);
  if (!row) throw notFound('文档不存在。');

  const isOwner = row.owner_id === user.id;
  const isTeacher = Boolean(
    row.course_id &&
      db.get<{ teacher_id: string }>(`SELECT teacher_id FROM courses WHERE id = ?`, row.course_id)
        ?.teacher_id === user.id,
  );
  if (!isOwner && !isTeacher) throw forbidden();

  const rows = db.all<{ id: string; document_id: string; user_id: string; content: string; created_at: string; name: string }>(
    `SELECT s.*, u.name FROM document_snapshots s JOIN users u ON u.id = s.user_id
     WHERE s.document_id = ? ORDER BY s.created_at DESC`,
    docId,
  );
  return rows.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    userId: r.user_id,
    userName: r.name,
    content: parseJson<TiptapDoc>(r.content, { type: 'doc', content: [] }),
    createdAt: r.created_at,
  }));
}

export interface DiffResult {
  from: { id: string; createdAt: string };
  to: { id: string; createdAt: string };
  chunks: { op: 'equal' | 'insert' | 'delete'; text: string }[];
  stats: { added: number; removed: number };
}

export function computeDiff(docId: string, fromId: string, toId: string, user: SessionUser): DiffResult {
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') throw forbidden('只有教师可以查看修改对比。');
  const snaps = listSnapshots(docId, user);
  const from = snaps.find((s) => s.id === fromId);
  const to = snaps.find((s) => s.id === toId);
  if (!from || !to) throw notFound('快照不存在。');

  const chunks = wordDiff(textOf(from.content), textOf(to.content));
  return {
    from: { id: from.id, createdAt: from.createdAt },
    to: { id: to.id, createdAt: to.createdAt },
    chunks,
    stats: diffStats(chunks),
  };
}

export function updateSidebarLevel(itemId: string, level: ReadLevel, user: SessionUser): void {
  if (user.role !== 'TEACHER') throw forbidden('只有教师可以设置必读 / 选读。');
  const db = getDb();
  const item = db.get<{ doc_id: string }>(`SELECT doc_id FROM sidebar_items WHERE id = ?`, itemId);
  if (!item) throw notFound('侧栏条目不存在。');
  const doc = db.get<{ course_id: string | null }>(`SELECT course_id FROM documents WHERE id = ?`, item.doc_id);
  const course = doc?.course_id
    ? db.get<{ teacher_id: string }>(`SELECT teacher_id FROM courses WHERE id = ?`, doc.course_id)
    : undefined;
  if (!course || course.teacher_id !== user.id) throw forbidden('只能修改自己课程下的侧栏分级。');
  db.run(`UPDATE sidebar_items SET level = ? WHERE id = ?`, level, itemId);
}

export function updateSidebarItem(
  itemId: string,
  patch: { title?: string; level?: ReadLevel },
  user: SessionUser,
): void {
  if (patch.level) updateSidebarLevel(itemId, patch.level, user);
  if (patch.title) {
    if (user.role !== 'TEACHER') throw forbidden();
    getDb().run(`UPDATE sidebar_items SET title = ? WHERE id = ?`, patch.title.trim(), itemId);
  }
}
