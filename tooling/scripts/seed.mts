/**
 * 数据库初始化与种子数据。
 * 运行：npm run db:reset
 *
 * 说明：seed 与运行时使用同一套 schema（packages/db/schema.sql）与同一套归一化/哈希
 * 实现（@ln/utils），因此 translation_templates 的 sourceHash 与浏览器端计算完全一致。
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashSource, normalizeSource, splitSentences, initialsOf } from '@ln/utils';
import type { TiptapNode } from '@ln/types';
import { courseware, offerDoc } from '../content/courseware';
import { vocabulary } from '../content/vocabulary';
import { translations } from '../content/translations';
import { sidebarItems } from '../content/sidebar';
import { skillYaml } from '../content/skill';
import { devLogs } from '../content/devlog';
import { forumSeed, enrollmentPlan, users, classSeed } from '../content/people';

const ROOT = process.cwd();
const DB_PATH = process.env.LN_DB_PATH
  ? path.resolve(ROOT, process.env.LN_DB_PATH)
  : path.join(ROOT, 'data', 'lexinote.db');

/* ── 工具 ───────────────────────────────────────────────── */

const now = Date.now();
const iso = (offsetDays: number, hour = 9): string => {
  const d = new Date(now - offsetDays * 86400000);
  d.setHours(hour, Math.floor((offsetDays * 37) % 60), 0, 0);
  return d.toISOString();
};

let counter = 0;
const uid = (prefix = 'x') => `${prefix}_${(counter += 1).toString(36).padStart(6, '0')}${Math.random().toString(36).slice(2, 8)}`;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261101);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

function plain(node: TiptapNode): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(plain).join('');
}

/* ── 打开并重建 ─────────────────────────────────────────── */

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
if (fs.existsSync(DB_PATH)) fs.rmSync(DB_PATH);
for (const suffix of ['-wal', '-shm']) {
  const f = `${DB_PATH}${suffix}`;
  if (fs.existsSync(f)) fs.rmSync(f);
}

const db = new DatabaseSync(DB_PATH);
db.exec(fs.readFileSync(path.join(ROOT, 'packages', 'db', 'schema.sql'), 'utf8'));

const run = (sql: string, ...params: (string | number | null)[]) => db.prepare(sql).run(...params);

/* ── 用户 ───────────────────────────────────────────────── */

const userId = new Map<string, string>();
for (const u of users) {
  const id = uid('usr');
  userId.set(u.loginNo, id);
  run(
    `INSERT INTO users (id, login_no, email, name, role, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    u.loginNo,
    u.email,
    u.name,
    u.role,
    u.passwordHash,
    iso(120, 8),
    iso(0, 8),
  );
}

const teacherId = userId.get('T202601')!;
const teacher2Id = userId.get('T202602')!;
const studentIds = users.filter((u) => u.role === 'STUDENT').map((u) => userId.get(u.loginNo)!);

/* ── 班级 ───────────────────────────────────────────────── */

const classIds = classSeed.map(() => uid('cls'));

for (const [index, c] of classSeed.entries()) {
  const teacherUid = userId.get(c.teacherLoginNo)!;
  run(
    `INSERT INTO classes (id, teacher_id, name, term, description, join_code, join_open, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    classIds[index]!,
    teacherUid,
    c.name,
    c.term,
    c.description,
    c.joinCode,
    iso(70, 10),
  );

  for (const [order, memberIdx] of c.memberIdxs.entries()) {
    const memberId = studentIds[memberIdx]!;
    const member = users.filter((u) => u.role === 'STUDENT')[memberIdx]!;
    run(
      `INSERT INTO class_members (id, class_id, user_id, login_no, display_name, member_role, source, invited_by, joined_at)
       VALUES (?, ?, ?, ?, ?, 'STUDENT', ?, NULL, ?)`,
      uid('mem'),
      classIds[index]!,
      memberId,
      member.loginNo,
      member.name,
      order < 3 ? 'CODE' : 'INVITE',
      iso(58 - order * 2, 10),
    );
  }

  if (c.demoInvite) {
    run(
      `INSERT INTO class_invites (id, class_id, token, created_by, note, max_uses, used_count, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, NULL, ?)`,
      uid('inv'),
      classIds[index]!,
      c.demoInvite,
      teacherUid,
      `${c.name} · 演示邀请链接`,
      iso(12, 10),
    );
  }
}

/* ── 课程与选课 ─────────────────────────────────────────── */

const courses = [
  {
    id: uid('crs'),
    teacherId,
    classId: classIds[0]!,
    title: '法律英语精读 · 合同法',
    description:
      '以英国合同法经典判例为读本，逐句精读 offer、acceptance、consideration 三段结构；每讲配一份可标注的课件与一套预置译文。',
    term: '2026 秋季学期 · LAW 2103',
  },
  {
    id: uid('crs'),
    teacherId,
    classId: classIds[1]!,
    title: '英美判例阅读 · 侵权与责任',
    description:
      '从 Donoghue v Stevenson 到 Caparo，训练读判决书的四步法：事实、争点、判决、理由。',
    term: '2026 秋季学期 · LAW 3211',
  },
  {
    id: uid('crs'),
    teacherId: teacher2Id,
    classId: classIds[2]!,
    title: '法律翻译工作坊',
    description: '以真实合同与判决书为材料的中英互译训练，重点处理术语一致性与句法重组。',
    term: '2026 秋季学期 · LAW 4402',
  },
];

for (const c of courses) {
  run(
    `INSERT INTO courses (id, teacher_id, class_id, title, description, term, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    c.id,
    c.teacherId,
    c.classId,
    c.title,
    c.description,
    c.term,
    iso(90, 10),
    iso(3, 10),
  );
}

for (const [courseIdx, list] of enrollmentPlan.entries()) {
  for (const idx of list) {
    run(
      `INSERT INTO enrollments (id, student_id, course_id, created_at) VALUES (?, ?, ?, ?)`,
      uid('enr'),
      studentIds[idx]!,
      courses[courseIdx]!.id,
      iso(60 - idx, 11),
    );
  }
}

/* ── 课件 ───────────────────────────────────────────────── */

const docIds: Record<string, string> = {};
for (const [index, item] of courseware.entries()) {
  const id = uid('doc');
  docIds[item.slug] = id;
  const courseId = index < 2 ? courses[0]!.id : courses[1]!.id;
  run(
    `INSERT INTO documents (id, owner_id, course_id, parent_doc_id, title, subtitle, content, status, kind, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, 'PUBLISHED', 'COURSEWARE', ?, ?, ?)`,
    id,
    teacherId,
    courseId,
    item.title,
    item.subtitle,
    JSON.stringify(item.content),
    index,
    iso(40 - index * 6, 9),
    iso(2 + index, 16),
  );

  for (const [sortOrder, entry] of (sidebarItems[item.slug] ?? []).entries()) {
    run(
      `INSERT INTO sidebar_items (id, doc_id, type, title, content, level, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uid('sbi'),
      id,
      entry.type,
      entry.title,
      JSON.stringify({ type: 'doc', content: entry.content }),
      entry.level,
      sortOrder,
    );
  }
}

/* ── 学生副本（纳入笔记库） ─────────────────────────────── */

const linId = studentIds[0]!;
const suId = studentIds[1]!;

const copyId = uid('doc');
run(
  `INSERT INTO documents (id, owner_id, course_id, parent_doc_id, title, subtitle, content, status, kind, sort_order, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', 'NOTE', 0, ?, ?)`,
  copyId,
  linId,
  courses[0]!.id,
  docIds['offer-and-acceptance']!,
  'Offer and Acceptance（我的笔记）',
  '来自课件 · 合同法第三讲',
  JSON.stringify(offerDoc.content),
  iso(9, 21),
  iso(1, 22),
);

run(
  `INSERT INTO document_snapshots (id, document_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)`,
  uid('snp'),
  copyId,
  linId,
  JSON.stringify(offerDoc.content),
  iso(9, 21),
);

/* ── 翻译模板 ───────────────────────────────────────────── */

const hashSeen = new Set<string>();
const unmatched: string[] = [];

for (const t of translations) {
  const hash = await hashSource(t.sourceText);
  if (hashSeen.has(hash)) continue;
  hashSeen.add(hash);
  run(
    `INSERT INTO translation_templates (id, source_hash, source_text, translation, lang_pair, term_overrides, created_by, created_at)
     VALUES (?, ?, ?, ?, 'en-zh', ?, ?, ?)`,
    uid('tr'),
    hash,
    t.sourceText,
    t.translation,
    t.termOverrides ? JSON.stringify(t.termOverrides) : null,
    teacherId,
    iso(30, 12),
  );
}

// 覆盖率自检：把课件逐段切句，确认每条模板都能被前端算出的哈希命中
for (const item of courseware) {
  for (const node of item.content.content) {
    if (node.type !== 'paragraph') continue;
    for (const s of splitSentences(plain(node))) {
      const h = await hashSource(s.text);
      if (!hashSeen.has(h) && s.text.length > 40) unmatched.push(s.text.slice(0, 70));
    }
  }
}

/* ── 词典与单词本 ───────────────────────────────────────── */

const entryIds = new Map<string, string>();
for (const v of vocabulary) {
  const id = uid('voc');
  entryIds.set(v.term, id);
  run(
    `INSERT INTO vocabulary_entries (id, term, phonetic, definition_zh, definition_en, examples, legal_domain)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    v.term,
    v.phonetic,
    v.definitionZh,
    v.definitionEn,
    JSON.stringify(v.examples),
    v.domain,
  );
}

const wordbooks = [
  { id: uid('wb'), userId: linId, name: '合同法核心术语', description: '第三讲至第五讲，随堂标注' },
  { id: uid('wb'), userId: linId, name: '侵权法', description: '第二讲 · Donoghue 案读后' },
  { id: uid('wb'), userId: suId, name: '我的生词', description: null },
];

for (const wb of wordbooks) {
  run(
    `INSERT INTO wordbooks (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)`,
    wb.id,
    wb.userId,
    wb.name,
    wb.description,
    iso(14, 20),
  );
}

const linWords: { term: string; context: string; mastery: number; source: 'COURSE' | 'MANUAL' }[] = [
  { term: 'offer', context: 'An offer is a statement of the terms on which the offeror is willing to be bound.', mastery: 3, source: 'COURSE' },
  { term: 'acceptance', context: 'An acceptance is the unqualified expression of assent to every term of the offer.', mastery: 3, source: 'COURSE' },
  { term: 'consideration', context: 'Every contract in English law is built from the same three elements: an offer, an acceptance, and consideration.', mastery: 2, source: 'COURSE' },
  { term: 'invitation to treat', context: 'A shop-window display is, in general, an invitation to treat.', mastery: 2, source: 'COURSE' },
  { term: 'unilateral contract', context: 'Where an offer invites performance, the courts speak of a unilateral contract.', mastery: 1, source: 'COURSE' },
  { term: 'puff', context: 'The advertisement, it said, was a mere puff.', mastery: 2, source: 'COURSE' },
  { term: 'counter-offer', context: 'A counter-offer destroys the original offer.', mastery: 1, source: 'COURSE' },
  { term: 'ratio decidendi', context: 'Which reasons were necessary to the result (the ratio decidendi)?', mastery: 0, source: 'COURSE' },
  { term: 'assent', context: 'Acceptance is the unqualified expression of assent.', mastery: 1, source: 'COURSE' },
  { term: 'reasonable person', context: null as unknown as string, mastery: 2, source: 'MANUAL' },
];

for (const w of linWords) {
  const entryId = entryIds.get(w.term);
  if (!entryId) continue;
  run(
    `INSERT INTO wordbook_items (id, user_id, wordbook_id, entry_id, source_type, source_doc_id, source_context, mastery_level, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    uid('wbi'),
    linId,
    wordbooks[0]!.id,
    entryId,
    w.source,
    w.source === 'COURSE' ? docIds['offer-and-acceptance']! : null,
    w.context ?? null,
    w.mastery,
    iso(12 - (w.mastery % 5), 19),
  );
}

for (const term of ['duty of care', 'negligence', 'proximity', 'tort']) {
  const entryId = entryIds.get(term);
  if (!entryId) continue;
  run(
    `INSERT INTO wordbook_items (id, user_id, wordbook_id, entry_id, source_type, source_doc_id, source_context, mastery_level, added_at)
     VALUES (?, ?, ?, ?, 'COURSE', ?, ?, ?, ?)`,
    uid('wbi'),
    linId,
    wordbooks[1]!.id,
    entryId,
    docIds['negligence-duty-of-care']!,
    'Negligence is not a single tort but a family of them.',
    Math.floor(rand() * 3),
    iso(5, 20),
  );
}

/* ── 论坛 ───────────────────────────────────────────────── */

const topicIds: string[] = [];
for (const t of forumSeed) {
  const id = uid('top');
  topicIds.push(id);
  run(
    `INSERT INTO forum_topics (id, course_id, author_id, type, title, body, is_graded, due_at, allowed_reply_roles, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    courses[t.courseIdx]!.id,
    t.authorIsTeacher ? teacherId : studentIds[t.authorIdx ?? 0]!,
    t.type,
    t.title,
    JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: t.body }] }] }),
    t.graded ? 1 : 0,
    t.dueInDays ? iso(-t.dueInDays, 23) : null,
    JSON.stringify(['TEACHER', 'STUDENT']),
    iso(t.daysAgo, 20),
  );

  for (const post of t.posts) {
    const postId = uid('pst');
    run(
      `INSERT INTO forum_posts (id, topic_id, author_id, parent_post_id, body, is_answer, score, created_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
      postId,
      id,
      post.teacher ? teacherId : studentIds[post.authorIdx!]!,
      JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: post.body }] }] }),
      post.answer ? 1 : 0,
      post.score ?? null,
      iso(post.daysAgo, 21),
    );

    if (post.note) {
      run(
        `INSERT INTO annotations (id, target_type, target_id, anchor, author_id, content, is_private, created_at)
         VALUES (?, 'POST', ?, ?, ?, ?, 0, ?)`,
        uid('ann'),
        postId,
        JSON.stringify({ from: 0, to: 0 }),
        teacherId,
        post.note,
        iso(post.daysAgo, 22),
      );
    }
  }
}

/* ── 学习事件 → 聚合表 ──────────────────────────────────── */

const eventTypes = ['TERM_CLICK', 'TRANSLATION_HIT', 'WORD_ADDED', 'NOTE_SAVE', 'DOC_OPEN'] as const;

for (let day = 13; day >= 0; day -= 1) {
  for (const [idx, studentId] of studentIds.entries()) {
    const courseIdx = enrollmentPlan.findIndex((list) => list.includes(idx));
    if (courseIdx < 0) continue;
    const courseId = courses[courseIdx]!.id;
    const activity = 2 + Math.floor(rand() * (idx % 3 === 0 ? 8 : 4));

    for (let n = 0; n < activity; n += 1) {
      const type = pick([...eventTypes]);
      const payload: Record<string, unknown> = { courseId };
      if (type === 'TERM_CLICK') payload.term = pick(['offer', 'consideration', 'counter-offer', 'puff', 'proximity']);
      if (type === 'TRANSLATION_HIT') payload.matched = rand() > 0.18;
      if (type === 'WORD_ADDED') payload.term = pick(['offer', 'puff', 'assent']);
      run(
        `INSERT INTO learning_events (id, user_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)`,
        uid('evt'),
        studentId,
        type,
        JSON.stringify(payload),
        iso(day, 9 + (n % 9)),
      );
    }
  }
}

db.exec(`
  INSERT INTO analytics_daily (id, day, course_id, student_id, note_saves, term_clicks, words_added, forum_replies, translation_checks, translation_hits)
  SELECT
    lower(hex(randomblob(10))),
    e.day,
    e.course_id,
    e.user_id,
    SUM(CASE WHEN e.event_type = 'NOTE_SAVE' THEN 1 ELSE 0 END),
    SUM(CASE WHEN e.event_type = 'TERM_CLICK' THEN 1 ELSE 0 END),
    SUM(CASE WHEN e.event_type = 'WORD_ADDED' THEN 1 ELSE 0 END),
    SUM(CASE WHEN e.event_type = 'FORUM_REPLY' THEN 1 ELSE 0 END),
    SUM(CASE WHEN e.event_type = 'TRANSLATION_HIT' THEN 1 ELSE 0 END),
    SUM(CASE WHEN e.event_type = 'TRANSLATION_HIT' AND json_extract(e.payload, '$.matched') = 1 THEN 1 ELSE 0 END)
  FROM (
    SELECT substr(created_at, 1, 10) AS day, user_id, event_type, payload,
           json_extract(payload, '$.courseId') AS course_id
    FROM learning_events
  ) e
  GROUP BY e.day, e.course_id, e.user_id
`);

/* 论坛回复计入聚合表（事件表只记阅读与标注，回复另算） */
db.exec(`
  UPDATE analytics_daily
  SET forum_replies = (
    SELECT COUNT(*) FROM forum_posts p
    JOIN forum_topics t ON t.id = p.topic_id
    WHERE p.author_id = analytics_daily.student_id
      AND t.course_id = analytics_daily.course_id
  )
`);

/* ── Skill 配置与开发日志 ───────────────────────────────── */

run(
  `INSERT INTO skill_configs (id, name, yaml, version, updated_at) VALUES (?, ?, ?, 1, ?)`,
  uid('skl'),
  'legal-english-note-editing',
  skillYaml,
  iso(6, 15),
);

for (const [index, d] of devLogs.entries()) {
  run(
    `INSERT INTO dev_logs (id, phase, goal, decisions, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    uid('log'),
    d.phase,
    d.goal,
    JSON.stringify(d.decisions),
    d.status,
    index,
  );
}

/* ── 报告 ───────────────────────────────────────────────── */

const counts = db
  .prepare(
    `SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM documents) AS docs,
      (SELECT COUNT(*) FROM translation_templates) AS templates,
      (SELECT COUNT(*) FROM vocabulary_entries) AS vocab,
      (SELECT COUNT(*) FROM wordbook_items) AS word_items,
      (SELECT COUNT(*) FROM learning_events) AS events,
      (SELECT COUNT(*) FROM analytics_daily) AS daily,
      (SELECT COUNT(*) FROM classes) AS classes,
      (SELECT COUNT(*) FROM class_members) AS members`,
  )
  .get() as Record<string, number>;

console.log('LexiNote 数据已重建 →', DB_PATH);
console.log(counts);
console.log(`翻译模板 ${counts.templates} 条；课件句子未命中模板 ${unmatched.length} 条：`);
for (const u of unmatched) console.log('  ·', u);
console.log('演示口令统一为 lexinote；账号即学号（教师为工号），如 20230101 / T202601');
console.log('班级码：LAW103 / LAW211 / LAW402；邀请链接：/join/demo-contract-2103');
