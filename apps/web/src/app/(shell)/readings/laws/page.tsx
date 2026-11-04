import Link from 'next/link';
import { requirePageUser } from '@/lib/session';
import { listLawLibrary } from '@/server/modules/laws';
import { LAW_CATEGORIES, LAW_SOURCE_NOTE } from '@/server/content/legal-library';
import { LawTree } from '@/components/law-tree';

export const dynamic = 'force-dynamic';
export const metadata = { title: '英文法律专题 · LexiNote' };

export default async function LawLibraryPage() {
  await requirePageUser();
  const library = listLawLibrary();

  return (
    <div className="wrap">
      <div style={{ marginBottom: 18 }}>
        <Link className="section__hint" href="/readings">
          ← 返回推荐阅读
        </Link>
      </div>

      <header className="head">
        <div>
          <span className="course__term">{LAW_SOURCE_NOTE.subtitle} · 全国人大官网译本</span>
          <h1 className="head__title" style={{ marginTop: 6 }}>
            {LAW_SOURCE_NOTE.title}
          </h1>
          <p className="head__sub">
            按部门法归类的中国现行法律英文官方译本，共 {library.totalDocs} 篇。原文与译文逐条对照着读，
            比单看译本更容易记住术语在条文里的位置。
          </p>
        </div>
      </header>

      <div className="grid grid--4" style={{ marginBottom: 24 }}>
        <div className="stat">
          <div className="stat__label">部门法</div>
          <div className="stat__value">{LAW_CATEGORIES.length}</div>
          <div className="stat__hint">按全国人大分类</div>
        </div>
        <div className="stat">
          <div className="stat__label">法律篇目</div>
          <div className="stat__value">{library.totalDocs}</div>
          <div className="stat__hint">现行法与修法决定</div>
        </div>
        <div className="stat">
          <div className="stat__label">正文词量</div>
          <div className="stat__value">{library.totalWords.toLocaleString('zh-CN')}</div>
          <div className="stat__hint">可全文检索与标注</div>
        </div>
        <div className="stat">
          <div className="stat__label">归档</div>
          <div className="stat__value" style={{ fontSize: 20 }}>
            {LAW_SOURCE_NOTE.archivedOn}
          </div>
          <div className="stat__hint">{LAW_SOURCE_NOTE.origin}</div>
        </div>
      </div>

      <div className="notice notice--accent" style={{ marginBottom: 22 }}>
        <span>{LAW_SOURCE_NOTE.disclaimer}</span>
      </div>

      <LawTree library={library} />

      <p className="ln-hint" style={{ marginTop: 26 }}>
        正文为只读：可以在阅读页点术语看释义、标生词、做批注，条文本身不提供编辑。
        篇目按官网标注的发布或最近修订日期排序。
      </p>
    </div>
  );
}
