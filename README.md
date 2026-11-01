# LexiNote · 法律英语精读

<div align="center">

# LexiNote · 法律英语精读

**面向法学院课程的法律英语交互式阅读平台：课件、术语、生词本、讨论与学情，围绕一份可交互的文档展开。**

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)
![Tiptap](https://img.shields.io/badge/Tiptap-2-0D1B2A?style=flat-square)
![node:sqlite](https://img.shields.io/badge/db-node%3Asqlite-003B57?style=flat-square)

`法律英语` · `逐句精读` · `术语标注` · `译文对照` · `生词本` · `讨论批注` · `学情` · `整屏演示`

</div>

面向法学院课程的法律英语交互式阅读与写作平台：英文原文逐段精读，术语点开有释义，可对照译文、积累生词、提交讨论，教师端能看课程学情；同一份文档还能整屏投屏演示，一屏一段，适合课堂上讲判例。

独立部署，不接学校统一身份认证与教务系统；所有数据落在部署机上的单个 SQLite 文件里。

## 技术栈

- **Next.js 14**（App Router、Server Components、Route Handlers）
- **Tiptap 2** 自研编辑器（`packages/editor`：术语节点、要点块、图片、流程图）
- **node:sqlite**（Node 22 内置，无需原生编译，克隆即可跑）
- **jose** 签发 httpOnly 会话 Cookie；**zod** 做请求校验
- 导出三渲染器：exceljs（xlsx）、docx（Word）、打印样式（PDF）

## 快速开始

```bash
# 需要 Node >= 22.5（依赖内置 node:sqlite）
npm install
npm run db:seed     # 重建 SQLite 并灌入演示数据（会清空旧库）
npm run dev         # http://localhost:3100
```

Windows 上也可以双击 **`打开平台.cmd`**：先探测 3100 端口，没服务才启动，然后打开 `入口.html`（离线可看的模块地图与服务状态）。

演示账号（口令统一为 `lexinote`）：

| 角色 | 账号 | 姓名 |
| --- | --- | --- |
| 教师 | `T202601` | 陈时序 |
| 教师 | `T202602` | 沈慕之 |
| 学生 | `20230101` | 林知远 |
| 学生 | `20230102` | 苏漾 |

演示班级码：`LAW103`、`LAW211`、`LAW402`；演示邀请链接：`/join/demo-contract-2103`。

## 目录结构

```
apps/web             Next.js 应用
  src/app            页面与 API 路由
    (shell)          登录后的应用外壳（课程、课程安排、班级、文档、生词本、讨论、学情、使用说明）
    (public)         公开页：隐私政策 /privacy、使用说明 /terms
    api              Route Handlers
  src/server         服务端模块（auth、db、courses、classes、vocabulary、exports…）
  src/components     界面组件
packages/db          schema.sql（SQLite 适配器与 prisma/schema.prisma 字段一一对应）
packages/editor      Tiptap 编辑器与样式
packages/types       共享类型
packages/utils       文本/日期/口令工具
tooling/content      种子内容（演示课件、术语、译文、讨论）
tooling/scripts      seed.mts、launch.mjs、extract-glossary.mjs
data/                运行时数据目录（**不进仓库**）
```

## 已有功能

- **课程与班级**：教师建班生成 6 位班级码（字符集去掉 0/O/1/I），学生凭码或邀请链接入班，入班自动选修该班课程；班级码可重置、可关闭自助加入。
- **阅读工作台**：阅读 / 编辑 / 演示三态。术语点开有注音与释义，可一键收进生词本；「对照译文」按句匹配预置句库，未命中如实标注，不做机器翻译。
- **演示**：整屏铺满，按真实版面高度切屏，滚轮一格翻一屏，标题不会落在页脚；`F` 进浏览器全屏，`?p=3` 可从第 N 屏进入。
- **生词本**：两档词表（自定义 + 内置法律英语术语表），四档掌握度，服务端分页、搜索与字母索引，可导出 xlsx / docx / 打印。
- **讨论与批注**：提问与作业分开建帖，教师可在回复上写批注、评分、标记参考答案；回复计入学习记录。
- **学情**：选课人数、课件数、译文命中率、未掌握词数、学生明细与术语热度。
- **课程安排**：本学期专题、配套案例（含案号出处）、上课周次与课程代码，右侧推荐阅读栏可按书名、作者或 ISBN 检索。
- **隐私政策与使用说明**：登录页与每页右下角都有入口，未登录也可读。

## 数据与隐私（重要）

仓库只放代码与演示内容。以下文件位于 `data/`，**已被 `.gitignore` 排除**，只留在部署机上：

| 文件 | 内容 |
| --- | --- |
| `data/lexinote.db`（含 `-wal` / `-shm`）| 数据库：账号、姓名、学号、笔记、生词、讨论、学习记录 |
| `data/course-plan.local.json` | 本校课程安排：任课教师、教室、周次、课程代码、专题与案例 |
| `data/glossary.zhang-falian.json` | 由自备电子版生成的法律英语术语表（版权原因不入库） |

- **课程安排**：复制 `data/course-plan.local.json` 的字段结构自行填写即可；文件缺失时页面显示仓库自带的示例安排，不会报错。
- **术语表**：`node tooling/scripts/extract-glossary.mjs <你的 xlsx 路径>` 生成；文件缺失时内置词库整套跳过，生词本只剩「自定义单词本」，其余功能不受影响。
- **隐私政策**：`/privacy` 按本项目的实际实现撰写（scrypt 加盐散列、httpOnly 会话 Cookie、数据只落本机、不接第三方统计与广告）。部署到自己的环境前，请核对文中「谁在处理你的数据」「联系」两节是否与事实一致。

## 已知限制

- 没有自助改密与找回：不做没有邮件验证兜底的「找回」，忘记密码请联系维护者在后台重置。
- 译文按句子哈希匹配预置句库，覆盖不到的内容如实标注。
- 教师侧的课件新建/编辑、快照对比、学生个人阅读轨迹尚未做成界面。
- 移动端只保证可读，演示态按桌面投屏设计。

## 许可

教学自用项目，暂未附开源许可。如需引用或二次分发，请先联系作者。
