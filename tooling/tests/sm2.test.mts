/**
 * SM-2 排期单测。
 * 运行：npm test（或 node --import tsx --test tooling/tests/*.test.mts）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextSm2, SM2_MAX_INTERVAL, SM2_MIN_EASE } from '@ln/utils';

const fresh = { intervalDays: 1, ease: 2.5, reps: 0, lapses: 0 };

test('首次答对：间隔 1 天、连续次数 +1', () => {
  const s = nextSm2(fresh, 2);
  assert.equal(s.intervalDays, 1);
  assert.equal(s.reps, 1);
  assert.equal(s.lapses, 0);
});

test('第二次答对：间隔 6 天', () => {
  const s = nextSm2({ intervalDays: 1, ease: 2.5, reps: 1, lapses: 0 }, 2);
  assert.equal(s.intervalDays, 6);
  assert.equal(s.reps, 2);
});

test('第三次答对：按 ease 递推', () => {
  const s = nextSm2({ intervalDays: 6, ease: 2.5, reps: 2, lapses: 0 }, 2);
  assert.equal(s.intervalDays, 15); // round(6 × 2.5)
  assert.equal(s.reps, 3);
});

test('答错：间隔归零、连续次数清零、遗忘次数 +1', () => {
  const s = nextSm2({ intervalDays: 30, ease: 2.5, reps: 5, lapses: 1 }, 0);
  assert.equal(s.intervalDays, 1);
  assert.equal(s.reps, 0);
  assert.equal(s.lapses, 2);
});

test('答错时 ease 仍然下降（忘过说明这个词更难）', () => {
  const s = nextSm2({ intervalDays: 6, ease: 2.5, reps: 2, lapses: 0 }, 0);
  assert.ok(s.ease < 2.5, `ease 应下降，实际 ${s.ease}`);
  assert.ok(Math.abs(s.ease - 2.18) < 1e-9, `期望 2.18，实际 ${s.ease}`);
});

test('很熟（grade 3）：ease +0.1', () => {
  const s = nextSm2({ intervalDays: 6, ease: 2.5, reps: 2, lapses: 0 }, 3);
  assert.ok(Math.abs(s.ease - 2.6) < 1e-9);
});

test('记得（grade 2）：ease 不变', () => {
  const s = nextSm2({ intervalDays: 6, ease: 2.5, reps: 2, lapses: 0 }, 2);
  assert.ok(Math.abs(s.ease - 2.5) < 1e-9);
});

test('眼熟（grade 1）：仍算通过，但 ease 下降', () => {
  // SM-2 里 quality≥3 即算通过；四档自评只有「忘了」会归零重来
  const s = nextSm2({ intervalDays: 20, ease: 2.5, reps: 4, lapses: 0 }, 1);
  assert.equal(s.reps, 5);
  assert.equal(s.lapses, 0);
  assert.equal(s.intervalDays, 50); // round(20 × 2.5)
  assert.ok(s.ease < 2.5, `ease 应下降，实际 ${s.ease}`);
});

test('ease 不会跌破下限', () => {
  let s = { intervalDays: 6, ease: 1.35, reps: 2, lapses: 0 };
  for (let i = 0; i < 5; i += 1) s = nextSm2(s, 0);
  assert.equal(s.ease, SM2_MIN_EASE);
});

test('间隔不会超过上限（防一学期见不到第二次）', () => {
  const s = nextSm2({ intervalDays: 170, ease: 2.8, reps: 9, lapses: 0 }, 3);
  assert.equal(s.intervalDays, SM2_MAX_INTERVAL);
});

test('间隔至少 1 天', () => {
  const s = nextSm2({ intervalDays: 0, ease: 2.5, reps: 0, lapses: 0 }, 2);
  assert.ok(s.intervalDays >= 1);
});

test('不改动传入的状态（纯函数）', () => {
  const state = { intervalDays: 6, ease: 2.5, reps: 2, lapses: 0 };
  const snapshot = { ...state };
  nextSm2(state, 3);
  assert.deepEqual(state, snapshot);
});
