import { ActivityCategory, ActivityCategoryConfig, DEFAULT_ACTIVITY_CATEGORIES } from '../types';

/** 활동 기간 대비 특정 날짜의 상태 */
export type PeriodStatus = 'always' | 'upcoming' | 'active' | 'ended';

export interface PeriodInfo {
  status: PeriodStatus;
  /** 화면에 그대로 노출할 짧은 문구 */
  label: string;
  /** 기간이 지정된 경우 "3/2 ~ 7/20" 형태의 범위 문구 */
  rangeLabel: string | null;
  /** 시작/종료까지 남은 일수 (해당 없으면 null) */
  daysLeft: number | null;
  /** 이 날짜가 활동 기간 안에 있는지 (기간 미지정이면 true) */
  inPeriod: boolean;
}

const toDate = (key: string): Date => {
  const [y, m, d] = key.split('-').map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
};

const diffDays = (from: string, to: string): number =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86400000);

const shortDate = (key: string): string => {
  const [, m, d] = key.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
};

/**
 * 기준일(dateKey)이 해당 범주의 운영 기간 안에 있는지 계산한다.
 * 시작일/종료일이 모두 비어 있으면 '상시 운영'으로 본다.
 */
export const getPeriodInfo = (
  category: Pick<ActivityCategoryConfig, 'startDate' | 'endDate'> | undefined,
  dateKey: string
): PeriodInfo => {
  const start = category?.startDate?.trim() || '';
  const end = category?.endDate?.trim() || '';

  if (!start && !end) {
    return { status: 'always', label: '상시 운영', rangeLabel: null, daysLeft: null, inPeriod: true };
  }

  const rangeLabel = `${start ? shortDate(start) : '제한 없음'} ~ ${end ? shortDate(end) : '제한 없음'}`;

  if (start && dateKey < start) {
    const daysLeft = diffDays(dateKey, start);
    return {
      status: 'upcoming',
      label: daysLeft === 0 ? '오늘 시작' : `시작 D-${daysLeft}`,
      rangeLabel,
      daysLeft,
      inPeriod: false,
    };
  }

  if (end && dateKey > end) {
    const daysPast = diffDays(end, dateKey);
    return {
      status: 'ended',
      label: `종료 (${daysPast}일 지남)`,
      rangeLabel,
      daysLeft: null,
      inPeriod: false,
    };
  }

  const daysLeft = end ? diffDays(dateKey, end) : null;
  return {
    status: 'active',
    label: daysLeft === null ? '운영 중' : daysLeft === 0 ? '오늘 마지막 날' : `종료 D-${daysLeft}`,
    rangeLabel,
    daysLeft,
    inPeriod: true,
  };
};

/** 기간 상태별 배지 색상 */
export const PERIOD_BADGE_CLASS: Record<PeriodStatus, string> = {
  always: 'bg-slate-800 text-slate-400 border-slate-700',
  upcoming: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  ended: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
};

/** 목록에서 범주를 찾되, 없으면 첫 번째 범주로 안전하게 대체한다. */
export const findCategory = (
  categories: ActivityCategoryConfig[],
  id: ActivityCategory | undefined
): ActivityCategoryConfig =>
  categories.find((c) => c.id === id) ||
  categories[0] ||
  DEFAULT_ACTIVITY_CATEGORIES[0];

/** 역할이 속한 범주 id (구버전 데이터는 첫 범주로 간주) */
export const roleCategoryId = (
  activityCategory: ActivityCategory | undefined,
  fallback: ActivityCategory
): ActivityCategory => activityCategory || fallback;

export const makeCategoryId = (): string =>
  `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
