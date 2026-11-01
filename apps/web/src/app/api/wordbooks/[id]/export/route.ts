import { NextResponse } from 'next/server';
import { fail, HttpError, requireUser } from '@/server/http';
import { buildExportDTO } from '@/server/modules/vocabulary';
import { renderDocx, renderPdfHtml, renderXlsx } from '@/server/modules/exports';

export const dynamic = 'force-dynamic';

const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'text/html; charset=utf-8',
} as const;

type Format = keyof typeof MIME;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const raw = new URL(request.url).searchParams.get('format') ?? 'xlsx';
    const format: Format = raw === 'docx' || raw === 'pdf' ? raw : 'xlsx';

    const dto = buildExportDTO(params.id, user);
    const base = `${dto.wordbookName}-生词本`;

    if (format === 'pdf') {
      return new NextResponse(renderPdfHtml(dto), {
        headers: { 'content-type': MIME.pdf, 'cache-control': 'no-store' },
      });
    }

    const body = format === 'xlsx' ? await renderXlsx(dto) : await renderDocx(dto);

    return new NextResponse(new Uint8Array(body), {
      headers: {
        'content-type': MIME[format],
        'content-disposition': `attachment; filename="wordbook.${format}"; filename*=UTF-8''${encodeURIComponent(`${base}.${format}`)}`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof HttpError) return fail(error);
    console.error('[export] failed', error);
    return fail(new HttpError(500, 'EXPORT_FAILED', '导出未完成，请稍后重试。'));
  }
}
