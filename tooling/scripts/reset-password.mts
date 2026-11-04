/**
 * 重置账号口令（维护者用）。
 *
 * 平台没有自助改密与找回，忘记口令只能由维护者在本机执行本脚本。
 * 口令必须以 scrypt 散列入库，因此不能直接 UPDATE 一句明文。
 *
 * 用法：
 *   npx tsx tooling/scripts/reset-password.mts <学号/工号> <新口令>
 *   npx tsx tooling/scripts/reset-password.mts 26320001 "新的口令Abc123"
 *
 * 口令规则与注册一致：≥8 位、≥ 两类字符、不等于学号、不在弱口令表内。
 * 校验不通过的会被拒绝，避免把演示口令 lexinote 重新写回去。
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { hashPassword, passwordProblem } from '../../packages/utils/src/password.ts';

const [loginNo, password] = process.argv.slice(2);

if (!loginNo || !password) {
  console.error('用法：npx tsx tooling/scripts/reset-password.mts <学号/工号> <新口令>');
  process.exit(1);
}

const dbPath = path.resolve('data', 'lexinote.db');
const db = new DatabaseSync(dbPath);

const row = db
  .prepare('SELECT id, login_no, name, role FROM users WHERE lower(login_no) = lower(?)')
  .get(loginNo) as { id: string; login_no: string; name: string; role: string } | undefined;

if (!row) {
  console.error(`没有这个账号：${loginNo}`);
  console.error('可选账号：');
  for (const u of db.prepare('SELECT login_no, name, role FROM users ORDER BY role, login_no').all() as {
    login_no: string;
    name: string;
    role: string;
  }[]) {
    console.error(`  ${u.login_no.padEnd(10)} ${u.role.padEnd(8)} ${u.name}`);
  }
  db.close();
  process.exit(1);
}

const problem = passwordProblem(password, loginNo, row.name);
if (problem) {
  console.error(`口令不合规：${problem}`);
  db.close();
  process.exit(1);
}

db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
  hashPassword(password),
  new Date().toISOString(),
  row.id,
);
db.close();

console.log(`已重置：${row.login_no ?? loginNo}（${row.name} / ${row.role}）`);
console.log('下次登录即生效，无需重启服务。');
