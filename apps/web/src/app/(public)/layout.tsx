import Link from 'next/link';

/**
 * 公开页外壳：隐私政策与使用说明不要求登录。
 * 未注册的人也要能在点「注册」之前先看清数据怎么处理。
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docpage">
      <header className="docpage__top">
        <Link href="/login" className="docpage__brand">
          <span className="docpage__mark" aria-hidden="true">
            L
          </span>
          <span>
            <span className="docpage__name">LexiNote</span>
            <span className="docpage__sub">法律英语精读</span>
          </span>
        </Link>
        <nav className="docpage__nav" aria-label="公开页面导航">
          <Link href="/privacy">隐私政策</Link>
          <Link href="/terms">使用说明</Link>
          <Link href="/login" className="docpage__back">
            返回登录
          </Link>
        </nav>
      </header>

      <main className="docpage__inner">{children}</main>

      <footer className="docpage__foot">
        <span>LexiNote · 课程自建部署，与学校统一身份认证、教务系统未打通。</span>
        <span className="docpage__foot-links">
          <Link href="/privacy">隐私政策</Link>
          <Link href="/terms">使用说明</Link>
        </span>
      </footer>
    </div>
  );
}
