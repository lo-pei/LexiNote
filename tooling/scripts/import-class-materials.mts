/**
 * 班级材料导入。
 *
 * 把两个教学班（法律硕士·法学 / 非法学）文件夹里的讲义、判例译文、小组作业
 * 灌进各自的课程，作为 kind = 'COURSEWARE' 的课件出现在课程页。
 *
 * 运行：npx tsx tooling/scripts/import-class-materials.mts <manifest.json> [--dry] [--reset]
 *
 * 正文由 D:/tmp/class-import/convert.py 转成 Markdown（docx 走 python-docx，
 * PDF 走 PyMuPDF 的 text block），这里只负责 Markdown → Tiptap → 写库。
 *
 * 重复运行安全：--reset 先删掉本脚本此前导入的课件（凭 subtitle 前缀识别），
 * 不带 --reset 时遇到同名课件直接跳过，不会累积副本。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import type { TiptapDoc } from '@ln/types';
import { countWords, markdownToDoc, textOf } from '@ln/utils';
import { Db, DB_PATH } from '../../apps/web/src/server/db';

/** 导入的课件统一带这个前缀，既作列表里的来源说明，也作 --reset 的识别依据 */
const TAG = '班级材料';

/** 材料按课程专题分组，序号与「授课安排」里的 Topic 1–8 对齐 */
const SECTIONS: Record<number, string> = {
  0: '课程总纲',
  1: 'Topic 1 · 司法审查',
  2: 'Topic 2 · 宪法解释（Roe / Dobbs）',
  3: 'Topic 3 · 冲突法（Babcock / Neumeier）',
  4: 'Topic 4 · 不方便法院（Joyvio）',
  5: 'Topic 5 · 长臂管辖（Daimler / International Shoe）',
  9: '小组材料',
};

interface Entry {
  tag: string;
  title: string;
  source: string;
  origin: string;
  chars: number;
  pages: number | null;
  md: string;
  group: number;
  order: number;
}

interface Manifest {
  entries: Entry[];
  skipped: { tag: string; name: string; reason: string }[];
}

function subtitleOf(entry: Entry): string {
  const words = `${(entry.chars / 10000).toFixed(1)} 万字`;
  return entry.pages ? `PDF · ${entry.pages} 页 · ${words}` : `Word · ${words}`;
}

function main() {
  const args = process.argv.slice(2);
  const manifestPath = args.find((a) => !a.startsWith('--'));
  const dry = args.includes('--dry');
  const reset = args.includes('--reset');
  if (!manifestPath) {
    console.error('用法：npx tsx tooling/scripts/import-class-materials.mts <manifest.json> [--dry] [--reset]');
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const db = new Db(DB_PATH);

  // 教学班名里带「非法学」的那门课要单独认，否则会和法学班串库
  const courses = db.all<{ id: string; class_name: string; teacher_id: string }>(
    `SELECT c.id, cl.name AS class_name, c.teacher_id
     FROM courses c JOIN classes cl ON cl.id = c.class_id`,
  );
  const courseOf = (tag: string) => {
    const hit = courses.find((c) => (tag === '非法学' ? c.class_name.includes('非法学') : !c.class_name.includes('非法学')));
    if (!hit) throw new Error(`找不到「${tag}」对应的课程`);
    return hit;
  };

  console.log(`库文件：${DB_PATH}`);
  console.log(`清单：${manifest.entries.length} 份，跳过 ${manifest.skipped.length} 项${dry ? '（dry-run）' : ''}`);

  for (const tag of ['法学', '非法学']) {
    const course = courseOf(tag);
    const entries = manifest.entries.filter((e) => e.tag === tag).sort((a, b) => a.order - b.order);
    if (!entries.length) continue;

    console.log(`\n${tag} → ${course.class_name}（${course.id}）`);

    if (reset && !dry) {
      let removed = 0;
      for (const entry of entries) {
        const hit = db.run(
          `DELETE FROM documents WHERE course_id = ? AND kind = 'COURSEWARE' AND title = ?`,
          course.id,
          entry.title,
        );
        removed += Number(hit.changes ?? 0);
      }
      console.log(`  清掉上次导入：${removed} 份`);
    }

    for (const entry of entries) {
      const markdown = fs.readFileSync(entry.md, 'utf8');
      const doc: TiptapDoc = markdownToDoc(markdown);
      const words = countWords(textOf(doc));
      const exists = db.get<{ id: string }>(
        `SELECT id FROM documents WHERE course_id = ? AND kind = 'COURSEWARE' AND title = ? AND deleted_at IS NULL`,
        course.id,
        entry.title,
      );
      if (exists) {
        console.log(`  ${String(entry.order).padStart(2, '0')} 跳过（已存在） ${entry.title}`);
        continue;
      }
      if (!dry) {
        const id = `doc_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
        const iso = new Date().toISOString();
        db.run(
          `INSERT INTO documents
             (id, owner_id, course_id, parent_doc_id, title, subtitle, section_label, content, status, kind, sort_order, word_count, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'PUBLISHED', 'COURSEWARE', ?, ?, ?, ?)`,
          id,
          course.teacher_id,
          course.id,
          entry.title,
          subtitleOf(entry),
          SECTIONS[entry.group] ?? null,
          JSON.stringify(doc),
          entry.order,
          words,
          iso,
          iso,
        );
      }
      console.log(`  ${String(entry.order).padStart(2, '0')} ${words.toLocaleString('zh-CN').padStart(8, ' ')} 词  ${entry.title}`);
    }
  }

  console.log('\n跳过的文件：');
  for (const s of manifest.skipped) console.log(`  [${s.tag}] ${s.name} —— ${s.reason}`);
}

main();
