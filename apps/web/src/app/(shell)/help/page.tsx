import Link from 'next/link';
import type { ReactNode } from 'react';
import { requirePageUser } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: '使用说明 · LexiNote' };

function Step({ no, title, children }: { no: string; title: ReactNode; children: ReactNode }) {
  return (
    <div className="help-step">
      <span className="help-step__no">{no}</span>
      <div>
        <div className="help-step__title">{title}</div>
        <div className="help-step__body">{children}</div>
      </div>
    </div>
  );
}

/** 界面上能直接看到的按钮名、字段名或命令，标出来方便对照屏幕 */
function Ui({ children }: { children: ReactNode }) {
  return <span className="help-ui">{children}</span>;
}

export default async function HelpPage() {
  const user = await requirePageUser();
  const canSeeAdmin = user.role !== 'STUDENT';

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">使用说明</h1>
          <p className="head__sub">
            前四节讲学生怎么用，从「带一门课」起是教师的部分。多数会卡住人的地方，最后那张表里都写了。
          </p>
        </div>
        <div className="head__actions">
          <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/">
            回到课程
          </Link>
        </div>
      </header>

      <div className="notice notice--accent" style={{ marginTop: 18 }}>
        <span style={{ maxWidth: '76ch' }}>
          账号就是学号，没有邮箱验证。请单独设一个只在这里用的密码——本站独立部署，数据库与运维都不在校内，与学校密码复用会让任何一侧的泄露连带危及成绩与个人信息。
        </span>
      </div>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">学生 · 上手四步</h2>
          <span className="section__hint">从注册到第一次读完一讲</span>
        </div>

        <Step no="01" title="注册：学号即账号">
          <p>
            学号填 4–20 位字母或数字；姓名与教务系统保持一致，方便教师核对名单。教师注册时填工号。
          </p>
          <p>
            密码至少 8 位，需含字母、数字、符号中的两类，不能与学号相同。注册页有一段醒目的提示，要你确认这里的密码与学校密码不同——那不是在走流程。
          </p>
          <p>
            有班级码就填在 <Ui>班级码（可留空）</Ui> 里；没有也能注册，登录后再加入。
          </p>
        </Step>

        <Step no="02" title="加入班级">
          <p>三条路都能进同一个班，任选一条：</p>
          <ul className="help-list">
            <li>注册时填班级码；</li>
            <li>登录后在 <Ui>班级</Ui> 页输入老师给的 6 位班级码；</li>
            <li>直接打开老师或同学发来的邀请链接。</li>
          </ul>
          <p>
            入班即自动选修该班已开设的课程，不用再单独选课。这类课程在首页的按钮是 <Ui>用班级码加入</Ui> 而不是 <Ui>选修此课</Ui>——名单由班级决定，不开放单独选修。
          </p>
        </Step>

        <Step no="03" title="找到课件">
          <p>
            首页 <Ui>我的课程</Ui> → 课程 → <Ui>课件</Ui> 列表 → <Ui>阅读</Ui>。
            <Ui>我的文档</Ui> 里汇总了你经手的所有文档：可读的课件、自己写的笔记、从课件复制出来的副本。
          </p>
        </Step>

        <Step no="04" title="边读边记">
          <ul className="help-list">
            <li>正文里带虚线的词是术语，点开有注音与释义，卡里可以直接收进生词本。</li>
            <li>右上 <Ui>对照译文</Ui> 打开后再点某个段落，会按句给出译文；没有预置译文的句子标为「暂无对照」，不会临时编一句。</li>
            <li>右侧目录按标题跳转；<Ui>必读</Ui> / <Ui>选读</Ui> 由任课教师设置，在侧栏可见。</li>
            <li>编辑态下停止输入约 1.2 秒自动保存，标题旁会显示「已保存」或「有未保存的修改」。</li>
          </ul>
        </Step>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">阅读工作台 · 三种状态</h2>
          <span className="section__hint">同一份文档，按身份与场合切换</span>
        </div>

        <div className="grid grid--3">
          <div className="card">
            <div className="help-card__head">
              <span className="help-card__title">阅读</span>
              <span className="help-card__sub">全文用衬线排</span>
            </div>
            <ul className="help-list">
              <li>点术语看释义，可加入生词本，来源与原文语境一起记下。</li>
              <li>开「对照译文」后点段落，逐句对照。</li>
              <li>右侧目录与阅读分级，长文也不容易读丢。</li>
            </ul>
          </div>

          <div className="card">
            <div className="help-card__head">
              <span className="help-card__title">编辑</span>
              <span className="help-card__sub">仅作者与任课教师</span>
            </div>
            <ul className="help-list">
              <li>工具条管加粗、斜体、列表、引文与「要点」块。</li>
              <li>选中词语后按 <Ui>术语</Ui> 加注音与释义，正文里会变成可点的虚线词。</li>
              <li>课件写完后按 <Ui>发布</Ui>；草稿状态对学生不可见。</li>
            </ul>
          </div>

          <div className="card">
            <div className="help-card__head">
              <span className="help-card__title">演示</span>
              <span className="help-card__sub">整屏投屏 · 一屏一段</span>
            </div>
            <ul className="help-list">
              <li>顶部 <Ui>演示</Ui> 进入整屏演示：按真实版面高度切屏，一屏之内不会截半句话。</li>
              <li>
                滚轮往下拨一格就翻一屏，<span className="kbd">↓</span> <span className="kbd">PgDn</span> 同理；
                <span className="kbd">↑</span> 回上一屏。
              </li>
              <li>
                <span className="kbd">F</span> 切浏览器全屏（投屏前按一下），<span className="kbd">Esc</span> 退出全屏，再按一次离开演示。
              </li>
              <li>底部进度条可跳到任意一屏；地址栏加 <code>?p=3</code> 可直接从第三屏开始。</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">生词本与讨论区</h2>
          <span className="section__hint">把读到的东西留下来</span>
        </div>

        <div className="grid grid--2">
          <div className="card">
            <div className="help-card__head">
              <span className="help-card__title">生词本</span>
              <span className="help-card__sub">四档掌握度</span>
            </div>
            <ul className="help-list">
              <li>掌握度分四档：生词 → 眼熟 → 能译 → 会用。教师端学情只统计达到「能译」及以上的词条。</li>
              <li>每条词都带来源（课件、笔记、手动添加、课堂讨论）与收录日期，回头能找回原句。</li>
              <li>
                右上可导出 <Ui>Excel</Ui>、<Ui>Word</Ui>，或 <Ui>打印 / PDF</Ui> 走浏览器打印。
              </li>
              <li>
                每个账号默认两个词表：空的<strong>自定义单词本</strong>放随堂标注，<strong>法律英语单词本</strong>是内置词库
                （张法连《法律英语术语表》，两千余条，可按字母浏览或搜索）。
              </li>
            </ul>
          </div>

          <div className="card">
            <div className="help-card__head">
              <span className="help-card__title">讨论区</span>
              <span className="help-card__sub">提问与作业分开</span>
            </div>
            <ul className="help-list">
              <li>发帖时选类型：<Ui>课堂提问</Ui> 或 <Ui>作业</Ui>；作业可带截止时间。</li>
              <li>教师的批注贴着你的原文出现，评分与「参考答案」标记也在同一条回复上。</li>
              <li>回复会同时计入你的学情记录——讨论不是附加项。</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">教师 · 带一门课</h2>
          <span className="section__hint">建班 → 发码 → 建课 → 发课件 → 批注与学情</span>
        </div>

        <Step no="05" title="创设班级">
          <p>
            在 <Ui>班级</Ui> 页右上点 <Ui>创设班级</Ui>，系统同时生成一个 6 位班级码（字符集去掉了 0/O/1/I，避免看错）。
            班级码可随时重置，旧码立刻失效；也可以关闭自助加入，改成只认邀请链接。
          </p>
        </Step>

        <Step no="06" title="把班级码或邀请发出去">
          <p>
            班级详情页有 <Ui>班级码</Ui> 与 <Ui>邀请链接</Ui> 两个面板。邀请可以设使用次数与有效期；教师生成的不限次数。
            班内同学也能生成邀请，默认 3 人、7 天，够用来把同桌拉进来。
          </p>
          <p>成员名单里能看学号、姓名、加入时间与加入方式，需要时可以把人移出班级。</p>
        </Step>

        <Step no="07" title="建课并挂到班级">
          <p>
            新建课程时在 <Ui>归属班级</Ui> 里选一个班。挂班之后，班内学生自动选修；此后才入班的学生同样会自动补选。
            不挂班的课程视为公开选修，任何学生都能选。
          </p>
        </Step>

        <Step no="08" title="写课件、标术语、发布">
          <p>
            课程详情页 <Ui>新建课件</Ui> → 在编辑态写正文。工具条里的 <Ui>要点</Ui> 是一个重点论述块，适合放判例摘录；
            <Ui>术语</Ui> 给选中的词加注音与释义，学生阅读时能点开。
          </p>
          <p>
            写完点 <Ui>发布</Ui>。发布前只有你自己看得到；发布后选修学生可读，也能把课件 <Ui>纳入我的笔记库</Ui> 生成自己的副本继续批注。
          </p>
        </Step>

        <Step no="09" title="批注、评分与学情">
          <p>
            讨论区里可以给任何一条回复 <Ui>写批注</Ui>，也可以评分、标记为参考答案。批注和评分都会留在原帖下面，学生回头能对上自己写的那一段。
          </p>
          <p>
            <Ui>学情</Ui> 页按课程看：选课人数、课件数、译文命中率、未掌握词数，以及学生明细（笔记保存、术语点击、收录词、讨论回复、最近活跃）与术语热度排行。
            译文命中率反映的是课件句子与译文库的覆盖程度，不是学生水平。
          </p>
        </Step>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">常见问题</h2>
          <span className="section__hint">几条容易被卡住的地方</span>
        </div>

        <div className="help-table-wrap">
          <table className="ln-table help-faq">
            <thead>
              <tr>
                <th>问题</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>忘了密码，或者想改密码</td>
                <td>
                  当前版本没有自助找回或改密入口——不做没有邮件验证兜底的「找回」，免得反而成为漏洞。
                  请联系维护者在数据库层面重置。演示环境也可以直接 <Ui>npm run db:seed</Ui> 重建，但那会清空全部数据。
                </td>
              </tr>
              <tr>
                <td>课程页没有「选修」按钮</td>
                <td>这门课挂在班级下，名单由班级决定。回「班级」页输入班级码，或打开邀请链接，入班后自动选修。</td>
              </tr>
              <tr>
                <td>译文显示「暂无对照」</td>
                <td>
                  译文按句子哈希匹配预置句库，只有库里的句子才有对照。改动过的句子、自己写的笔记不会命中。
                  未命中就如实标注，不做机器翻译。
                </td>
              </tr>
              <tr>
                <td>教师改了课件，我的笔记会跟着变吗</td>
                <td>
                  不会。<Ui>纳入我的笔记库</Ui> 生成的是独立副本（标题带「（我的笔记）」），原课件的后续修改不会覆盖它。
                  同一份课件只保留一份副本，再次点击会直接打开已有的那份。
                </td>
              </tr>
              <tr>
                <td>数据存在哪里，怎么备份</td>
                <td>
                  单文件 <Ui>data/lexinote.db</Ui>（WAL 模式，同目录还有 -wal / -shm 两个附属文件）。
                  备份时三个一起拷；重建执行 <Ui>npm run db:seed</Ui>。
                </td>
              </tr>
              <tr>
                <td>打不开页面，或者端口被占</td>
                <td>
                  双击项目根目录的 <Ui>打开平台.cmd</Ui>。它会先看 3100 端口有没有服务，没有才启动，然后打开入口页。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {canSeeAdmin ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">维护者</h2>
            <span className="section__hint">仅教师与管理员可见</span>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: 'var(--ink-2)' }}>
              开发日志记录了每个阶段的取舍与代价，<Ui>Skill 配置</Ui> 是标注与编辑建议的规则源（YAML，保存即升版）。
              这两样是给维护者的，不影响日常使用。
            </p>
            <div style={{ marginTop: 14 }}>
              <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/admin">
                打开开发日志与 Skill 配置
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <p className="ln-hint" style={{ marginTop: 30 }}>
        还有没写清楚的地方，直接在讨论区提——说明本身就是可以改的。数据怎么处理、谁能看到，见
        <Link href="/privacy">隐私政策</Link>。
      </p>
    </div>
  );
}
