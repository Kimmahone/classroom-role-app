/**
 * 앱 환경설정(Tweak). 학급 데이터와 달리 "이 기기/이 브라우저"의 취향이므로
 * 클라우드로 동기화하지 않고 localStorage 에만 보관한다.
 */

export type ThemeMode = 'dark' | 'light' | 'system';
export type Density = 'roomy' | 'normal' | 'compact';

export interface AppPrefs {
  theme: ThemeMode;
  /** 강조색 프리셋 키 (index.css 의 html[data-accent] 와 1:1) */
  accent: string;
  /** 현황판 카드 밀도 */
  density: Density;
  /** 전체 글자 크기 배율 (0.9 ~ 1.3) */
  fontScale: number;
  sound: boolean;
  /** 완수 시 진동 (지원 기기에서만) */
  haptics: boolean;
  /** 전원 완수 시 컨페티 */
  confetti: boolean;
  /** 움직임 최소화 */
  animations: boolean;
  /** 카드에 번호 표시 */
  showNumbers: boolean;
  /** 카드에 프로필 이니셜 아바타 표시 */
  showAvatars: boolean;
}

export const ACCENT_OPTIONS: { id: string; label: string; swatch: string }[] = [
  { id: 'indigo', label: '인디고', swatch: '#4f46e5' },
  { id: 'emerald', label: '에메랄드', swatch: '#059669' },
  { id: 'rose', label: '로즈', swatch: '#e11d48' },
  { id: 'amber', label: '앰버', swatch: '#d97706' },
  { id: 'cyan', label: '시안', swatch: '#0891b2' },
  { id: 'purple', label: '퍼플', swatch: '#9333ea' },
];

export const DEFAULT_PREFS: AppPrefs = {
  theme: 'system',
  accent: 'indigo',
  density: 'normal',
  fontScale: 1,
  sound: true,
  haptics: true,
  confetti: true,
  animations: true,
  showNumbers: true,
  showAvatars: true,
};

const PREFS_KEY = 'classroom_role_prefs';

const clampScale = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return 1;
  return Math.min(1.3, Math.max(0.9, Math.round(n * 100) / 100));
};

export const loadPrefs = (): AppPrefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AppPrefs>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      theme: (['dark', 'light', 'system'] as const).includes(parsed.theme as ThemeMode)
        ? (parsed.theme as ThemeMode)
        : DEFAULT_PREFS.theme,
      accent: ACCENT_OPTIONS.some((a) => a.id === parsed.accent) ? parsed.accent! : DEFAULT_PREFS.accent,
      density: (['roomy', 'normal', 'compact'] as const).includes(parsed.density as Density)
        ? (parsed.density as Density)
        : DEFAULT_PREFS.density,
      fontScale: clampScale(parsed.fontScale ?? 1),
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

export const savePrefs = (prefs: AppPrefs): void => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* 저장 실패(시크릿 모드 등)해도 앱 동작에는 영향이 없다 */
  }
};

const prefersDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const resolveIsDark = (theme: ThemeMode): boolean =>
  theme === 'dark' || (theme === 'system' && prefersDark());

/** html 요소에 테마/강조색/배율/모션 설정을 반영한다. */
export const applyPrefs = (prefs: AppPrefs): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark = resolveIsDark(prefs.theme);

  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
  root.classList.toggle('no-motion', !prefs.animations);
  root.setAttribute('data-accent', prefs.accent);
  root.style.setProperty('--ui-scale', String(prefs.fontScale));
  root.style.colorScheme = dark ? 'dark' : 'light';
};

/**
 * 시스템 테마 변경 구독. theme === 'system' 일 때만 의미가 있다.
 * 반환값은 구독 해제 함수.
 */
export const watchSystemTheme = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};

/** 짧은 진동 피드백. 지원하지 않는 기기에서는 조용히 무시된다. */
export const vibrate = (pattern: number | number[]): void => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* noop */
  }
};

/** 밀도별 현황판 그리드 클래스 */
export const DENSITY_GRID: Record<Density, string> = {
  roomy: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  normal: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3',
  compact: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2',
};

export const DENSITY_LABEL: Record<Density, string> = {
  roomy: '넉넉하게',
  normal: '보통',
  compact: '촘촘하게',
};
