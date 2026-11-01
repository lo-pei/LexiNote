/**
 * 把《法律英语术语表_张法连.xlsx》抽成项目内可直接 import 的 JSON。
 * 运行：node tooling/scripts/extract-glossary.mjs "<xlsx 路径>"
 *
 * 只做清洗，不做改写：词条文本保持原样，仅去掉首尾空白、
 * 合并单元格留下的纯数字行、以及空词条的残行。
 */
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';

const SRC = process.argv[2];
if (!SRC) {
  console.error('用法：node tooling/scripts/extract-glossary.mjs <xlsx 路径>');
  process.exit(1);
}

const OUT = path.join(process.cwd(), 'data', 'glossary.zhang-falian.json');

/** 单元格取纯文本：富文本 / 公式结果 / 共享字符串都收敛成 string */
function cellText(cell) {
  const value = cell?.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text ?? '').join('');
    if (value.result !== undefined) return String(value.result);
    if (value.error) return '';
  }
  return String(value);
}

const squish = (s) => s.replace(/[\s\u3000]+/g, ' ').trim();

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(SRC);
const sheet = wb.worksheets[0];
if (!sheet) throw new Error('工作簿里没有工作表');

const rows = [];
let skipped = 0;

sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
  if (rowNumber === 1) return; // 表头：单词 / 音标 / 汉语翻译 / 英文释义
  const term = squish(cellText(row.getCell(1)));
  const phonetic = squish(cellText(row.getCell(2)));
  const zh = squish(cellText(row.getCell(3)));
  const en = squish(cellText(row.getCell(4)));

  // 合并单元格与分栏编号会留下 "2"、"3." 这类只有序号的残行
  if (!term || !zh) {
    skipped += 1;
    return;
  }
  if (/^[\d.．、()（）]+$/.test(term)) {
    skipped += 1;
    return;
  }
  // OCR 残行：以非字母开头、夹带乱码符号、或词条里混进了汉字（原文识别错位）
  if (term.length < 2 || !/^[\p{L}][\p{L}\p{M}\s'\-.()&/,;:]*$/u.test(term) || /[\u4e00-\u9fff]/.test(term)) {
    skipped += 1;
    return;
  }
  if (term.length > 120 || zh.length > 600) {
    skipped += 1;
    return;
  }

  rows.push({
    term,
    phonetic: phonetic || null,
    definitionZh: zh,
    definitionEn: en || null,
  });
});

// 同一 term + 释义 只留一条（原表有少量完全重复行）
const seen = new Set();
const unique = [];
for (const row of rows) {
  const key = `${row.term}||${row.definitionZh}`;
  if (seen.has(key)) {
    skipped += 1;
    continue;
  }
  seen.add(key);
  unique.push(row);
}

unique.sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(unique, null, 0)}\n`, 'utf8');

console.log(
  `[glossary] 抽取 ${unique.length} 条（跳过 ${skipped} 行）→ ${path.relative(process.cwd(), OUT)} · ${(
    fs.statSync(OUT).size / 1024
  ).toFixed(0)} KB`,
);
