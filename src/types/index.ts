export type ActivityCategory = 'daily' | 'morning' | 'subject' | 'project' | 'custom';

export interface ActivityCategoryConfig {
  id: ActivityCategory;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const ACTIVITY_CATEGORIES: ActivityCategoryConfig[] = [
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
}

export type ViewMode = 'dashboard' | 'tv' | 'assignment' | 'stats' | 'settings';
