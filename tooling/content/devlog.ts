export interface SeedDevLog {
  phase: string;
  goal: string;
  decisions: { title: string; detail: string }[];
  status: string;
}

export const devLogs: SeedDevLog[] = [
  {
    phase: 'S1 · 工程骨架',
    goal: '建立 monorepo、类型契约、数据模型、认证与权限中间件。',
    decisions: [
      {
        title: 'API 采用 Next Route Handlers，而非独立 Fastify 进程',
        detail: '说明书 §2.1 允许二选一。单进程部署减少一层运维，Route Handler 里的 service 层仍按模块切分，未来可平移到 Fastify。',
      },
      {
        title: '数据层：契约用 Prisma Schema，本地运行时用 node:sqlite',
        detail: '本机无 Visual Studio 构建链，better-sqlite3 无法编译。改用 Node 22 内置 sqlite，零原生依赖；表结构、约束、索引与 prisma/schema.prisma 一一对应，仓储层隔离方言。',
      },
      {
        title: 'DTO 单一真相源在 packages/types',
        detail: '前后端共享同一份接口定义，禁止各写一份。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S2 · 编辑器内核',
    goal: 'Tiptap 唯一实例化入口，支持编辑 / 只读双模式。',
    decisions: [
      {
        title: '四种模式共用一套扩展与渲染管线',
        detail: 'edit / readonly / presentation / diff 只在 editable 与交互层有差异，样式与节点渲染完全一致。',
      },
      {
        title: '编辑器不依赖 API 客户端',
        detail: '术语数据存在节点 attrs 与 DOM dataset 中，点击事件由应用层委托处理，编辑包可独立测试。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S3 · legalTerm 节点',
    goal: '划词标注、虚线渲染、点击弹出音标与释义。',
    decisions: [
      {
        title: '行内节点保留内部文本，而非原子节点',
        detail: '保留文本使其仍可编辑、可复制、可被句子切分命中；原子节点会让「精读」拿不到整句文本。',
      },
      {
        title: 'Popover 用 Portal 挂到全屏容器',
        detail: '演示模式下 document.body 不在全屏子树中，Portal 目标改为 document.fullscreenElement ?? document.body，避免被裁剪。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S4 · TOC 侧栏',
    goal: '标题树、搜索过滤、点击跳转、滚动高亮。',
    decisions: [
      {
        title: '用 DOM 顺序而非文档位置做锚点',
        detail: 'heading 索引与渲染后的 h1–h3 顺序一一对应，避免在只读/演示模式下做位置换算。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S5 · 全屏演示',
    goal: '按 h1 分页、键盘翻页、全屏、TOC 浮层、术语仍可点击。',
    decisions: [
      {
        title: '分页在 JSON 层完成',
        detail: '按 level=1 的 heading 切分文档节点，每页仍由同一个 EditorShell 只读渲染，保证排版一致。',
      },
      {
        title: '键盘映射：← → 翻页，F 全屏，O 目录，Esc 退出',
        detail: '与说明书 §5.2 一致；焦点在可交互元素上时不拦截翻页键。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S6 · 课程分发',
    goal: '教师发布课件，学生纳入笔记库生成副本。',
    decisions: [
      {
        title: '副本溯源用 parentDocId，侧栏分级仍读原课件',
        detail: '内容以副本为准、分级以原课件为准，UI 上标注来源课件标题，与说明书 §11 的一致性策略一致。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S7 · 侧栏分级',
    goal: '必读 / 选读徽章，仅教师可写。',
    decisions: [
      {
        title: '权限判定只在服务端',
        detail: '前端隐藏按钮仅为体验；PUT /api/sidebar/:id 二次校验角色与课程归属。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S8 · 翻译模板与精读',
    goal: '句子哈希匹配、未命中兜底、命中率可统计。',
    decisions: [
      {
        title: '哈希在浏览器计算，服务端只做查表',
        detail: '归一化与 SHA-256 由 packages/utils 提供，前后端同一实现；网络面板中不存在任何外部翻译请求。',
      },
      {
        title: '未命中返回 matched:false',
        detail: '浮层显示「暂无预置译文」，不抛错，并记录 TRANSLATION_HIT 事件用于命中率统计。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S9 · 单词本',
    goal: '多词表、来源追溯、掌握度。',
    decisions: [
      {
        title: '来源字段统一走 buildSource()',
        detail: 'sourceType + sourceDocId + sourceContext 构成最小充分集，禁止各模块手拼。',
      },
      {
        title: '掌握度用四段控件替代滑块',
        detail: '生词 / 眼熟 / 能译 / 会用 比 0–100 的滑块更可解释，落库仍是 0–3 的整数。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S10 · 导出',
    goal: 'xlsx / docx / pdf 三个渲染器消费同一份 WordbookExportDTO。',
    decisions: [
      {
        title: 'xlsx 用 ExcelJS，docx 用 docx',
        detail: '均在服务端生成，带表头样式、列宽与分类着色；数据层为同一 DTO。',
      },
      {
        title: 'PDF 走 A4 打印视图',
        detail: 'pdfmake 的中文字体体积过大，改为生成带 @page 规则的打印视图，由浏览器输出 PDF；字体与分页由系统保证，模板到位后只替换样式层。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S11 · 论坛与批注',
    goal: '主题、回答、参考答案标记、评分、批注。',
    decisions: [
      {
        title: '批注独立于帖子正文',
        detail: 'Annotation 以 targetType + targetId + anchor 指向目标，不覆盖原文；教师批注在全站以朱砂色呈现。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S12 · 快照与学情',
    goal: '保存即快照、两快照对比、仪表盘读聚合表。',
    decisions: [
      {
        title: '自研轻量 diff，接口对齐官方 Snapshot Compare',
        detail: '以词为单位的 LCS diff 封装在 packages/utils，editor 侧只消费结果；未来替换官方包时无需改动调用方。',
      },
      {
        title: '仪表盘只读 analytics_daily',
        detail: '由 seed 中的聚合任务从 learning_events 汇总，查询不扫原始事件表。',
      },
    ],
    status: '已完成',
  },
  {
    phase: 'S13 · Skill 与开发日志',
    goal: 'YAML 表单化渲染、回写递增版本；开发日志时间线。',
    decisions: [
      {
        title: '已知区段渲染表单，未知区段保留原文',
        detail: '按 §8 的六个区段建模，新增区段不会因缺表单而丢失；保存时重新序列化整份 YAML 并 version++。',
      },
    ],
    status: '已完成',
  },
];
