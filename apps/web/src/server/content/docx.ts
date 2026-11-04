import JSZip from 'jszip';

/**
 * .docx → Markdown 子集。
 *
 * 教师的课件多半是 Word，直接拒收 .docx 等于让人先手动另存一遍。
 * .docx 本质是个 zip，正文在 word/document.xml 里，段落是 <w:p>，
 * 标题靠 w:pStyle[Heading1] 或 w:outlineLvl 标，列表靠 w:numPr 标。
 * 这里只还原「标题层级 + 段落 + 列表」这三件，样式表、批注、图片一概跳过——
 * 图片在无界面转换里没法可靠搬运，宁可不提，也不要塞一堆空占位图进正文。
 */
function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');
}

/** 取一个段落里的可见文字：<w:t> 拼接，<w:br/> 当空格，脚注引用丢弃 */
function textOfParagraph(chunk: string): string {
  const runs = chunk.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g) ?? [];
  const text = runs
    .map((run) => unescapeXml(run.replace(/^<w:t(?:\s[^>]*)?>/, '').replace(/<\/w:t>$/, '')))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function headingLevel(chunk: string): number | null {
  const style = /<w:pStyle\s+w:val="([^"]+)"/.exec(chunk)?.[1] ?? '';
  const named = /^heading\s*(\d)$/i.exec(style);
  if (named) return Number(named[1]);
  const outline = /<w:outlineLvl\s+w:val="(\d)"/.exec(chunk);
  if (outline) return Number(outline[1]) + 1;
  return null;
}

export async function docxToMarkdown(data: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('NOT_DOCX');
  const xml = await entry.async('string');

  // 以 <w:p 为界切段；每个 chunk 到下一个 <w:p 之前，末尾多余标签不影响取文字
  const chunks = xml.split(/<w:p(?:\s[^>]*)?>/).slice(1);
  const lines: string[] = [];

  for (const chunk of chunks) {
    const text = textOfParagraph(chunk);
    if (!text) {
      lines.push('');
      continue;
    }
    const level = headingLevel(chunk);
    if (level) {
      lines.push(`${'#'.repeat(Math.min(3, level))} ${text}`);
      continue;
    }
    if (/<w:numPr>/.test(chunk)) {
      lines.push(`- ${text}`);
      continue;
    }
    lines.push(text);
    lines.push('');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
