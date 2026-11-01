import Link from 'next/link';

/** 登录 / 注册页共用的左侧画面：墨底、引文、学期信息 */
export function AuthArt({ footer = 'LAW 2103 · 2026 秋季学期' }: { footer?: string }) {
  return (
    <section className="gate__art">
      <Link href="/login" className="rail__brand" style={{ padding: 0 }}>
        <span className="rail__mark" aria-hidden="true">
          L
        </span>
        <span>
          <span className="rail__name" style={{ color: '#f2f2ec' }}>
            LexiNote
          </span>
          <span className="rail__sub" style={{ color: 'rgba(242,242,236,.55)' }}>
            法律英语精读
          </span>
        </span>
      </Link>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <p className="gate__quote">
          “一个词在法律文本里从不是它自己——它是它在判例中被反复解释过的那个意思。”
        </p>
        <p className="gate__cite">精读 · 标注 · 对照 · 重用</p>
      </div>

      <div style={{ position: 'relative', zIndex: 1, fontSize: 12, color: 'rgba(242,242,236,.5)' }}>
        {footer}
      </div>
    </section>
  );
}
