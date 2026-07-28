import { Role, Student, RoleHistoryRecord, ActivityCategory } from '../types';

/** 배열을 섞어 새 배열로 반환 (Fisher-Yates) */
export const shuffled = <T,>(input: T[]): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * 역할별 정원(count)을 존중하는 자리(slot) 목록을 만든다.
 * 1) 모든 역할에 최소 1자리를 먼저 배분해 "아무도 안 맡는 역할"을 없앤다.
 * 2) 남는 자리는 각 역할의 정원까지 라운드로빈으로 채운다.
 * 3) 그래도 학생 수가 더 많으면 정원을 넘겨 균등하게 덧붙인다.
 */
export const buildRoleSlots = (categoryRoles: Role[], studentCount: number): string[] => {
  if (categoryRoles.length === 0 || studentCount <= 0) return [];

  const slots: string[] = [];
  const remaining = new Map(categoryRoles.map((r) => [r.id, Math.max(1, r.count || 1)]));

  for (const role of categoryRoles) {
    if (slots.length >= studentCount) break;
    slots.push(role.id);
    remaining.set(role.id, (remaining.get(role.id) || 1) - 1);
  }

  let filledThisPass = true;
  while (slots.length < studentCount && filledThisPass) {
    filledThisPass = false;
    for (const role of categoryRoles) {
      if (slots.length >= studentCount) break;
      const left = remaining.get(role.id) || 0;
      if (left > 0) {
        slots.push(role.id);
        remaining.set(role.id, left - 1);
        filledThisPass = true;
      }
    }
  }

  let padIdx = 0;
  while (slots.length < studentCount) {
    slots.push(categoryRoles[padIdx % categoryRoles.length].id);
    padIdx++;
  }

  return slots;
};

export interface FairnessIndex {
  /** `${studentId}|${roleId}` -> 누적 수행 횟수 */
  timesHeld: Map<string, number>;
  /** `${studentId}|${roleId}` -> 가장 최근 회차 순번 (0 = 직전 회차) */
  recencyRank: Map<string, number>;
  /** 이 범주에서 기록된 배정 회차 수 */
  sessionCount: number;
}

export const buildFairnessIndex = (
  roleHistory: RoleHistoryRecord[],
  activityCategory: ActivityCategory
): FairnessIndex => {
  const relevant = roleHistory.filter((r) => r.activityCategory === activityCategory);

  // 최근 배정일 순서 (0 = 가장 최근 회차)
  const sessions = Array.from(new Set(relevant.map((r) => r.date))).sort().reverse();
  const sessionIndex = new Map(sessions.map((d, i) => [d, i]));

  const timesHeld = new Map<string, number>();
  const recencyRank = new Map<string, number>();

  relevant.forEach((r) => {
    const key = `${r.studentId}|${r.roleId}`;
    timesHeld.set(key, (timesHeld.get(key) || 0) + 1);
    const rank = sessionIndex.get(r.date) ?? Number.MAX_SAFE_INTEGER;
    const prev = recencyRank.get(key);
    if (prev === undefined || rank < prev) recencyRank.set(key, rank);
  });

  return { timesHeld, recencyRank, sessionCount: sessions.length };
};

/** 낮을수록 좋은 배정. 많이 맡았거나 최근에 맡은 역할일수록 점수가 높아진다. */
export const penaltyFor = (index: FairnessIndex, studentId: string, roleId: string): number => {
  const key = `${studentId}|${roleId}`;
  const times = index.timesHeld.get(key) || 0;
  const rank = index.recencyRank.get(key);

  let recencyPenalty = 0;
  if (rank === 0) recencyPenalty = 60;
  else if (rank === 1) recencyPenalty = 30;
  else if (rank === 2) recencyPenalty = 12;

  return times * 10 + recencyPenalty;
};

/**
 * 학생을 무작위 순서로 돌면서, 각자에게 penalty 가 가장 낮은 자리를 배정한다.
 * fair=false 이면 순수 무작위 배정으로 동작한다.
 */
export const assignSlotsFairly = (
  targetStudents: Student[],
  slots: string[],
  index: FairnessIndex,
  fair: boolean
): Map<string, string> => {
  const pool = [...slots];
  const result = new Map<string, string>();

  shuffled(targetStudents).forEach((student) => {
    if (pool.length === 0) return;

    let bestIdx = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    // 동점일 때 항상 같은 역할이 뽑히지 않도록 후보 순서를 섞어서 탐색한다.
    for (const i of shuffled(pool.map((_, idx) => idx))) {
      const score = fair ? penaltyFor(index, student.id, pool[i]) : 0;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    result.set(student.id, pool[bestIdx]);
    pool.splice(bestIdx, 1);
  });

  return result;
};
