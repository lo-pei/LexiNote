/**
 * 口令规则与散列单测。
 *
 * 这套规则被三个入口共用：注册、登录后自助改密、维护者重置脚本。
 * 任何一处放行，都会让另外两处的检查形同虚设。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordProblem, hashPassword, verifyPassword } from '@ln/utils/password';

test('长度不足 8 位被拒', () => {
  assert.equal(passwordProblem('aB3!', '26320001'), '密码至少 8 位。');
});

test('超过 64 位被拒', () => {
  assert.ok(passwordProblem('a'.repeat(65) + 'B1!', '26320001'));
});

test('与学号相同被拒', () => {
  assert.equal(passwordProblem('26320001', '26320001'), '密码不能和学号相同。');
});

test('与学号相同（大小写无关）被拒', () => {
  assert.equal(passwordProblem('T202601AB', 't202601ab'), '密码不能和学号相同。');
});

test('与姓名相同被拒', () => {
  assert.equal(passwordProblem('linzhiyuan', '26320001', 'linzhiyuan'), '密码不能和姓名拼音相同。');
});

test('常见弱口令被拒', () => {
  for (const weak of ['password', '12345678', 'qwertyui', 'lexinote', 'admin123']) {
    assert.ok(passwordProblem(weak, '26320001') !== null, `${weak} 应被拒`);
  }
});

test('重复字符被拒', () => {
  assert.equal(passwordProblem('zzzzzzzz', '26320001'), '不要用重复字符作为密码。');
});

test('连续字符被拒', () => {
  assert.equal(passwordProblem('abcdefgh', '26320001'), '不要用连续字符作为密码。');
});

test('字母 + 连续数字（abcd1234）也被拒', () => {
  // 这条有两类字符，早先的正则只认 abcdefghij 这种完整串，会把它放过去
  assert.equal(passwordProblem('abcd1234', '26320001'), '不要用连续字符作为密码。');
});

test('倒序连续字符被拒', () => {
  assert.equal(passwordProblem('87654321', '26320001'), '不要用连续字符作为密码。');
});

test('只有一类字符被拒', () => {
  assert.equal(passwordProblem('bdfhjlnp', '26320001'), '密码需要同时包含字母、数字或符号中的两类。');
});

test('中文口令放行（学生记得住比复杂更重要）', () => {
  assert.equal(passwordProblem('这个词我一定记得住', '26320001'), null);
});

test('字母 + 数字放行', () => {
  assert.equal(passwordProblem('lexi2026', '26320001'), null);
});

test('字母 + 符号放行', () => {
  assert.equal(passwordProblem('lexinote!', '26320001'), null);
});

test('散列可往返校验', () => {
  const stored = hashPassword('Lexi2026!');
  assert.equal(verifyPassword('Lexi2026!', stored), true);
  assert.equal(verifyPassword('Lexi2026?', stored), false);
});

test('同一口令两次散列的盐不同', () => {
  const a = hashPassword('Lexi2026!');
  const b = hashPassword('Lexi2026!');
  assert.notEqual(a, b);
  assert.equal(verifyPassword('Lexi2026!', a), true);
  assert.equal(verifyPassword('Lexi2026!', b), true);
});

test('格式异常的散列值不会抛出', () => {
  for (const bad of ['', 'plain', 'md5$abc$def', 'scrypt$$']) {
    assert.equal(verifyPassword('whatever', bad), false, `${bad} 应返回 false`);
  }
});
