import Link from 'next/link';
import type { ReactNode } from 'react';
import { requirePageUser } from '@/lib/session';
import { HelpSide } from '@/components/help-nav';

export const dynamic = 'force-dynamic';
export const metadata = { title: '使用说明 · LexiNote' };

/** 界面上能直接看到的按钮名、字段名或命令，标出来方便对照屏幕 */
function Ui({ children }: { children: ReactNode }) {
  return <span className="help-ui">{children}</span>;
}

type Topic = { no: string; title: string; body: ReactNode };

function Chapter({
  id,
  no,
  title,
  count,
  children,
}: {
  id: string;
  no: string;
  title: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <section className="section section--chapter" id={id}>
      <div className="section__head">
        <h2 className="section__title">
          <span className="section__no">{no}、</span>
          {title}
        </h2>
        <span className="section__hint">{count}</span>
      </div>
      <div className="help-topics">{children}</div>
    </section>
  );
}

function Item({ no, title, children }: { no: string; title: string; children: ReactNode }) {
  return (
    <div className="help-topic">
      <span className="help-topic__no">{no}</span>
      <div className="help-topic__main">
        <h3 className="help-topic__title">{title}</h3>
        <div className="help-topic__body">{children}</div>
      </div>
    </div>
  );
}

export default async function HelpPage() {
  const user = await requirePageUser();
  const canSeeAdmin = user.role !== 'STUDENT';

  const chapters = [
    { id: 'ch-student', title: '一、学生上手' },
    { id: 'ch-reading', title: '二、阅读工作台' },
    { id: 'ch-words', title: '三、生词本与讨论区' },
    { id: 'ch-teaching', title: '四、教师授课' },
    { id: 'ch-faq', title: '五、常见问题' },
    ...(canSeeAdmin ? [{ id: 'ch-admin', title: '六、维护者' }] : []),
  ];

  return (
    <div className="wrap wrap--doc">
      <div className="doc-layout">
        <HelpSide active="guide" items={chapters} />
        <div className="doc-main">
          <header className="head">
            <div>
              <h1 className="head__title">使用说明</h1>
            </div>
          </header>

          <div className="notice notice--accent" style={{ marginBottom: 34 }}>
        <span style={{ maxWidth: '76ch' }}>
          账号就是学号，没有邮箱验证。请单独设一个只在这里用的密码。本站独立部署，数据库与运维都不在校内，与学校密码复用会让任何一侧的泄露连带危及成绩与个人信息。
        </span>
      </div>

      <Chapter id="ch-student" no="一" title="学生上手" count="1.1 到 1.6">
        <Item no="1.1" title="注册：学号即账号">
          <p>学号填 4 到 20 位字母或数字；姓名与教务系统保持一致，方便教师核对名单。教师注册时填工号。</p>
          <p>
            密码至少 8 位，需含字母、数字、符号中的两类，不能与学号相同。注册页有一段醒目的提示，要你确认这里的密码与学校密码不同。这一步不是走流程。
          </p>
          <p>
            有班级码就填在 <Ui>班级码（可留空）</Ui> 里；没有也能注册，登录后再加入。
          </p>
        </Item>

        <Item no="1.2" title="加入班级">
          <p>三条路都能进同一个班，任选一条：</p>
          <ul className="help-list">
            <li>注册时填班级码；</li>
            <li>
              登录后在 <Ui>课程</Ui> 首页输入老师给的 6 位班级码；
            </li>
            <li>直接打开老师或同学发来的邀请链接。</li>
          </ul>
          <p>
            入班即自动选修该班已开设的课程，不用再单独选课。这类课程在首页的按钮是 <Ui>用班级码加入</Ui> 而不是 <Ui>选修此课</Ui>。名单由班级决定，不开放单独选修。
          </p>
        </Item>

        <Item no="1.3" title="找到课件">
          <p>
            首页 <Ui>我的课程</Ui> → 课程 → <Ui>课件</Ui> 列表 → <Ui>阅读</Ui>。<Ui>我的文档</Ui>{' '}
            里汇总了你经手的所有文档：可读的课件、自己写的笔记、从课件复制出来的副本。
          </p>
        </Item>

        <Item no="1.4" title="边读边记">
          <ul className="help-list">
            <li>正文里带虚线的词是术语，点开有注音与释义，卡里可以直接收进生词本。</li>
            <li>
              右上 <Ui>对照译文</Ui> 打开后再点某个段落，会按句给出译文；没有预置译文的句子标为「暂无对照」，不会临时编一句。
            </li>
            <li>
              右侧目录按标题跳转；<Ui>必读</Ui> / <Ui>选读</Ui> 由任课教师设置，在侧栏可见。
            </li>
            <li>编辑态下停止输入约 1.2 秒自动保存，标题旁会显示「已保存」或「有未保存的修改」。</li>
          </ul>
        </Item>

        <Item no="1.5" title="外观：日间 / 夜间 / 跟随系统">
          <p>
            侧栏底部有 <Ui>日间、夜间、系统</Ui> 三档。<Ui>系统</Ui> 跟随操作系统的深浅色，系统在日落时切换，页面也跟着切换；
            选过 <Ui>日间</Ui> 或 <Ui>夜间</Ui> 之后以你的选择为准。
          </p>
          <p>
            选择记在这台设备的浏览器里，换设备不会同步；首次打开默认跟随系统。登录页右上角也有同一个开关。
          </p>
        </Item>

        <Item no="1.6" title="找东西：底部搜索栏">
          <p>
            每一页底部都停着一条搜索栏，输入课件名、判例名或正文里的半句话，回车就到结果页；也可以直接按{' '}
            <span className="kbd">/</span> 把光标放进搜索框。
          </p>
          <p>
            检索范围限你自己读得到的课件、笔记、教材与英文法条。中文英文都按子串匹配，两个字的短词也查得到；
            结果里命中的字会标成黄底，方便扫读。
          </p>
        </Item>
      </Chapter>

      <Chapter id="ch-reading" no="二" title="阅读工作台" count="2.1 – 2.3">
        <Item no="2.1" title="阅读 · 全文用衬线排">
          <ul className="help-list">
            <li>点术语看释义，可加入生词本，来源与原文语境一起记下。</li>
            <li>开「对照译文」后点段落，逐句对照。</li>
            <li>右侧目录与阅读分级，长文也不容易读丢。</li>
          </ul>
        </Item>

        <Item no="2.2" title="编辑 · 仅作者与任课教师">
          <ul className="help-list">
            <li>工具条管加粗、斜体、列表、引文与「要点」块。</li>
            <li>
              选中词语后按 <Ui>术语</Ui> 加注音与释义，正文里会变成可点的虚线词。
            </li>
            <li>
              课件写完后按 <Ui>发布</Ui>；草稿状态对学生不可见。
            </li>
          </ul>
        </Item>

        <Item no="2.3" title="演示 · 整屏投屏，一屏一段">
          <ul className="help-list">
            <li>
              顶部 <Ui>演示</Ui> 进入整屏演示：按真实版面高度切屏，一屏之内不会截半句话。
            </li>
            <li>
              滚轮往下拨一格就翻一屏，<span className="kbd">↓</span> <span className="kbd">PgDn</span> 同理；
              <span className="kbd">↑</span> 回上一屏。
            </li>
            <li>
              <span className="kbd">F</span> 切浏览器全屏（投屏前按一下），<span className="kbd">Esc</span>{' '}
              退出全屏，再按一次离开演示。
            </li>
            <li>
              底部进度条可跳到任意一屏；地址栏加 <code>?p=3</code> 可直接从第三屏开始。
            </li>
            <li>
              左侧目录按正文章节标题列出，讲到哪一节自动高亮，点标题直接翻到那一屏；
              按 <span className="kbd">T</span> 或点右上 <Ui>收起目录</Ui> 可以收起，把整屏让给正文。
            </li>
          </ul>
        </Item>
      </Chapter>

      <Chapter id="ch-words" no="三" title="生词本与讨论区" count="3.1 – 3.2">
        <Item no="3.1" title="生词本 · 四档掌握度">
          <ul className="help-list">
            <li>掌握度分四档：生词 → 眼熟 → 能译 → 会用。教师端学情只统计达到「能译」及以上的词条。</li>
            <li>每条词都带来源（课件、笔记、手动添加、课堂讨论）与收录日期，回头能找回原句。</li>
            <li>
              右上可导出 <Ui>Excel</Ui>、<Ui>Word</Ui>，或 <Ui>打印 / PDF</Ui> 走浏览器打印。
            </li>
            <li>
              每个账号默认两个词表：空的<strong>自定义单词本</strong>放随堂标注，<strong>法律英语单词本</strong>
              是内置词库（张法连《法律英语术语表》，两千余条，可按字母浏览或搜索）。
            </li>
            <li>
              装了教材的机器上还会有第三本<strong>教材核心词</strong>：把《法律英语（第四版）》全书标注过的术语按「出现在几讲」排过序，
              取跨讲复现的一百多个，每条带音标与释义、并注明出现在几讲。它和内置术语表一样只读，可在词条上标掌握度。
            </li>
          </ul>
        </Item>

        <Item no="3.2" title="讨论区 · 提问与作业分开">
          <ul className="help-list">
            <li>
              发帖时选类型：<Ui>课堂提问</Ui> 或 <Ui>作业</Ui>；作业可带截止时间。
            </li>
            <li>教师的批注贴着你的原文出现，评分与「参考答案」标记也在同一条回复上。</li>
            <li>回复会同时计入你的学情记录，讨论不是附加项。</li>
          </ul>
        </Item>
      </Chapter>

      <Chapter id="ch-teaching" no="四" title="教师授课" count="4.1 – 4.7">
        <Item no="4.1" title="建课即建班">
          <p>
            一门课对应一个教学班。在首页右上点 <Ui>新建课程</Ui>，授课班级有两种填法：选一个已有的班挂上去，
            或直接填班名当场建一个。填班名时系统同时生成一个 6 位班级码（字符集去掉了 0/O/1/I，避免看错），
            同名班级不会重复建。挂班之后，班内学生自动选修；此后才入班的学生同样会自动补选。
          </p>
        </Item>

        <Item no="4.2" title="把班级码或邀请发出去">
          <p>
            进入课程页，统计卡下方的 <Ui>教学班</Ui> 一栏就是这门课的班级：班名、人数、班级码都在这里。
            班级码可随时重置，旧码立刻失效；也可以关闭自助加入，改成只认邀请链接。
          </p>
          <p>
            旁边是 <Ui>邀请链接</Ui> 面板。邀请可以设使用次数与有效期；教师生成的不限次数。
            班内同学也能生成邀请，默认 3 人、7 天，够用来把同桌拉进来。
          </p>
        </Item>

        <Item no="4.3" title="名册与成员">
          <p>
            同一栏往下是成员名单：学号、姓名、加入时间与加入方式（班级码 / 邀请链接 / 同学邀请 / 教师添加），
            需要时可以把人移出班级；学生自己也能从课程页退出班级。班级已并入课程页，侧栏不再单列 <Ui>班级</Ui> 入口。
          </p>
        </Item>

        <Item no="4.4" title="课程安排与专题表">
          <p>
            <Ui>课程安排</Ui> 页按当前这一套专题表列出八讲：上课日、周次、讲授 / 延伸阅读、配套案例与案号。
            专题的上课日一过就自动标为「已讲完」，首页的 <Ui>教学进度</Ui> 也按同一份日期推算，不用手工勾。
          </p>
          <p>
            每个专题下面还有一行 <Ui>课件</Ui>：点进去直接打开这一讲的课件正文，案例若已有电子稿也是可点的（虚线下划线）。
            还没上传课件的专题会写「这一讲的课件还没上传」，不会给一个点进去空白的链接。
          </p>
          <p>
            专题与案例写在本机 <Ui>data/course-plan.local.json</Ui> 的 <Ui>coursewares</Ui>{' '}
            里，一门课只用第一套；换讲法就改这份文件，刷新后学生端看到的专题与案例一起变。
            学期第一周写在同文件的 <Ui>termStart</Ui>，用来推算「这周是第几周」。只按第一讲日期推会把周次算大。
            课件用文档 id 挂：专题写 <Ui>docs</Ui>，单个案例写 <Ui>doc</Ui>，标题在页面渲染时从库里现取。
          </p>
        </Item>

        <Item no="4.5" title="写课件、标术语、发布">
          <p>
            两条路都能开始：课程详情页 <Ui>新建课件</Ui> 从空白写起，或到 <Ui>我的课件</Ui> 点{' '}
            <Ui>上传课件</Ui> 把自己备好的 .docx / .md / .txt 传进来。上传时正文首行若是标题，会被提为课件标题，正文里不再重复一遍；Word 只取标题与段落，样式、批注、图片不会带过来，图片请在编辑器里插入。
          </p>
          <p>
            传完直接进编辑态，改完保存即可。工具条里的 <Ui>要点</Ui>{' '}
            是一个重点论述块，适合放判例摘录；<Ui>术语</Ui> 给选中的词加注音与释义，学生阅读时能点开。
          </p>
          <p>
            写完点 <Ui>发布</Ui>。发布前只有你自己看得到；发布后选修学生可读，也能把课件{' '}
            <Ui>纳入我的笔记库</Ui> 生成自己的副本继续批注。
          </p>
        </Item>

        <Item no="4.6" title="批注、评分与学情">
          <p>
            讨论区里可以给任何一条回复 <Ui>写批注</Ui>，也可以评分、标记为参考答案。批注和评分都会留在原帖下面，学生回头能对上自己写的那一段。
          </p>
          <p>
            <Ui>学情</Ui> 不单独占页面入口，就在课程页里：进任意一门自己教的课，统计卡下方第一块就是学情，
            卡片上的 <Ui>学情</Ui> 按钮直达这一段。课程是按班开的，所以看到的即本班数据。
            每个班看的是选课人数、课件数、译文命中率、未掌握词数、术语热度与近六周活跃；
            逐人的笔记、术语点击、收录词、讨论回复不再单独列一张「学生明细」，而是并进下方 <Ui>教学班 · 成员名单</Ui>{' '}
            同一张表，按学号排、表头吸顶，一页只有一份学生清单。译文命中率反映的是课件句子与译文库的覆盖程度，不是学生水平。
          </p>
        </Item>

        <Item no="4.7" title="教学进度">
          <p>
            首页 <Ui>教学进度</Ui> 按教学班各给一张卡：上面是学期周轴（第几周 / 共 16 周），下面是八讲专题轨道，
            已讲填实、本次课留环、未讲留白。百分比取已讲专题数，旁边的「下一讲」会标出专题名与上课日。
          </p>
          <p>
            进度不是手工勾的，而是按 <Ui>课程安排</Ui> 里每个专题的上课日推算：日期一过就算讲完。
            两个平行班的上课星期不同（周三 / 周四），卡上显示的下一讲日期会各自换算，不会两边同一天。
          </p>
        </Item>
      </Chapter>

      <Chapter id="ch-faq" no="五" title="常见问题" count="5.1 – 5.6">
        <Item no="5.1" title="忘了密码，或者想改密码">
          <p>
            当前版本没有自助找回或改密入口，也不做没有邮件验证兜底的「找回」，免得反而成为漏洞。请联系维护者在数据库层面重置。演示环境也可以直接{' '}
            <Ui>npm run db:seed</Ui> 重建，但那会清空全部数据。
          </p>
        </Item>

        <Item no="5.2" title="课程页没有「选修」按钮">
          <p>这门课挂在教学班下，名单由班级决定。回「课程」首页输入班级码，或打开邀请链接，入班后自动选修。</p>
        </Item>

        <Item no="5.3" title="译文显示「暂无对照」">
          <p>
            译文按句子哈希匹配预置句库，只有库里的句子才有对照。改动过的句子、自己写的笔记不会命中。未命中就如实标注，不做机器翻译。
          </p>
        </Item>

        <Item no="5.4" title="教师改了课件，我的笔记会跟着变吗">
          <p>
            不会。<Ui>纳入我的笔记库</Ui>{' '}
            生成的是独立副本（标题带「（我的笔记）」），原课件的后续修改不会覆盖它。同一份课件只保留一份副本，再次点击会直接打开已有的那份。
          </p>
        </Item>

        <Item no="5.5" title="数据存在哪里，怎么备份">
          <p>
            单文件 <Ui>data/lexinote.db</Ui>（WAL 模式，同目录还有 -wal / -shm 两个附属文件）。备份时三个一起拷；重建执行{' '}
            <Ui>npm run db:seed</Ui>。
          </p>
        </Item>

        <Item no="5.6" title="打不开页面，或者端口被占">
          <p>
            双击项目根目录的 <Ui>打开平台.cmd</Ui>。它会先看 3100 端口有没有服务，没有才启动，然后打开入口页。
          </p>
        </Item>
      </Chapter>

      {canSeeAdmin ? (
        <Chapter id="ch-admin" no="六" title="维护者" count="仅教师与管理员可见">
          <Item no="6.1" title="开发日志与 Skill 配置">
            <p>
              开发日志记录了每个阶段的取舍与代价，<Ui>Skill 配置</Ui> 是标注与编辑建议的规则源（YAML，保存即升版）。这两样是给维护者的，不影响日常使用。
            </p>
            <p style={{ marginTop: 12 }}>
              <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/admin">
                打开开发日志与 Skill 配置
              </Link>
            </p>
          </Item>
        </Chapter>
      ) : null}

      <p className="ln-hint" style={{ marginTop: 30 }}>
        还有没写清楚的地方，直接在讨论区提。说明本身就是可以改的。数据怎么处理、谁能看到，见
        <Link href="/help/privacy">隐私政策</Link>。
      </p>
        </div>
      </div>
    </div>
  );
}