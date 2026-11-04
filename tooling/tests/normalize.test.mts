/**
 * 句子归一化与哈希单测。
 *
 * 这是译文查表的地基：归一化口径一变，既有 60 条模板的 source_hash 全部失效，
 * 学生的「对照译文」会集体变成「暂无」。所以每条规则都要钉住。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSource, hashSource, collapseWhitespace } from '@ln/utils';

test('去首尾空白并压缩连续空白', () => {
  assert.equal(normalizeSource('  The   Offer  '), 'the offer');
});

test('换行与制表符视同空格', () => {
  assert.equal(normalizeSource('a\n\tb'), 'a b');
});

test('统一弯引号为直引号', () => {
  assert.equal(normalizeSource('don\u2019t'), "don't");
  assert.equal(normalizeSource('\u201Coffer\u201D'), '"offer"');
});

test('统一各种连接号与短破折号', () => {
  assert.equal(normalizeSource('a\u2013b'), 'a\u2014b');
  assert.equal(normalizeSource('a\u2015b'), 'a\u2014b');
  assert.equal(normalizeSource('a\u2212b'), 'a\u2014b');
});

test('省略号统一成三个点', () => {
  assert.equal(normalizeSource('wait\u2026'), 'wait...');
});

test('整体转小写', () => {
  assert.equal(normalizeSource('CONSIDERATION'), 'consideration');
});

test('同一句子的不同排版得到相同哈希', async () => {
  const a = await hashSource('The  Offer  must be  definite.');
  const b = await hashSource('  the offer must be definite.  ');
  assert.equal(a, b);
});

test('引号风格不同的同一句得到相同哈希', async () => {
  const a = await hashSource('He said \u201Cyes\u201D.');
  const b = await hashSource('He said "yes".');
  assert.equal(a, b);
});

test('不同句子得到不同哈希', async () => {
  const a = await hashSource('The offer must be definite.');
  const b = await hashSource('The acceptance must be definite.');
  assert.notEqual(a, b);
});

test('哈希是 64 位十六进制', async () => {
  const hash = await hashSource('anything');
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test('collapseWhitespace 保留大小写', () => {
  assert.equal(collapseWhitespace('  The   Offer '), 'The Offer');
});
