import Link from 'next/link';
import { requirePageUser } from '@/lib/session';
import { readings, READING_GROUPS } from '@/server/content/readings';
import { LAW_SOURCE_NOTE } from '@/server/content/legal-library';
import { listLawLibrary } from '@/server/modules/laws';
import { ReadingShelf } from '@/components/reading-shelf';
import { ReadingDots } from '@/components/reading-dots';
import { LawTreeMini } from '@/components/law-tree-mini';

export const dynamic = 'force-dynamic';
export const metadata = { title: '推荐阅读 · LexiNote' };

const LAW_DOT = { id: 'laws', label: '中国法英译' };

export default async function ReadingsPage() {
  await requirePageUser();
  const library = listLawLibrary();

  // 点状目录：五个书单分组 + 末尾的法律专题
  const dots = [...READING_GROUPS.map((group) => ({ id: `rg-${group.key}`, label: group.title })), LAW_DOT];

  // 页头整行去掉：书架自己带标题，上面的「推荐阅读 / 课程安排」是重复的
  return (
    <div className="wrap">
      <ReadingDots items={dots} />

      <ReadingShelf books={readings} groups={READING_GROUPS} variant="page" />

      <section className="section lawtile-wrap" id={LAW_DOT.id} aria-labelledby="laws-title">
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

        <LawTreeMini
          categories={library.categories}
          totalDocs={library.totalDocs}
          totalWords={library.totalWords}
        />

        <p className="ln-hint" style={{ marginTop: 14 }}>
          {LAW_SOURCE_NOTE.disclaimer}
        </p>
      </section>
    </div>
  );
}
