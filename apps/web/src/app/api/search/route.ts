import type { DocKind } from '@ln/types';
import { guard, requireUser } from '@/server/http';
import { searchDocuments } from '@/server/modules/search';

export const dynamic = 'force-dynamic';

/** documents.kind 的实际取值；不合法的 kind 按不筛选处理，不报错 */
const KINDS = new Set<string>(['COURSEWARE', 'NOTE', 'TEXTBOOK', 'LAW', 'DOCUMENT']);

/**
 * 全文检索（GET 而非 POST：结果可分享、可回退）。
 * 权限在 searchDocuments 内部按可见范围过滤，这里不做二次判断。
 */
export async function GET(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').slice(0, 200);
    const kindParam = url.searchParams.get('kind');
    const kind = kindParam && KINDS.has(kindParam) ? (kindParam as DocKind) : undefined;
    return searchDocuments(q, user, { kind });
  });
}
