import {
  Student, Role, Assignment, DailyStatusHistory, RoleHistoryRecord, RolePreset, FirebaseConfig,
  ActivityCategory, ActivityCategoryConfig, DEFAULT_ACTIVITY_CATEGORIES, Classroom
} from '../types';

export const STORAGE_KEYS = {
  STUDENTS: 'classroom_role_students',
  ROLES: 'classroom_role_roles',
  ASSIGNMENTS: 'classroom_role_assignments',
  DAILY_STATUS: 'classroom_role_daily_status',
  HISTORY: 'classroom_role_history',
  CUSTOM_PRESETS: 'classroom_role_custom_presets',
  FIREBASE_CONFIG: 'classroom_role_firebase_config',
  ACTIVE_CATEGORY: 'classroom_role_active_category',
  CATEGORIES: 'classroom_role_categories',
  CLASSES: 'classroom_role_classes',
  ACTIVE_CLASS: 'classroom_role_active_class',
};

/**
 * v5: 학생·역할·배정·기록이 모두 학급(Classroom) 단위로 분리됐다.
 * 학급별 데이터는 `<기본키>::<학급id>` 형태로 저장한다.
 * (커스텀 템플릿과 Firebase 접속 정보는 교사 단위이므로 분리하지 않는다.)
 */
const scoped = (base: string, classId: string): string => `${base}::${classId}`;

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage 저장 실패:', e);
  }
};

/**
 * v1 -> v2: 비로그인 상태에서 모든 사용자가 공용 문서(classrooms/my_classroom_1)를
 * 공유하던 구조를 폐기하고, 반드시 Google 로그인 후 users/{uid}/classrooms/{id} 에만
 * 기록하도록 변경. v1 설정이 저장된 브라우저는 동기화가 자동으로 꺼진다.
 */
export const CURRENT_FIREBASE_CONFIG_VERSION = 2;

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyAoNz7NrsNoeBCW1iB3ARUnNcpJFMxt5Vo",
  authDomain: "role-project-7de1a.firebaseapp.com",
  projectId: "role-project-7de1a",
  storageBucket: "role-project-7de1a.firebasestorage.app",
  messagingSenderId: "260637706782",
  appId: "1:260637706782:web:4554c036aa8fed80273c0f",
  classroomId: "my_classroom_1",
  // 기본값은 로컬 전용. 교사가 직접 켜고 Google 로그인을 해야만 클라우드에 기록된다.
  enabled: false,
  configVersion: CURRENT_FIREBASE_CONFIG_VERSION,
};

// Built-in Primary School Presets
export const BUILTIN_ROLE_PRESETS: RolePreset[] = [
  {
    id: 'preset-standard',
    name: '🏫 초등 대표 1인 1역 세트 (15종)',
    description: '가장 광범위하게 활용되는 초등학교 기본 학급 1인 1역 세트입니다.',
    targetCount: '15~25명 학급 추천',
    activityCategory: 'daily',
    roles: [
      {
        title: '칠판 도우미',
        category: 'cleaning',
        activityCategory: 'daily',
        icon: 'Square',
        color: 'emerald',
        description: '쉬는 시간마다 칠판을 깔끔하게 지우고 분필 가루를 텁니다.',
        count: 2,
        sopSteps: ['쉬는 시간 종이 울리면 칠판 지우개로 지웁니다.', '칠판 지우개 클리너를 사용하여 분필 가루를 텁니다.']
      },
      {
        title: '환기 담당',
        category: 'environment',
        activityCategory: 'daily',
        icon: 'Wind',
        color: 'cyan',
        description: '2교시 후 중간 쉬는 시간과 점심시간에 창문을 열어 환기합니다.',
        count: 2,
        sopSteps: ['창문을 5cm 이상 엽니다.', '다음 교시 시작 전 창문을 닫습니다.']
      },
      {
        title: '우유 도우미',
        category: 'service',
        activityCategory: 'daily',
        icon: 'Milk',
        color: 'amber',
        description: '아침마다 급식실에서 학급 우유 바구니를 수령하고 정리합니다.',
        count: 2,
        sopSteps: ['급식실에서 우유 바구니를 가져옵니다.', '다 마신 빈 우유 곽을 정돈합니다.']
      },
      {
        title: '급식 도우미',
        category: 'service',
        activityCategory: 'daily',
        icon: 'Utensils',
        color: 'rose',
        description: '점심시간 식사 줄 정돈과 수저/식판 배부를 돕습니다.',
        count: 2,
        sopSteps: ['손을 깨끗이 씻고 수저를 배부합니다.', '식판 및 잔반 정리를 안내합니다.']
      },
      {
        title: '도서 & 학습지 도우미',
        category: 'learning',
        activityCategory: 'daily',
        icon: 'BookOpen',
        color: 'indigo',
        description: '학급 문고 책장 정돈과 수업 학습지 배부를 담당합니다.',
        count: 2,
        sopSteps: ['교실 뒤 책장 책을 정돈합니다.', '수업 시작 전 학습지를 배부합니다.']
      },
      {
        title: '분리수거 도우미',
        category: 'environment',
        activityCategory: 'daily',
        icon: 'Recycle',
        color: 'emerald',
        description: '종이, 플라스틱, 캔 등 재활용품 분리수거함을 관리합니다.',
        count: 2,
        sopSteps: ['분리수거함을 점검하고 금요일에 모아서 배출합니다.']
      },
      {
        title: '에너지 절약 도우미',
        category: 'environment',
        activityCategory: 'daily',
        icon: 'Zap',
        color: 'amber',
        description: '이동 수업 시 전등과 TV, 에어컨/히터를 끕니다.',
        count: 1,
        sopSteps: ['이동 수업 시 전등과 TV 전원을 끕니다.']
      },
      {
        title: 'ICT & TV 도우미',
        category: 'learning',
        activityCategory: 'daily',
        icon: 'Tv',
        color: 'blue',
        description: '수업용 TV 리모컨 보관 및 컴퓨터 전원을 관리합니다.',
        count: 1,
        sopSteps: ['수업 시작 전 TV를 켜고 컴퓨터 전원을 관리합니다.']
      },
      {
        title: '줄반장 & 이동 도우미',
        category: 'order',
        activityCategory: 'daily',
        icon: 'Users',
        color: 'purple',
        description: '급식실 및 이동 수업 시 학급 줄을 정돈하고 안내합니다.',
        count: 2,
        sopSteps: ['두 줄 서기를 안내하고 질서 있게 출발합니다.']
      }
    ]
  },
  {
    id: 'preset-subject-math',
    name: '📐 과목별 역할 (수학 탐구 수업용)',
    description: '수학 탐구 및 협동 학습 시 활용하는 교구, 기록, 계산, 발표 역할입니다.',
    targetCount: '수학 수업용 템플릿',
    activityCategory: 'subject',
    roles: [
      {
        title: '수학 교구 도우미',
        category: 'learning',
        activityCategory: 'subject',
        subjectName: '수학',
        icon: 'Square',
        color: 'indigo',
        description: '자, 자석, 입체도형 등 수학 교구를 모둠별로 배부하고 수거합니다.',
        count: 2,
        sopSteps: ['수학 탐구 시작 전 모둠 교구 상자를 배부합니다.', '수업 후 개수를 점검하고 반납합니다.']
      },
      {
        title: '수학 서기 (풀이 기록원)',
        category: 'learning',
        activityCategory: 'subject',
        subjectName: '수학',
        icon: 'BookOpen',
        color: 'cyan',
        description: '모둠 아이디어와 다양한 문제 풀이 과정을 화이트보드에 정돈하여 기록합니다.',
        count: 4,
        sopSteps: ['모둠원의 다양한 해결 방법을 깔끔하게 기록합니다.']
      },
      {
        title: '수학 발표 리더',
        category: 'service',
        activityCategory: 'subject',
        subjectName: '수학',
        icon: 'Crown',
        color: 'purple',
        description: '모둠에서 찾은 수학적 원리와 해결 전략을 학급 전체에 발표합니다.',
        count: 4,
        sopSteps: ['모둠의 풀이 과정을 자신감 있게 설명합니다.']
      }
    ]
  },
  {
    id: 'preset-project-team',
    name: '🚀 모둠 프로젝트 학습 역할 세트',
    description: '모둠별 탐구 프로젝트 진행 시 모둠원별 책임 직책 세트입니다.',
    targetCount: '4인 1모둠 표준 템플릿',
    activityCategory: 'project',
    roles: [
      {
        title: '모둠장 (프로젝트 리더)',
        category: 'order',
        activityCategory: 'project',
        icon: 'Crown',
        color: 'purple',
        description: '모둠 활동 방향을 안내하고 모둠원 모두가 골고루 참여하도록 이끕니다.',
        count: 6,
        sopSteps: ['모둠원의 의견을 경청하고 토의를 진행합니다.']
      },
      {
        title: '기록 및 자료 정리자 (서기)',
        category: 'learning',
        activityCategory: 'project',
        icon: 'BookOpen',
        color: 'indigo',
        description: '토의 내용, 아이디어, 조사 결과를 활동지에 정확하게 기록합니다.',
        count: 6,
        sopSteps: ['주요 결정 사항을 기록하고 정리합니다.']
      },
      {
        title: '시간 & 규칙 파수꾼 (타임키퍼)',
        category: 'order',
        activityCategory: 'project',
        icon: 'Zap',
        color: 'amber',
        description: '활동 제한 시간을 체크하고 모둠 규칙 준수를 독려합니다.',
        count: 6,
        sopSteps: ['남은 시간을 알려주고 집중하도록 돕습니다.']
      },
      {
        title: '발표 & 수거 담당 (크리에이터)',
        category: 'service',
        activityCategory: 'project',
        icon: 'Sparkles',
        color: 'rose',
        description: '결과물 발표를 준비하고 필요한 수구 준비물을 챙깁니다.',
        count: 6,
        sopSteps: ['모둠 발표 자료를 준비하고 결과물을 게시합니다.']
      }
    ]
  }
];

export const DEFAULT_STUDENTS: Student[] = [
  { id: 's1', number: 1, name: '강도윤' },
  { id: 's2', number: 2, name: '김민수' },
  { id: 's3', number: 3, name: '박서준' },
  { id: 's4', number: 4, name: '배성민' },
  { id: 's5', number: 5, name: '백채원' },
  { id: 's6', number: 6, name: '서준혁' },
  { id: 's7', number: 7, name: '송우진' },
  { id: 's8', number: 8, name: '신예은' },
  { id: 's9', number: 9, name: '윤서아' },
  { id: 's10', number: 10, name: '이하은' },
  { id: 's11', number: 11, name: '이지원' },
  { id: 's12', number: 12, name: '임지후' },
  { id: 's13', number: 13, name: '정태양' },
  { id: 's14', number: 14, name: '최유진' },
  { id: 's15', number: 15, name: '한소율' },
];

export const DEFAULT_ROLES: Role[] = BUILTIN_ROLE_PRESETS[0].roles.map((r, idx) => ({
  ...r,
  id: `r_${idx + 1}`
}));

// ── 학급 단위 로더 / 세이버 ──────────────────────────────────────────
export const loadStudents = (classId: string): Student[] =>
  readJson<Student[]>(scoped(STORAGE_KEYS.STUDENTS, classId), DEFAULT_STUDENTS);

export const saveStudents = (classId: string, students: Student[]): void =>
  writeJson(scoped(STORAGE_KEYS.STUDENTS, classId), students);

export const loadRoles = (classId: string): Role[] =>
  readJson<Role[]>(scoped(STORAGE_KEYS.ROLES, classId), DEFAULT_ROLES);

export const saveRoles = (classId: string, roles: Role[]): void =>
  writeJson(scoped(STORAGE_KEYS.ROLES, classId), roles);

export const loadAssignments = (classId: string): Assignment[] => {
  const stored = readJson<Assignment[] | null>(scoped(STORAGE_KEYS.ASSIGNMENTS, classId), null);
  if (stored) return stored;

  // 최초 진입 시에는 기본 명단/역할을 순서대로 이어 붙인 임시 배정을 보여준다.
  const students = loadStudents(classId);
  const roles = loadRoles(classId);
  if (roles.length === 0) return [];

  return students.map((st, idx) => {
    const role = roles[idx % roles.length];
    return { studentId: st.id, roleId: role.id, activityCategory: role.activityCategory || 'daily' };
  });
};

export const saveAssignments = (classId: string, assignments: Assignment[]): void =>
  writeJson(scoped(STORAGE_KEYS.ASSIGNMENTS, classId), assignments);

export const loadDailyStatus = (classId: string): DailyStatusHistory =>
  readJson<DailyStatusHistory>(scoped(STORAGE_KEYS.DAILY_STATUS, classId), {});

export const saveDailyStatus = (classId: string, dailyStatus: DailyStatusHistory): void =>
  writeJson(scoped(STORAGE_KEYS.DAILY_STATUS, classId), dailyStatus);

/** 커스텀 템플릿은 학급이 아니라 교사 단위로 공유된다. */
export const loadCustomPresets = (): RolePreset[] => {
  const parsed = readJson<RolePreset[]>(STORAGE_KEYS.CUSTOM_PRESETS, []);
  return Array.isArray(parsed) ? parsed : [];
};

export const saveCustomPresets = (presets: RolePreset[]): void => {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets));
};

export const loadFirebaseConfig = (): FirebaseConfig => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
    if (!data) return DEFAULT_FIREBASE_CONFIG;

    const parsed = JSON.parse(data) as Partial<FirebaseConfig>;
    if (!parsed.apiKey) return DEFAULT_FIREBASE_CONFIG;

    const merged: FirebaseConfig = { ...DEFAULT_FIREBASE_CONFIG, ...parsed };

    // 구버전 설정은 공용 문서를 바라보고 있었으므로 동기화를 끄고 재동의를 받는다.
    if ((parsed.configVersion || 1) < CURRENT_FIREBASE_CONFIG_VERSION) {
      merged.enabled = false;
      merged.configVersion = CURRENT_FIREBASE_CONFIG_VERSION;
      localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return DEFAULT_FIREBASE_CONFIG;
  }
};

/** 저장한 설정(스키마 버전이 찍힌 것)을 그대로 돌려주어 화면 상태와 어긋나지 않게 한다. */
export const saveFirebaseConfig = (config: FirebaseConfig): FirebaseConfig => {
  const stamped: FirebaseConfig = { ...config, configVersion: CURRENT_FIREBASE_CONFIG_VERSION };
  localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(stamped));
  return stamped;
};

// --- 역할 배정 이력 (RoleHistoryRecord) ---
// 같은 날짜 + 같은 활동 범주 + 같은 학생에 대해서는 한 건만 유지한다(재배정 시 덮어씀).
export const historyRecordKey = (r: Pick<RoleHistoryRecord, 'date' | 'activityCategory' | 'studentId'>): string =>
  `${r.date}|${r.activityCategory}|${r.studentId}`;

export const loadRoleHistory = (classId: string): RoleHistoryRecord[] => {
  const parsed = readJson<RoleHistoryRecord[]>(scoped(STORAGE_KEYS.HISTORY, classId), []);
  return Array.isArray(parsed) ? parsed : [];
};

export const saveRoleHistory = (classId: string, history: RoleHistoryRecord[]): void =>
  writeJson(scoped(STORAGE_KEYS.HISTORY, classId), history);

/** 기존 이력에 새 기록을 upsert 한 배열을 반환한다. */
export const mergeRoleHistory = (
  existing: RoleHistoryRecord[],
  incoming: RoleHistoryRecord[]
): RoleHistoryRecord[] => {
  if (incoming.length === 0) return existing;

  const byKey = new Map<string, RoleHistoryRecord>();
  existing.forEach((r) => byKey.set(historyRecordKey(r), r));
  incoming.forEach((r) => byKey.set(historyRecordKey(r), r));

  return Array.from(byKey.values()).sort((a, b) => a.date.localeCompare(b.date));
};

// --- 활동 범주 (교사가 직접 편집) ---
const isValidCategory = (v: unknown): v is ActivityCategoryConfig =>
  typeof v === 'object' && v !== null &&
  typeof (v as ActivityCategoryConfig).id === 'string' &&
  typeof (v as ActivityCategoryConfig).name === 'string';

export const normalizeCategories = (list: unknown): ActivityCategoryConfig[] => {
  if (!Array.isArray(list)) return DEFAULT_ACTIVITY_CATEGORIES;
  const valid = list.filter(isValidCategory).map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon || 'Sparkles',
    color: c.color || 'indigo',
    description: c.description || '',
    startDate: c.startDate || '',
    endDate: c.endDate || '',
  }));
  return valid.length > 0 ? valid : DEFAULT_ACTIVITY_CATEGORIES;
};

export const loadCategories = (classId: string): ActivityCategoryConfig[] => {
  const raw = localStorage.getItem(scoped(STORAGE_KEYS.CATEGORIES, classId));
  if (!raw) return DEFAULT_ACTIVITY_CATEGORIES;
  try {
    return normalizeCategories(JSON.parse(raw));
  } catch {
    return DEFAULT_ACTIVITY_CATEGORIES;
  }
};

export const saveCategories = (classId: string, categories: ActivityCategoryConfig[]): void =>
  writeJson(scoped(STORAGE_KEYS.CATEGORIES, classId), categories);

export const loadActiveCategory = (classId: string): ActivityCategory => {
  try {
    return (localStorage.getItem(scoped(STORAGE_KEYS.ACTIVE_CATEGORY, classId)) as ActivityCategory) || 'daily';
  } catch {
    return 'daily';
  }
};

export const saveActiveCategory = (classId: string, category: ActivityCategory): void => {
  try {
    localStorage.setItem(scoped(STORAGE_KEYS.ACTIVE_CATEGORY, classId), category);
  } catch {
    /* noop */
  }
};

// ══════════════════════════════════════════════════════════════════════
//  학급(Classroom) 목록 관리
// ══════════════════════════════════════════════════════════════════════

export const CLASSROOM_EMOJIS = ['🏫', '📚', '🎨', '🔬', '⚽️', '🎵', '🌱', '🚀', '🧩', '🐣', '🍀', '⭐️'];

export const makeClassroomId = (): string =>
  `cls_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const isValidClassroom = (v: unknown): v is Classroom =>
  typeof v === 'object' && v !== null &&
  typeof (v as Classroom).id === 'string' && (v as Classroom).id.length > 0 &&
  typeof (v as Classroom).name === 'string';

export const normalizeClassrooms = (list: unknown): Classroom[] => {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  return list.filter(isValidClassroom).reduce<Classroom[]>((acc, c) => {
    if (seen.has(c.id)) return acc;
    seen.add(c.id);
    acc.push({
      id: c.id,
      name: c.name || '이름 없는 학급',
      term: c.term || '',
      emoji: c.emoji || '🏫',
      color: c.color || 'indigo',
      createdAt: c.createdAt || new Date().toISOString(),
    });
    return acc;
  }, []);
};

export const saveClassrooms = (classrooms: Classroom[]): void =>
  writeJson(STORAGE_KEYS.CLASSES, classrooms);

/**
 * 학급 목록을 읽는다. 목록이 없으면 v4 이하의 단일 학급 데이터를
 * "기본 학급" 하나로 옮겨 담는 마이그레이션을 수행한다.
 *
 * 기본 학급 id 는 기존 firebaseConfig.classroomId 를 그대로 쓴다.
 * 그래야 이미 클라우드에 올라가 있는 users/{uid}/classrooms/{id} 문서를 계속 사용할 수 있다.
 */
export const loadClassrooms = (): Classroom[] => {
  const existing = normalizeClassrooms(readJson<unknown>(STORAGE_KEYS.CLASSES, null));
  if (existing.length > 0) return existing;

  const legacyId = loadFirebaseConfig().classroomId || 'my_classroom_1';
  const migrated: Classroom = {
    id: legacyId,
    name: '우리 반',
    term: '',
    emoji: '🏫',
    color: 'indigo',
    createdAt: new Date().toISOString(),
  };

  // 기존 전역 키에 있던 데이터를 학급 네임스페이스로 복사한다(원본은 되돌리기용으로 남겨둔다).
  const legacyKeys = [
    STORAGE_KEYS.STUDENTS,
    STORAGE_KEYS.ROLES,
    STORAGE_KEYS.ASSIGNMENTS,
    STORAGE_KEYS.DAILY_STATUS,
    STORAGE_KEYS.HISTORY,
    STORAGE_KEYS.CATEGORIES,
    STORAGE_KEYS.ACTIVE_CATEGORY,
  ];
  try {
    legacyKeys.forEach((base) => {
      const value = localStorage.getItem(base);
      const target = scoped(base, legacyId);
      if (value !== null && localStorage.getItem(target) === null) {
        localStorage.setItem(target, value);
      }
    });
  } catch (e) {
    console.warn('학급 마이그레이션 중 일부 데이터를 옮기지 못했습니다:', e);
  }

  saveClassrooms([migrated]);
  return [migrated];
};

export const loadActiveClassId = (classrooms: Classroom[]): string => {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLASS);
  } catch {
    stored = null;
  }
  if (stored && classrooms.some((c) => c.id === stored)) return stored;
  return classrooms[0]?.id ?? '';
};

export const saveActiveClassId = (classId: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CLASS, classId);
  } catch {
    /* noop */
  }
};

/** 학급 하나에 속한 로컬 데이터를 모두 지운다. */
export const purgeClassroomData = (classId: string): void => {
  const bases = [
    STORAGE_KEYS.STUDENTS,
    STORAGE_KEYS.ROLES,
    STORAGE_KEYS.ASSIGNMENTS,
    STORAGE_KEYS.DAILY_STATUS,
    STORAGE_KEYS.HISTORY,
    STORAGE_KEYS.CATEGORIES,
    STORAGE_KEYS.ACTIVE_CATEGORY,
  ];
  try {
    bases.forEach((base) => localStorage.removeItem(scoped(base, classId)));
  } catch {
    /* noop */
  }
};

/** 새 학급의 초기 데이터를 만든다. copyFromClassId 를 주면 범주/역할 구성을 복사한다. */
export const seedClassroomData = (classId: string, copyFromClassId?: string): void => {
  if (copyFromClassId) {
    const categories = loadCategories(copyFromClassId);
    const roles = loadRoles(copyFromClassId);
    saveCategories(classId, categories);
    saveRoles(classId, roles);
  } else {
    saveCategories(classId, DEFAULT_ACTIVITY_CATEGORIES);
    saveRoles(classId, []);
  }
  // 학생 명단과 기록은 절대 복사하지 않는다(다른 반 학생이 섞이면 안 된다).
  saveStudents(classId, []);
  saveAssignments(classId, []);
  saveDailyStatus(classId, {});
  saveRoleHistory(classId, []);
};

/** 학급 카드에 표시할 요약 수치 */
export const classroomSummary = (classId: string) => ({
  studentCount: loadStudents(classId).length,
  roleCount: loadRoles(classId).length,
  categoryCount: loadCategories(classId).length,
});

export const getTodayKey = (dateObj: Date = new Date()): string => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatKoreanDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const daysKR = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = daysKR[dateObj.getDay()];
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일 (${dayOfWeek})`;
};

// Export entire database payload to JSON
// firebaseConfig 는 접속 키를 포함하고, 복원 시 앱이 제3자 프로젝트를 바라보게 만들 수 있어
// 백업 대상에서 제외한다. (클라우드 설정은 설정 화면에서 직접 입력)
export const exportDataToJson = (classId: string, classroom?: Classroom): string => {
  const exportPayload = {
    version: '5.0',
    exportDate: new Date().toISOString(),
    classroom: classroom ? { ...classroom } : undefined,
    students: loadStudents(classId),
    roles: loadRoles(classId),
    assignments: loadAssignments(classId),
    dailyStatus: loadDailyStatus(classId),
    customPresets: loadCustomPresets(),
    roleHistory: loadRoleHistory(classId),
    categories: loadCategories(classId),
  };
  return JSON.stringify(exportPayload, null, 2);
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const validStudents = (v: unknown): v is Student[] =>
  Array.isArray(v) && v.every((s) => isObject(s) && typeof s.id === 'string' && typeof s.name === 'string');

const validRoles = (v: unknown): v is Role[] =>
  Array.isArray(v) && v.every((r) => isObject(r) && typeof r.id === 'string' && typeof r.title === 'string');

const validAssignments = (v: unknown): v is Assignment[] =>
  Array.isArray(v) && v.every((a) => isObject(a) && typeof a.studentId === 'string' && typeof a.roleId === 'string');

const validDailyStatus = (v: unknown): v is DailyStatusHistory =>
  isObject(v) && Object.values(v).every((day) => isObject(day));

const validPresets = (v: unknown): v is RolePreset[] =>
  Array.isArray(v) && v.every((p) => isObject(p) && typeof p.id === 'string' && Array.isArray(p.roles));

const validHistory = (v: unknown): v is RoleHistoryRecord[] =>
  Array.isArray(v) && v.every((r) => isObject(r) && typeof r.date === 'string' && typeof r.studentId === 'string');

const validCategories = (v: unknown): v is ActivityCategoryConfig[] =>
  Array.isArray(v) && v.length > 0 &&
  v.every((c) => isObject(c) && typeof c.id === 'string' && typeof c.name === 'string');

export interface ImportResult {
  success: boolean;
  message: string;
  imported: string[];
}

// Import database payload from JSON — 지정한 학급에 덮어쓴다.
export const importDataFromJson = (jsonStr: string, classId: string): ImportResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { success: false, message: 'JSON 형식이 올바르지 않습니다.', imported: [] };
  }

  if (!isObject(parsed)) {
    return { success: false, message: '백업 파일의 최상위 구조가 올바르지 않습니다.', imported: [] };
  }

  const imported: string[] = [];
  const rejected: string[] = [];

  const apply = <T,>(key: string, label: string, guard: (v: unknown) => v is T, save: (v: T) => void) => {
    const value = parsed[key];
    if (value === undefined) return;
    if (guard(value)) {
      save(value);
      imported.push(label);
    } else {
      rejected.push(label);
    }
  };

  apply('categories', '활동 범주', validCategories, (v) => saveCategories(classId, normalizeCategories(v)));
  apply('students', '학생 명단', validStudents, (v) => saveStudents(classId, v));
  apply('roles', '역할 목록', validRoles, (v) => saveRoles(classId, v));
  apply('assignments', '역할 배정', validAssignments, (v) => saveAssignments(classId, v));
  apply('dailyStatus', '일일 체크 기록', validDailyStatus, (v) => saveDailyStatus(classId, v));
  apply('customPresets', '커스텀 템플릿', validPresets, saveCustomPresets);
  apply('roleHistory', '역할 배정 이력', validHistory, (v) => saveRoleHistory(classId, v));

  if (imported.length === 0) {
    return {
      success: false,
      message: '복원할 수 있는 데이터를 찾지 못했습니다. 이 앱에서 내보낸 백업 파일인지 확인해 주세요.',
      imported: [],
    };
  }

  const warn = rejected.length > 0 ? ` (형식 오류로 건너뜀: ${rejected.join(', ')})` : '';
  return {
    success: true,
    message: `복원 완료: ${imported.join(', ')}${warn}`,
    imported,
  };
};
