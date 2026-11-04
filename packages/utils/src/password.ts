import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * 口令散列（服务端专用）。放在 @ln/utils/password 子路径，
 * 不进入浏览器包（`. ` 入口只导出纯函数）。
 */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/**
 * 明确写出来的弱口令：注册与重置口令时都直接拒绝。
 * 放在这里而不是服务端模块里，是因为维护者重置口令的脚本也要用同一套规则——
 * 两处各写一份，迟早会出现「注册拦得住、重置放得过去」的口子。
 */
const WEAK = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'passw0rd',
  'qwertyui',
  'abc12345',
  'a1234567',
  '11111111',
  '00000000',
  'iloveyou',
  'admin123',
  'lexinote',
  'woaini1314',
  'aaaaaaaa',
]);

/**
 * 是否含有长度 ≥ run 的连续升序或降序片段。
 *
 * 早先只用一个正则匹配 `abcdefghij` / `1234567890` 这类完整串，
 * 结果 `abcd1234`、`abcdefgh`、`87654321` 全部放行——
 * 而 `abcd1234` 有两类字符，恰好绕过了「需要两类」那条，是实打实的漏网。
 */
function hasRun(input: string, run: number): boolean {
  const s = input.toLowerCase();
  let asc = 1;
  let desc = 1;
  for (let i = 1; i < s.length; i += 1) {
    const diff = s.charCodeAt(i) - s.charCodeAt(i - 1);
    asc = diff === 1 ? asc + 1 : 1;
    desc = diff === -1 ? desc + 1 : 1;
    if (asc >= run || desc >= run) return true;
  }
  return false;
}

/**
 * 口令强度检查。只做本地可判定的规则，不假装能做泄露情报比对；
 * 真正重要的是界面那句提示——不要与学校统一身份认证使用同一个口令。
 */
export function passwordProblem(password: string, loginNo: string, name?: string): string | null {
  if (password.length < 8) return '密码至少 8 位。';
  if (password.length > 64) return '密码不要超过 64 位。';
  const lower = password.toLowerCase();
  if (lower === loginNo.toLowerCase()) return '密码不能和学号相同。';
  if (name && lower === name.toLowerCase()) return '密码不能和姓名拼音相同。';
  if (WEAK.has(lower)) return '这是常见弱密码，换一个别人猜不到的。';
  if (/^(.)\1+$/.test(password)) return '不要用重复字符作为密码。';
  if (hasRun(password, 4)) return '不要用连续字符作为密码。';

  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  const hasCjk = /[\u4e00-\u9fa5]/.test(password);
  if (kinds < 2 && !hasCjk) return '密码需要同时包含字母、数字或符号中的两类。';
  return null;
}
