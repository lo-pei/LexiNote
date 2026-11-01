import ExcelJS from 'exceljs';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { WordbookExportDTO } from '@ln/types';
import { formatDate } from '@ln/utils';

/**
 * 生词本导出的三个渲染器（说明书 §5.8）。
 * 三者只消费同一份 WordbookExportDTO：字段增删只改 DTO，不改渲染器。
 * PDF 走「打印用 HTML」，由浏览器另存为 PDF——不引入需要本地二进制的渲染依赖。
 */

const COLUMNS = [
  { header: '术语', width: 26, key: 'term' },
  { header: '音标', width: 20, key: 'phonetic' },
  { header: '中文释义', width: 34, key: 'definitionZh' },
  { header: '英文释义', width: 34, key: 'definitionEn' },
  { header: '来源', width: 30, key: 'source' },
  { header: '原文语境', width: 52, key: 'context' },
  { header: '例句', width: 46, key: 'example' },
  { header: '掌握度', width: 10, key: 'mastery' },
  { header: '收录日期', width: 14, key: 'addedAt' },
] as const;

export async function renderXlsx(dto: WordbookExportDTO): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LexiNote';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('生词本', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  sheet.mergeCells('A1:I1');
  const title = sheet.getCell('A1');
  title.value = `${dto.wordbookName} · ${dto.ownerName}`;
  title.font = { name: 'Georgia', size: 16, bold: true, color: { argb: 'FF1A1B17' } };
  title.alignment = { vertical: 'middle' };

  sheet.mergeCells('A2:I2');
  const subtitle = sheet.getCell('A2');
  subtitle.value = `导出 ${formatDate(dto.generatedAt)} · 共 ${dto.meta.total} 条 · 已掌握 ${dto.meta.mastered} 条`;
  subtitle.font = { size: 10, color: { argb: 'FF6F7169' } };

  sheet.getRow(3).values = COLUMNS.map((c) => c.header);
  sheet.getRow(3).font = { bold: true, size: 10, color: { argb: 'FF54564E' } };
  sheet.getRow(3).border = { bottom: { style: 'thin', color: { argb: 'FFC9CAC1' } } };

  COLUMNS.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width;
  });

  for (const row of dto.rows) {
    const added = sheet.addRow(COLUMNS.map((c) => row[c.key]));
    added.font = { size: 10.5 };
    added.alignment = { vertical: 'top', wrapText: true };
    added.getCell(1).font = { size: 11, bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function renderDocx(dto: WordbookExportDTO): Promise<Buffer> {
  const cell = (text: string, options?: { bold?: boolean; muted?: boolean }) =>
    new TableCell({
      width: { size: 100 / 3, type: WidthType.PERCENTAGE },
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: text || '—',
              size: 18,
              bold: options?.bold,
              color: options?.muted ? '6F7169' : '1A1B17',
            }),
          ],
        }),
      ],
    });

  const rows = [
    new TableRow({
      tableHeader: true,
      children: ['术语', '释义', '来源'].map((header) => cell(header, { bold: true, muted: true })),
    }),
    ...dto.rows.map(
      (row) =>
        new TableRow({
          children: [cell(row.term, { bold: true }), cell(row.definitionZh), cell(row.source, { muted: true })],
        }),
    ),
  ];

  const document = new Document({
    creator: 'LexiNote',
    title: `${dto.wordbookName} 生词本`,
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 900, right: 900 } } },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: dto.wordbookName, bold: true, size: 34 })],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `${dto.ownerName} · 导出于 ${formatDate(dto.generatedAt)} · 共 ${dto.meta.total} 条，已掌握 ${dto.meta.mastered} 条`,
                size: 18,
                color: '6F7169',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'D8D9D1' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: 'C9CAC1' },
            },
            rows,
          }),
          new Paragraph({
            spacing: { before: 300 },
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: dto.meta.sources.length ? `来源：${dto.meta.sources.join('；')}` : '来源：手动添加',
                size: 16,
                color: '9A9C92',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}

export function renderPdfHtml(dto: WordbookExportDTO): string {
  const rows = dto.rows
    .map(
      (row) => `<tr>
        <td class="term">${escapeHtml(row.term)}<span class="phon">${escapeHtml(row.phonetic)}</span></td>
        <td>${escapeHtml(row.definitionZh)}</td>
        <td class="muted">${escapeHtml(row.source)}</td>
        <td class="muted small">${escapeHtml(row.mastery)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(dto.wordbookName)} · 生词本</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Songti SC", "SimSun", Georgia, serif; color: #1a1b17; }
  h1 { font-size: 22pt; font-weight: 500; letter-spacing: -0.02em; margin: 0 0 4px; }
  .meta { font-size: 9pt; color: #6f7169; margin: 0 0 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th { text-align: left; font-size: 8pt; letter-spacing: .08em; color: #6f7169; text-transform: uppercase;
       border-bottom: 1px solid #c9cac1; padding: 0 8px 6px; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
  td { padding: 7px 8px; border-bottom: 1px solid #d8d9d1; vertical-align: top; line-height: 1.55; }
  .term { font-weight: 600; white-space: nowrap; }
  .phon { display: block; font-weight: 400; font-size: 8pt; color: #9a9c92; font-family: Georgia, serif; }
  .muted { color: #54564e; }
  .small { font-size: 9pt; white-space: nowrap; }
  footer { margin-top: 18px; font-size: 8pt; color: #9a9c92; }
  @media print { .hint { display: none; } }
  .hint { position: fixed; right: 16px; bottom: 14px; font-size: 9pt; color: #54564e;
          background: #f4f4ef; padding: 8px 12px; border-radius: 3px; }
</style>
</head>
<body>
<h1>${escapeHtml(dto.wordbookName)}</h1>
<p class="meta">${escapeHtml(dto.ownerName)} · 导出于 ${escapeHtml(formatDate(dto.generatedAt))} · 共 ${dto.meta.total} 条，已掌握 ${dto.meta.mastered} 条</p>
<table>
  <thead><tr><th>术语</th><th>释义</th><th>来源</th><th>掌握度</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<footer>${escapeHtml(dto.meta.sources.join('；') || '手动添加')}</footer>
<div class="hint">在打印对话框中选「另存为 PDF」</div>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
