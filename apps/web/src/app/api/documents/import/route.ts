import { z } from 'zod';
import { markdownToDoc, textOf } from '@ln/utils';
import { badRequest, guard, parseBody, requireUser } from '@/server/http';
import { createDocument } from '@/server/modules/documents';
import { docxToMarkdown } from '@/server/content/docx';

export const dynamic = 'force-dynamic';

/** 单份课件正文上限：够放一整讲，又不至于把请求体撑爆 */
const MAX_TEXT = 400_000;
/** .docx 走 base64，按字节留出余量（约 6MB 原文件） */
const MAX_BASE64 = 8_000_000;

const schema = z.object({
  /** 原文件名，用于判断格式并从「第三讲 对价.docx」取默认标题 */
  filename: z.string().trim().max(200).optional(),
  title: z.string().trim().max(120).optional(),
  /** .md / .txt：前端用 FileReader 读成文本后提交 */
  text: z.string().max(MAX_TEXT, '文件过大，请拆分后再上传。').optional(),
  /** .docx：前端读成 base64（去掉 data: 前缀）后提交 */
  file: z.string().max(MAX_BASE64, '文件过大，请拆分后再上传。').optional(),
  courseId: z.string().trim().min(1).nullable().optional(),
});

/** 去掉扩展名与常见讲次前缀，剩下的当作标题 */
function titleFrom(filename: string | undefined): string {
  if (!filename) return '';
  const base = filename.replace(/^.*[\\/]/, '').replace(/\.(md|markdown|txt|docx)$/i, '');
  return base.replace(/[_-]+/g, ' ').trim();
}

export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    if (user.role !== 'TEACHER') throw badRequest('只有教师可以上传课件。');

    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);

    const isDocx = /\.docx$/i.test(parsed.filename ?? '');
    let markdown = parsed.text ?? '';

    if (isDocx) {
      if (!parsed.file) throw badRequest('没有收到文件内容。');
      try {
        const buffer = Buffer.from(parsed.file, 'base64');
        const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
        markdown = await docxToMarkdown(data);
      } catch {
        throw badRequest('这个 .docx 读不出正文。请用 Word 另存为 .docx 后重试，或直接上传 .md / .txt。');
      }
    }

    if (!markdown.trim()) throw badRequest('文件里没有可读的文字。');
    if (markdown.length > MAX_TEXT) throw badRequest('文件过长，请拆分后再上传。');

    const doc = markdownToDoc(markdown);

    // 正文首行若是标题，就拿它当文档标题并从正文里去掉：
    // Word 课件的第一段多半就是「第四讲 侵权责任」，留着会和页面标题重复一遍
    const first = doc.content[0];
    const leadHeading = first && first.type === 'heading' ? textOf(first).replace(/\s+/g, ' ').trim() : '';
    const fromName = titleFrom(parsed.filename);
    const typed = parsed.title?.trim() ?? '';
    const title = typed && typed !== fromName ? typed : leadHeading || typed || fromName || '未命名课件';
    if (leadHeading && title === leadHeading) doc.content.shift();
    while (doc.content.length && doc.content[0]?.type === 'paragraph' && !textOf(doc.content[0]).trim()) {
      doc.content.shift();
    }

    const created = createDocument({ title, kind: 'COURSEWARE', courseId: parsed.courseId ?? null, content: doc }, user);

    return { id: created.id, title, words: markdown.length };
  });
}
