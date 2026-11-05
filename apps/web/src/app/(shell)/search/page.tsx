import Link from 'next/link';
import type { ReactNode } from 'react';
import type { DocKind } from '@ln/types';
import { requirePageUser } from '@/lib/session';
import { indexHealth, searchDocuments } from '@/server/modules/search';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  COURSEWARE: '课件',
  NOTE: '笔记',
  TEXTBOOK: '教材',
  LAW: '英文法律',
  DOCUMENT: '文档',
};

const TABS: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'COURSEWARE', label: '课件' },
  { key: 'TEXTBOOK', label: '教材' },
  { key: 'LAW', label: '英文法律' },
  { key: 'NOTE', label: '笔记' },
];

/** 把服务端给的 \u0001…\u0002 切成 <mark>：不渲染任何原始 HTML */
function Snippet({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;

  while (rest.length) {
    const open = rest.indexOf('\u0001');
    if (open < 0) {
      nodes.push(rest);
      break;
    }
    const close = rest.indexOf('\u0002', open + 1);
    if (open > 0) nodes.push(rest.slice(0, open));
    if (close < 0) {
      nodes.push(rest.slice(open + 1));
      break;
    }
    nodes.push(<mark key={key}>{rest.slice(open + 1, close)}</mark>);
    key += 1;
    rest = rest.slice(close + 1);
  }

  return <>{nodes}</>;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; kind?: string };
}) {
  const user = await requirePageUser();
  const q = (searchParams.q ?? '').slice(0, 200).trim();
  const rawKind = searchParams.kind ?? '';
  const kind = TABS.some((tab) => tab.key === rawKind) && rawKind ? (rawKind as DocKind) : undefined;

  const result = q ? searchDocuments(q, user, { kind }) : null;
  const health = indexHealth();

  const href = (key: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (key) params.set('kind', key);
    const query = params.toString();
    return query ? `/search?${query}` : '/search';
  };

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">搜索</h1>
        </div>
        <div className="head__actions">
          <span className="head__sub">
            已索引 {health.indexed} 份 / 共 {health.documents} 份
          </span>
        </div>
      </header>

      <form className="search-form" action="/search" method="get" role="search">
        <input
          className="search-form__input"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="检索课件、教材与英文法律正文，例如 consideration、对价、force majeure"
          autoFocus
          maxLength={200}
          aria-label="搜索关键词"
        />
        {kind ? <input type="hidden" name="kind" value={kind} /> : null}
        <button className="ln-btn ln-btn--primary" type="submit">
          搜索
        </button>
      </form>

      {result && result.hits.length ? (
        <div className="search-tabs" role="tablist" aria-label="按类型筛选">
          {TABS.map((tab) => {
            const active = (tab.key || '') === (kind ?? '');
            return (
              <Link
                key={tab.key || 'all'}
                className={`search-tab${active ? ' search-tab--on' : ''}`}
                href={href(tab.key)}
                role="tab"
                aria-selected={active}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      {result && result.hits.length ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">
              {result.hits.length} 份文档命中
              {result.truncated ? '（仅显示前若干条）' : ''}
            </h2>
            <span className="section__hint meta-set">
              <span>{result.mode === 'fts' ? '索引检索' : '短词模糊匹配'}</span>
              <span>{result.tookMs}ms</span>
              <span>关键词 {result.terms.join('、')}</span>
            </span>
          </div>

          <div className="rows">
            {result.hits.map((hit) => (
              <div className="row" key={hit.docId}>
                <div className="row__main">
                  <div className="row__title">
                    <Link href={`/docs/${hit.docId}`}>{hit.title}</Link>
                    <span className="ln-badge">{KIND_LABEL[hit.kind] ?? hit.kind}</span>
                  </div>
                  {hit.courseTitle ? <div className="row__meta">{hit.courseTitle}</div> : null}
                  <p className="search-hit">
                    <Snippet text={hit.snippet} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {result && !result.hits.length ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">没有匹配的文档</h2>
          </div>
          <p className="ln-hint search-hint">
            「{q}」在你有权阅读的 {health.indexed} 份文档里没有命中。
            请检查拼写，或换一个更短的关键词。英文可以直接输入词根，例如{' '}
            <code>consid</code> 能匹配 consideration、considered。
          </p>
        </section>
      ) : null}

      {!q ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">检索范围</h2>
            <span className="section__hint">
              {health.documents} 份文档 · 约 140 万词
            </span>
          </div>
          <p className="ln-hint search-hint">
            可检索课件、教材、英文法律与你自己的笔记、翻译稿。结果只包含你有权阅读的文档：
            别人的未发布课件与未选课程的内容不会出现在结果里。
          </p>
        </section>
      ) : null}
    </div>
  );
}
