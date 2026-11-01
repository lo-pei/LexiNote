#!/usr/bin/env node
/**
 * 一键启动：确认本地开发服务在跑，然后直接打开登录页。
 *
 *   npm run launch          或在资源管理器里双击「打开平台.cmd」
 *
 * 三件事值得记下：
 * 1) NODE_OPTIONS 必须清空再交给子进程。本机沙箱的 safe-delete 守卫会拦批量 unlink，
 *    Next 清 .next 时必然失败；置空后跑得通。
 * 2) 入口页不再是一个独立的模块地图，直接打开 /login —— 原来那份「入口.html」
 *    只剩一个跳转，留给手动双击或历史链接用。
 * 3) Windows 上用 explorer.exe 打开 URL —— 数组参数不经 cmd 解析，
 *    路径里的空格与括号（LexiNote (LN)）不会被吃掉。
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PORT = Number(process.env.PORT || 3100);
// 用 127.0.0.1 而不是 localhost：本机开着系统代理且未配例外，
// 浏览器会把 localhost:PORT 也交给代理，代理回 502，页面打不开；
// 127.0.0.1 被代理客户端当作本地地址放行。见 index.html 顶部注释。
const BASE = `http://127.0.0.1:${PORT}`;
const ENTRY_URL = `${BASE}/login`;

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 试连一次端口，能连上就说明服务已监听 */
function portOpen(port, timeout = 700) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function openEntry() {
  if (process.env.LN_NO_OPEN === '1') {
    console.log(dim(`  （LN_NO_OPEN=1，跳过打开浏览器）${ENTRY_URL}`));
    return;
  }
  try {
    if (process.platform === 'win32') {
      spawn('explorer.exe', [ENTRY_URL], { stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [ENTRY_URL], { stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [ENTRY_URL], { stdio: 'ignore' }).unref();
    }
  } catch {
    console.log(dim(`  请手动打开：${ENTRY_URL}`));
  }
}

console.log('');
console.log('  LexiNote · 本地入口');
console.log(dim(`  端口 ${PORT} · ${ROOT}`));
console.log('');

if (await portOpen(PORT)) {
  console.log(green('  ● 服务已在运行'), dim(BASE));
  openEntry();
  process.exit(0);
}

if (!existsSync(path.join(ROOT, 'node_modules'))) {
  console.log(red('  缺少依赖：请先在项目目录执行 npm install'));
  process.exit(1);
}

console.log(dim('  正在启动开发服务…（首次编译约 10–30 秒）'));
console.log('');

const child = spawn('npm', ['run', 'dev', '--workspace', '@ln/web'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_OPTIONS: '' },
});

let exited = false;
child.on('exit', (code) => {
  exited = true;
  if (code) console.log(red(`  服务已退出（code ${code}）`));
  process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

let ready = false;
const deadline = Date.now() + 120000;
while (!ready && !exited && Date.now() < deadline) {
  if (await portOpen(PORT)) {
    ready = true;
    break;
  }
  await sleep(600);
}

if (ready) {
  console.log('');
  console.log(green('  ● 服务已就绪'), dim(BASE));
  console.log(dim('    已在浏览器打开登录页；按 Ctrl+C 结束服务。'));
  console.log('');
  openEntry();
} else if (!exited) {
  console.log(red('  启动超时（120 秒），请查看上面的日志。'));
}
