/**
 * 활동 범주 ID. v4 부터는 교사가 직접 범주를 추가/삭제할 수 있으므로
 * 고정된 유니온이 아니라 자유 문자열이다. (기본 5종의 id 는 그대로 유지)
 */
export type ActivityCategory = string;

export interface ActivityCategoryConfig {
  id: ActivityCategory;
  name: string;
  icon: string;
  color: string;
  description: string;
  /** 활동 운영 시작일 (YYYY-MM-DD). 비우면 시작 제한 없음 */
  startDate?: string;
  /** 활동 운영 종료일 (YYYY-MM-DD). 비우면 종료 제한 없음 */
  endDate?: string;
}

/** 범주 색상 팔레트. Tailwind JIT 가 클래스를 못 지우도록 문자열을 통째로 보관한다. */
export interface CategoryPalette {
  label: string;
  /** 비활성 칩 */
  chip: string;
  /** 선택된 칩 */
  activeChip: string;
  /** 아이콘 배지 */
  badge: string;
  /** 진행 바 그라디언트 */
  bar: string;
  /** 텍스트 강조 */
  text: string;
  /** 색상 점(팔레트 선택 UI) */
  dot: string;
}

export const CATEGORY_PALETTES: Record<string, CategoryPalette> = {
  indigo: {
    label: '인디고',
    chip: 'bg-slate-800 text-indigo-200 border-slate-700 hover:bg-indigo-600/20',
    activeChip: 'bg-indigo-600 text-white border-indigo-400 shadow-md',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    bar: 'from-indigo-500 to-violet-400',
    text: 'text-indigo-300',
    dot: 'bg-indigo-500',
  },
  emerald: {
    label: '에메랄드',
    chip: 'bg-slate-800 text-emerald-200 border-slate-700 hover:bg-emerald-600/20',
    activeChip: 'bg-emerald-600 text-white border-emerald-400 shadow-md',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    bar: 'from-emerald-600 to-teal-400',
    text: 'text-emerald-300',
    dot: 'bg-emerald-500',
  },
  amber: {
    label: '앰버',
    chip: 'bg-slate-800 text-amber-200 border-slate-700 hover:bg-amber-600/20',
    activeChip: 'bg-amber-600 text-white border-amber-400 shadow-md',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    bar: 'from-amber-500 to-orange-400',
    text: 'text-amber-300',
    dot: 'bg-amber-500',
  },
  purple: {
    label: '퍼플',
    chip: 'bg-slate-800 text-purple-200 border-slate-700 hover:bg-purple-600/20',
    activeChip: 'bg-purple-600 text-white border-purple-400 shadow-md',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    bar: 'from-purple-500 to-fuchsia-400',
    text: 'text-purple-300',
    dot: 'bg-purple-500',
  },
  cyan: {
    label: '시안',
    chip: 'bg-slate-800 text-cyan-200 border-slate-700 hover:bg-cyan-600/20',
    activeChip: 'bg-cyan-600 text-white border-cyan-400 shadow-md',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    bar: 'from-cyan-500 to-sky-400',
    text: 'text-cyan-300',
    dot: 'bg-cyan-500',
  },
  rose: {
    label: '로즈',
    chip: 'bg-slate-800 text-rose-200 border-slate-700 hover:bg-rose-600/20',
    activeChip: 'bg-rose-600 text-white border-rose-400 shadow-md',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    bar: 'from-rose-500 to-pink-400',
    text: 'text-rose-300',
    dot: 'bg-rose-500',
  },
  blue: {
    label: '블루',
    chip: 'bg-slate-800 text-blue-200 border-slate-700 hover:bg-blue-600/20',
    activeChip: 'bg-blue-600 text-white border-blue-400 shadow-md',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    bar: 'from-blue-500 to-sky-400',
    text: 'text-blue-300',
    dot: 'bg-blue-500',
  },
  lime: {
    label: '라임',
    chip: 'bg-slate-800 text-lime-200 border-slate-700 hover:bg-lime-600/20',
    activeChip: 'bg-lime-600 text-white border-lime-400 shadow-md',
    badge: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
    bar: 'from-lime-500 to-emerald-400',
    text: 'text-lime-300',
    dot: 'bg-lime-500',
  },
};

export const DEFAULT_CATEGORY_PALETTE = CATEGORY_PALETTES.indigo;

export const paletteOf = (color?: string): CategoryPalette =>
  (color && CATEGORY_PALETTES[color]) || DEFAULT_CATEGORY_PALETTE;

/** 앱을 처음 켰을 때 제공되는 기본 활동 범주. 교사가 자유롭게 편집/삭제할 수 있다. */
export const DEFAULT_ACTIVITY_CATEGORIES: ActivityCategoryConfig[] = [
  {
    id: 'daily',
    name: '1인 1역 (학급 생활)',
    icon: 'Sparkles',
    color: 'emerald',
    description: '매일 지속적으로 학급 청소, 정돈, 서비스 등을 담당하는 1인 1역입니다.'
  },
  {
    id: 'morning',
    name: '아침 활동',
    icon: 'Sun',
    color: 'amber',
    description: '등교 직후, 아침 독서, 자율 학습 시간을 조화롭게 운영하는 역할입니다.'
  },
  {
    id: 'subject',
    name: '과목별 역할 (수업)',
    icon: 'BookOpen',
    color: 'indigo',
    description: '국어, 수학, 사회, 과학, 예체능 등 해당 과목 시간에 맞춰 할당되는 직책입니다.'
  },
  {
    id: 'project',
    name: '프로젝트 & 모둠 학습',
    icon: 'Rocket',
    color: 'purple',
    description: '모둠장, 서기, 발표자, 타임키퍼, 자료 수집가 등 모둠 프로젝트용 역할입니다.'
  },
  {
    id: 'custom',
    name: '기타 & 자율 활동',
    icon: 'Smile',
    color: 'cyan',
    description: '학급 행사, 동아리, 특별활동 등에 자유롭게 배정하는 역할입니다.'
  }
];

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface Student {
  id: string;
  number: number;
  name: string;
}

export interface Role {
  id: string;
  title: string;
  category: 'cleaning' | 'learning' | 'order' | 'environment' | 'service';
  activityCategory: ActivityCategory;
  subjectName?: string;
  icon: string;
  color: string;
  description: string;
  count: number;
  sopSteps?: string[];
}

export interface Assignment {
  studentId: string;
  roleId: string;
  activityCategory: ActivityCategory;
  locked?: boolean;
}

export type DailyCheck = Record<string, boolean>;

export type DailyStatusHistory = Record<string, Record<string, DailyCheck>>;

export interface RoleHistoryRecord {
  date: string;
  activityCategory: ActivityCategory;
  studentId: string;
  studentName: string;
  roleId: string;
  roleTitle: string;
}

export interface RolePreset {
  id: string;
  name: string;
  description: string;
  targetCount: string;
  activityCategory: ActivityCategory;
  roles: Omit<Role, 'id'>[];
  isCustom?: boolean;
  createdAt?: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  classroomId: string;
  enabled: boolean;
  /**
   * 저장된 설정의 스키마 버전. 이 값이 CURRENT_FIREBASE_CONFIG_VERSION 보다 낮으면
   * 과거의 공용 문서(classrooms/{id})를 바라보던 설정이므로 동기화를 강제로 끄고
   * 교사에게 다시 동의를 받는다.
   */
  configVersion?: number;
}

/** 클라우드 동기화의 현재 상태 (헤더/설정 화면 표시용) */
export type SyncState = 'off' | 'needs-login' | 'idle' | 'saving' | 'error';

export type ViewMode = 'dashboard' | 'tv' | 'assignment' | 'stats' | 'settings';

/** 현황판에서 명단을 보여주는 방식 */
export type DashboardLayout = 'card' | 'list' | 'byRole';
