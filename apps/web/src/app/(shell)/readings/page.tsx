import { requirePageUser } from '@/lib/session';
import { readings } from '@/server/content/readings';
import { ReadingShelf } from '@/components/reading-shelf';

export const dynamic = 'force-dynamic';
export const metadata = { title: '推荐阅读 · LexiNote' };

export default async function ReadingsPage() {
  await requirePageUser();

  // 页头整行去掉：书架自己带标题，上面的「推荐阅读 / 课程安排」是重复的
  return (
    <div className="wrap">
      <ReadingShelf books={readings} variant="page" />
    </div>
  );
}
