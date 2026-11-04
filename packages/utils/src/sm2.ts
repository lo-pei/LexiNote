/**
 * SM-2 间隔重复排期（纯函数，不碰数据库）。
 *
 * 放在 utils 而不是 server 模块里，是为了能脱离数据库直接单测：
 * 排期算错不会报错，只会让所有学生的复习计划一起「越来越不准」，
 * 是那种上线时无人察觉、两周后被学生投诉的错误。
 */

/** 四档自评映射到 SM-2 的 quality：0 忘了 / 1 眼熟 / 2 记得 / 3 很熟 */
export const SM2_QUALITY = [2, 3, 4, 5] as const;

/** 间隔上限：一学期只有十几周，推到 180 天之外等于本学期再也见不到这个词 */
export const SM2_MAX_INTERVAL = 180;

/** ease 下限：低于 1.3 间隔几乎不再增长，复习会退化成机械重复 */
export const SM2_MIN_EASE = 1.3;

export interface Sm2State {
  /** 当前间隔（天） */
  intervalDays: number;
  /** 难度系数 1.3–2.8 上下 */
  ease: number;
  /** 连续答对次数 */
  reps: number;
  /** 累计遗忘次数 */
  lapses: number;
}

/**
 * 推进一步。
 *
 * 与标准 SM-2 一致：第一次答对间隔 1 天，第二次 6 天，之后按 ease 递推；
 * 答错则间隔归零重来。ease 始终按 quality 调整——包括答错时，
 * 因为「忘过一次」说明这个词本身更难，不该在重置后当作从未见过。
 */
export function nextSm2(state: Sm2State, grade: 0 | 1 | 2 | 3): Sm2State {
  const q = SM2_QUALITY[grade] ?? 3;
  let { intervalDays: interval, ease, reps, lapses } = state;

  if (q < 3) {
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ease);
  }

  ease = Math.max(SM2_MIN_EASE, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  interval = Math.min(Math.max(1, interval), SM2_MAX_INTERVAL);

  return { intervalDays: interval, ease, reps, lapses };
}
