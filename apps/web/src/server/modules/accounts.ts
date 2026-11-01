import type { JoinResult, SessionUser } from '@ln/types';
import { initialsOf } from '@ln/utils';
import { hashPassword } from '@ln/utils/password';
import { getDb } from '../db';
import { badRequest, HttpError } from '../http';
import { joinByCode, acceptInvite } from './classes';

const uid = (p: string) => `${p}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

/** 明确写出来的弱口令：注册时直接拒绝，避免学生把演示口令当自己的密码 */
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
 * 密码强度检查。只做本地可判定的规则，不假装能做泄露情报比对；
 * 真正重要的是那句提示——不要与学校统一身份认证使用同一个密码。
 */
export function passwordProblem(password: string, loginNo: string, name?: string): string | null {
  if (password.length < 8) return '密码至少 8 位。';
  if (password.length > 64) return '密码不要超过 64 位。';
  const lower = password.toLowerCase();
  if (lower === loginNo.toLowerCase()) return '密码不能和学号相同。';
  if (name && lower === name.toLowerCase()) return '密码不能和姓名拼音相同。';
  if (WEAK.has(lower)) return '这是常见弱密码，换一个别人猜不到的。';
  if (/^(.)\1+$/.test(password)) return '不要用重复字符作为密码。';
  if (/^(?:0123456789|1234567890|abcdefghij|qwertyuiop)/i.test(lower)) return '不要用连续字符作为密码。';

  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  const hasCjk = /[\u4e00-\u9fa5]/.test(password);
  if (kinds < 2 && !hasCjk) return '密码需要同时包含字母、数字或符号中的两类。';
  return null;
}

export interface RegisterInput {
  loginNo: string;
  name: string;
  password: string;
  /** 可选：注册时直接凭班级码入班 */
  classCode?: string | null;
  /** 可选：从邀请链接进入注册时携带 */
  inviteToken?: string | null;
}

export interface RegisterResult {
  user: SessionUser;
  join: JoinResult | null;
  /** 入班失败时的软提示：账号已经建好，不让一个打错的班级码把注册整段作废 */
  joinWarning: string | null;
}

export function registerStudent(input: RegisterInput): RegisterResult {
  const db = getDb();
  const loginNo = input.loginNo.trim().toUpperCase();
  const name = input.name.trim();

  if (!/^[A-Z0-9_-]{4,20}$/.test(loginNo)) {
    throw badRequest('学号应为 4–20 位字母或数字，教师请填工号。', 'loginNo');
  }
  if (name.length < 2 || name.length > 24) {
    throw badRequest('姓名请填 2–24 个字。', 'name');
  }

  const problem = passwordProblem(input.password, loginNo, name);
  if (problem) throw badRequest(problem, 'password');

  const exists = db.get<{ id: string }>(
    'SELECT id FROM users WHERE lower(login_no) = lower(?)',
    loginNo,
  );
  if (exists) throw badRequest('这个学号已经注册过了，直接登录即可。', 'loginNo');

  const id = uid('usr');
  const iso = new Date().toISOString();
  db.run(
    `INSERT INTO users (id, login_no, email, name, role, password_hash, created_at, updated_at)
     VALUES (?, ?, NULL, ?, 'STUDENT', ?, ?, ?)`,
    id,
    loginNo,
    name,
    hashPassword(input.password),
    iso,
    iso,
  );

  // 新用户默认给一个自建词表，避免第一次点「加入生词本」时无处可落；
  // 内置的「法律英语单词本」由 listWordbooks 首次访问时补上。
  db.run(
    `INSERT INTO wordbooks (id, user_id, name, kind, description, created_at) VALUES (?, ?, '自定义单词本', 'CUSTOM', '随堂标注自动收进这里', ?)`,
    uid('wb'),
    id,
    iso,
  );

  const user: SessionUser = {
    id,
    loginNo,
    email: null,
    name,
    role: 'STUDENT',
    initials: initialsOf(name),
  };

  let join: JoinResult | null = null;
  let joinWarning: string | null = null;

  if (input.inviteToken) {
    try {
      join = acceptInvite(user, input.inviteToken.trim());
    } catch (error) {
      joinWarning =
        error instanceof HttpError ? error.message : '邀请链接暂时无法使用，登录后可在「班级」页重新加入。';
    }
  } else if (input.classCode?.trim()) {
    try {
      join = joinByCode(user, input.classCode);
    } catch (error) {
      joinWarning =
        error instanceof HttpError ? error.message : '班级码暂时无法核验，登录后可在「班级」页重新加入。';
    }
  }

  return { user, join, joinWarning };
}

/** 注册成功后给客户的账号提示语，登录页直接复用 */
export const PASSWORD_ADVICE =
  '请勿使用与学校统一身份认证、教务系统相同的密码。这个系统是独立部署的，一旦与校内密码复用，任何一处泄露都会连带影响你的成绩与个人信息。';
