import { 
  Student, Role, Assignment, DailyStatusHistory, RoleHistoryRecord, RolePreset, FirebaseConfig, ActivityCategory 
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
};

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyAoNz7NrsNoeBCW1iB3ARUnNcpJFMxt5Vo",
  authDomain: "role-project-7de1a.firebaseapp.com",
  projectId: "role-project-7de1a",
  storageBucket: "role-project-7de1a.firebasestorage.app",
  messagingSenderId: "260637706782",
  appId: "1:260637706782:web:4554c036aa8fed80273c0f",
  classroomId: "my_classroom_1",
  enabled: true,
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

// LocalStorage Loaders & Savers
export const loadStudents = (): Student[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return data ? JSON.parse(data) : DEFAULT_STUDENTS;
  } catch {
    return DEFAULT_STUDENTS;
  }
};

export const saveStudents = (students: Student[]): void => {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
};

export const loadRoles = (): Role[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ROLES);
    return data ? JSON.parse(data) : DEFAULT_ROLES;
  } catch {
    return DEFAULT_ROLES;
  }
};

export const saveRoles = (roles: Role[]): void => {
  localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
};

export const loadAssignments = (): Assignment[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    if (data) return JSON.parse(data);

    const students = loadStudents();
    const roles = loadRoles();
    const initial: Assignment[] = [];

    let roleIdx = 0;
    students.forEach((st) => {
      if (roles.length > 0) {
        const role = roles[roleIdx % roles.length];
        initial.push({ studentId: st.id, roleId: role.id, activityCategory: role.activityCategory || 'daily' });
        roleIdx++;
      }
    });
    return initial;
  } catch {
    return [];
  }
};

export const saveAssignments = (assignments: Assignment[]): void => {
  localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
};

export const loadDailyStatus = (): DailyStatusHistory => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATUS);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const saveDailyStatus = (dailyStatus: DailyStatusHistory): void => {
  localStorage.setItem(STORAGE_KEYS.DAILY_STATUS, JSON.stringify(dailyStatus));
};

export const loadCustomPresets = (): RolePreset[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveCustomPresets = (presets: RolePreset[]): void => {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets));
};

export const loadFirebaseConfig = (): FirebaseConfig => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.apiKey) return parsed;
    }
    return DEFAULT_FIREBASE_CONFIG;
  } catch {
    return DEFAULT_FIREBASE_CONFIG;
  }
};

export const saveFirebaseConfig = (config: FirebaseConfig): void => {
  localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config));
};

export const loadActiveCategory = (): ActivityCategory => {
  try {
    const cat = localStorage.getItem(STORAGE_KEYS.ACTIVE_CATEGORY);
    return (cat as ActivityCategory) || 'daily';
  } catch {
    return 'daily';
  }
};

export const saveActiveCategory = (category: ActivityCategory): void => {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_CATEGORY, category);
};

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
export const exportDataToJson = (): string => {
  const exportPayload = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    students: loadStudents(),
    roles: loadRoles(),
    assignments: loadAssignments(),
    dailyStatus: loadDailyStatus(),
    customPresets: loadCustomPresets(),
    firebaseConfig: loadFirebaseConfig(),
  };
  return JSON.stringify(exportPayload, null, 2);
};

// Import database payload from JSON
export const importDataFromJson = (jsonStr: string): boolean => {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.students) saveStudents(parsed.students);
    if (parsed.roles) saveRoles(parsed.roles);
    if (parsed.assignments) saveAssignments(parsed.assignments);
    if (parsed.dailyStatus) saveDailyStatus(parsed.dailyStatus);
    if (parsed.customPresets) saveCustomPresets(parsed.customPresets);
    if (parsed.firebaseConfig) saveFirebaseConfig(parsed.firebaseConfig);
    return true;
  } catch (e) {
    console.error('Import JSON error:', e);
    return false;
  }
};
