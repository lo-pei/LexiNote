import Link from 'next/link';
import { requirePageUser } from '@/lib/session';
import { readings } from '@/server/content/readings';
import { LAW_SOURCE_NOTE } from '@/server/content/legal-library';
import { listLawLibrary } from '@/server/modules/laws';
import { ReadingShelf } from '@/components/reading-shelf';

export const dynamic = 'force-dynamic';
export const metadata = { title: '推荐阅读 · LexiNote' };

export default async function ReadingsPage() {
  await requirePageUser();
  const library = listLawLibrary();

  // 页头整行去掉：书架自己带标题，上面的「推荐阅读 / 课程安排」是重复的
  return (
    <div className="wrap">
      <ReadingShelf books={readings} variant="page" />

      <section className="section lawtile-wrap" aria-labelledby="laws-title">
        <div className="section__head">
          <h2 className="section__title" id="laws-title">
            {LAW_SOURCE_NOTE.title}
          </h2>
          <Link className="section__hint" href="/readings/laws">
            查看全部 {library.totalDocs} 篇 →
          </Link>
        </div>

        <p className="lawtile__lead">
          书单之外的另一半：中国现行法律的英文官方译本，按部门法分 {library.categories.length} 类归档，
          正文进站可读，点术语即看释义。查条文、找译名、练长句，都在这一处。
        </p>

        <div className="lawtile__grid">
          {library.categories.map((cat) => (
            <Link className="lawtile" href={`/readings/laws#c-${cat.code}`} key={cat.code}>
              <span className="lawtile__code">{cat.code}</span>
              <span className="lawtile__zh">{cat.titleZh}</span>
              <span className="lawtile__en">{cat.title}</span>
              <span className="lawtile__meta">
                {cat.docCount} 篇 · {cat.wordCount.toLocaleString('zh-CN')} 词
              </span>
            </Link>
          ))}
        </div>

        <p className="ln-hint" style={{ marginTop: 14 }}>
          {LAW_SOURCE_NOTE.disclaimer}
        </p>
      </section>
    </div>
  );
}
