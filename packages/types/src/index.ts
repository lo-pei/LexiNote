/**
 * @ln/types — 唯一 DTO 真相源。
 * 约束：本包不得 import 任何运行时业务代码，仅类型与常量（见说明书 §2.2）。
 */

/* ── 枚举（与 DB 中的 CHECK 约束一致） ───────────────────────── */

export const ROLES = ['ADMIN', 'TEACHER', 'STUDENT'] as const;
export type Role = (typeof ROLES)[number];

export const DOC_STATUS = ['DRAFT', 'PUBLISHED'] as const;
export type DocStatus = (typeof DOC_STATUS)[number];

export const DOC_KIND = ['COURSEWARE', 'NOTE'] as const;
export type DocKind = (typeof DOC_KIND)[number];

export const SIDEBAR_TYPES = ['EXTENSION', 'ARTICLE', 'TEACHER_NOTE'] as const;
export type SidebarType = (typeof SIDEBAR_TYPES)[number];

export const READ_LEVELS = ['REQUIRED', 'OPTIONAL'] as const;
export type ReadLevel = (typeof READ_LEVELS)[number];

export const SOURCE_TYPES = ['COURSE', 'DOCUMENT', 'FORUM', 'MANUAL'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const TOPIC_TYPES = ['QUESTION', 'ASSIGNMENT'] as const;
export type TopicType = (typeof TOPIC_TYPES)[number];

export const EDITOR_MODES = ['edit', 'readonly', 'presentation', 'diff'] as const;
export type EditorMode = (typeof EDITOR_MODES)[number];

export const EVENT_TYPES = [
  'TERM_CLICK',
  'TRANSLATION_HIT',
  'WORD_ADDED',
  'NOTE_SAVE',
  'DOC_OPEN',
  'PRESENT_OPEN',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/* ── 富文本（Tiptap，全库唯一编辑内核） ─────────────────────── */

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapDoc extends TiptapNode {
  type: 'doc';
  content: TiptapNode[];
}

/** legalTerm 行内节点的 attrs（说明书 §5.1） */
export interface LegalTermAttrs {
  phonetic: string;
  definition: string;
  termId: string;
  color?: string;
}

/** flowchart 块级节点 attrs：与 React Flow 的 nodes/edges 形状兼容 */
export interface FlowchartData {
  nodes: {
    id: string;
    position: { x: number; y: number };
    data: { label: string; tone?: 'ink' | 'accent' | 'quiet' };
  }[];
  edges: { id: string; source: string; target: string; label?: string }[];
}

/* ── 领域实体 ──────────────────────────────────────────────── */

export interface User {
  id: string;
  /** 登录账号：学生为学号，教师为工号 */
  loginNo: string;
  /** 联系方式，可为空（注册只要求学号与姓名） */
  email: string | null;
  name: string;
  role: Role;
}

export interface UserRow extends User {
  passwordHash: string;
}

export interface Course {
  id: string;
  teacherId: string;
  teacherName?: string;
  /** 课程所属班级；为空的课程对所有学生开放选修 */
  classId: string | null;
  className: string | null;
  title: string;
  description: string | null;
  term: string | null;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
}

export interface CoursewareSummary {
  id: string;
  title: string;
  kind: DocKind;
  status: DocStatus;
  words: number;
  updatedAt: string;
  termCount: number;
}

export interface CourseDetail extends Course {
  courseware: CoursewareSummary[];
  assignments: ForumTopic[];
  enrolled: boolean;
  studentCount: number;
}

export interface DocumentRecord {
  id: string;
  ownerId: string;
  courseId: string | null;
  parentDocId: string | null;
  title: string;
  subtitle: string | null;
  content: TiptapDoc;
  status: DocStatus;
  kind: DocKind;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWithMeta extends DocumentRecord {
  ownerName: string;
  courseTitle: string | null;
  sidebar: SidebarItem[];
  /** 当前用户是否为该文档拥有者（决定可编辑性） */
  canEdit: boolean;
  /** 服务端裁决的只读原因 */
  readOnlyReason: string | null;
  /** 原课件标题（副本溯源） */
  originTitle: string | null;
}

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  userId: string;
  userName?: string;
  content: TiptapDoc;
  createdAt: string;
}

export interface SidebarItem {
  id: string;
  docId: string;
  type: SidebarType;
  title: string;
  content: TiptapDoc;
  level: ReadLevel;
  sortOrder: number;
}

export interface TranslationTemplate {
  id: string;
  sourceHash: string;
  sourceText: string;
  translation: string;
  langPair: string;
  termOverrides: Record<string, string> | null;
  createdBy: string;
}

export interface VocabularyExample {
  sentence: string;
  source?: string;
  note?: string;
}

export interface VocabularyEntry {
  id: string;
  term: string;
  phonetic: string | null;
  definitionZh: string;
  definitionEn: string | null;
  examples: VocabularyExample[] | null;
  legalDomain: string | null;
}

export interface Wordbook {
  id: string;
  userId: string;
  name: string;
  /** GLOSSARY = 内置术语表（只读词库），CUSTOM = 自建词表 */
  kind?: 'CUSTOM' | 'GLOSSARY';
  description: string | null;
  itemCount?: number;
}

export interface WordbookItem {
  id: string;
  userId: string;
  wordbookId: string;
  entryId: string;
  sourceType: SourceType;
  sourceDocId: string | null;
  sourceDocTitle: string | null;
  sourceContext: string | null;
  masteryLevel: number;
  addedAt: string;
  entry: VocabularyEntry;
}

export interface ForumTopic {
  id: string;
  courseId: string;
  authorId: string;
  authorName?: string;
  type: TopicType;
  title: string;
  body: TiptapDoc;
  isGraded: boolean;
  dueAt: string | null;
  allowedReplyRoles: Role[];
  replyCount?: number;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  topicId: string;
  authorId: string;
  authorName?: string;
  authorRole?: Role;
  parentPostId: string | null;
  body: TiptapDoc;
  isAnswer: boolean;
  score: number | null;
  createdAt: string;
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  targetType: 'POST' | 'DOCUMENT_SNAPSHOT';
  targetId: string;
  anchor: Record<string, unknown>;
  authorId: string;
  authorName?: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface LearningEvent {
  id: string;
  userId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SkillConfigRecord {
  id: string;
  name: string;
  yaml: string;
  version: number;
  updatedAt: string;
}

export interface DevLogEntry {
  id: string;
  phase: string;
  goal: string;
  decisions: { title: string; detail: string }[];
  status: string;
  sortOrder: number;
}

/* ── 学情聚合（读聚合表，不扫原始事件） ─────────────────────── */

export interface StudentMetric {
  studentId: string;
  name: string;
  studentNo: string;
  noteSaves: number;
  termClicks: number;
  wordsAdded: number;
  forumReplies: number;
  translationHitRate: number;
  lastActiveAt: string | null;
}

export interface TermHeat {
  term: string;
  definition: string;
  clicks: number;
  wordsAdded: number;
}

export interface AnalyticsOverview {
  courseId: string;
  courseTitle: string;
  studentCount: number;
  coursewareCount: number;
  translationHitRate: number;
  translationChecks: number;
  totalWordsAdded: number;
  unmasteredWords: number;
  students: StudentMetric[];
  termHeat: TermHeat[];
  weekly: { week: string; noteSaves: number; termClicks: number }[];
}

/* ── 导出 DTO（三渲染器共用，说明书 §5.8） ──────────────────── */

export interface WordbookExportRow {
  term: string;
  phonetic: string;
  definitionZh: string;
  definitionEn: string;
  source: string;
  context: string;
  example: string;
  mastery: string;
  addedAt: string;
}

export interface WordbookExportDTO {
  wordbookName: string;
  ownerName: string;
  generatedAt: string;
  rows: WordbookExportRow[];
  meta: { total: number; mastered: number; sources: string[] };
}

export type ExportFormat = 'xlsx' | 'docx' | 'pdf';

/* ── API 信封（说明书 §6） ─────────────────────────────────── */

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
}

/* ── 会话 ──────────────────────────────────────────────────── */

export interface SessionUser extends User {
  /** 由服务端在登录时写入，前端仅用于渲染，不作权限裁决 */
  initials: string;
}

export interface CourseEnrollmentState {
  courseId: string;
  enrolled: boolean;
  studentCount: number;
}

/* ── 班级 ──────────────────────────────────────────────────── */

/** 成员加入班级的来源：班级码 / 邀请链接 / 教师手动添加 */
export const JOIN_SOURCES = ['CODE', 'INVITE', 'INVITED', 'MANUAL'] as const;
export type JoinSource = (typeof JOIN_SOURCES)[number];

export interface ClassSummary {
  id: string;
  name: string;
  term: string | null;
  description: string | null;
  teacherId: string;
  teacherName: string;
  /** 班级码：仅教师与已加入成员可见 */
  joinCode: string;
  joinOpen: boolean;
  memberCount: number;
  courseCount: number;
  /** 当前用户是否为该班教师 */
  isOwner: boolean;
  createdAt: string;
}

export interface ClassMember {
  id: string;
  userId: string;
  loginNo: string;
  name: string;
  memberRole: 'STUDENT' | 'ASSISTANT';
  source: JoinSource;
  joinedAt: string;
}

export interface ClassInvite {
  id: string;
  classId: string;
  token: string;
  note: string | null;
  createdByName: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface ClassCourse {
  id: string;
  title: string;
  term: string | null;
  coursewareCount: number;
}

export interface ClassDetail extends ClassSummary {
  members: ClassMember[];
  invites: ClassInvite[];
  courses: ClassCourse[];
}

/** 邀请链接的落地页信息（未登录也可读，用以决定是否注册） */
export interface InvitePreview {
  token: string;
  classId: string;
  className: string;
  term: string | null;
  teacherName: string;
  memberCount: number;
  courseCount: number;
  note: string | null;
  expiresAt: string | null;
  exhausted: boolean;
  /** 已登录用户是否已在班内 */
  alreadyMember: boolean;
}

export interface JoinResult {
  classId: string;
  className: string;
  alreadyMember: boolean;
  /** 因加入班级而自动选修的课程数 */
  enrolledCourses: number;
}
