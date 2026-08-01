import { DailyStatusHistory, ActivityCategory } from '../types';
import { getTodayKey } from './storage';

/** 이름을 안정적인 색상(HSL)으로 바꿔 학생마다 고유한 아바타 색을 준다. */
export const avatarStyle = (name: string): { backgroundColor: string; color: string } => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  const hue = hash;
  return {
    backgroundColor: `hsl(${hue} 65% 45%)`,
    color: '#fff',
  };
};

/** 이름의 첫 글자(한글은 1자, 영문은 2자) */
export const initialsOf = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (/[가-힣]/.test(trimmed[0])) return trimmed.slice(-2);
  return trimmed.slice(0, 2).toUpperCase();
};

/** 기준일에서 offset 일 만큼 이동한 날짜 키 */
export const shiftDateKey = (dateKey: string, offsetDays: number): string => {
  const [y, m, d] = dateKey.split('-').map((v) => parseInt(v, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + offsetDays);
  return getTodayKey(dt);
};

export interface DayTrendPoint {
  date: string;
  /** 0 ~ 100 */
  ratio: number;
  completed: number;
  total: number;
  weekday: string;
  isSelected: boolean;
  isFuture: boolean;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 선택한 날짜를 마지막으로 하는 최근 N일의 완수율 추이.
 * 학생 수는 '지금 명단' 기준이라 과거 비율은 참고용이다.
 */
export const buildTrend = (
  history: DailyStatusHistory,
  category: ActivityCategory,
  selectedDate: string,
  totalStudents: number,
  days = 7
): DayTrendPoint[] => {
  const today = getTodayKey();
  const points: DayTrendPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDateKey(selectedDate, -i);
    const checks = (history[date] || {})[category] || {};
    const completed = Object.values(checks).filter(Boolean).length;
    const [y, m, d] = date.split('-').map((v) => parseInt(v, 10));
    points.push({
      date,
      completed,
      total: totalStudents,
      ratio: totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0,
      weekday: WEEKDAYS[new Date(y, m - 1, d).getDay()],
      isSelected: date === selectedDate,
      isFuture: date > today,
    });
  }
  return points;
};

/**
 * 선택한 날짜를 기준으로 학생이 연속으로 완수한 일수.
 * (기록이 아예 없는 날은 연속이 끊긴 것으로 본다.)
 */
export const streakOf = (
  history: DailyStatusHistory,
  category: ActivityCategory,
  studentId: string,
  fromDate: string,
  maxLookback = 30
): number => {
  let streak = 0;
  for (let i = 0; i < maxLookback; i++) {
    const date = shiftDateKey(fromDate, -i);
    const done = ((history[date] || {})[category] || {})[studentId];
    if (!done) break;
    streak++;
  }
  return streak;
};
