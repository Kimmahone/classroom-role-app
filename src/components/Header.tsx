import React, { useEffect, useRef, useState } from 'react';
import {
  ViewMode, ActivityCategory, ActivityCategoryConfig, UserProfile, SyncState, Classroom, paletteOf
} from '../types';
import {
  LayoutDashboard, Shuffle, BarChart3, Settings, Monitor, Volume2, VolumeX,
  Cloud, CloudOff, CloudUpload, ShieldAlert, LogIn, LogOut, Menu, X,
  ChevronDown, Check, Plus, SlidersHorizontal, Sun, Moon
} from 'lucide-react';
import { soundFx } from '../utils/sound';
import { RoleIcon } from './RoleIcon';
import { getPeriodInfo } from '../utils/category';
import { AppPrefs, resolveIsDark } from '../utils/prefs';

interface HeaderProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  prefs: AppPrefs;
  onOpenTweaks: () => void;
  onToggleSound: () => void;
  classrooms: Classroom[];
  activeClassId: string;
  onSwitchClass: (classId: string) => void;
  onOpenClassManager: () => void;
  categories: ActivityCategoryConfig[];
  activeCategory: ActivityCategory;
  onCategoryChange: (category: ActivityCategory) => void;
  selectedDate: string;
  completedRatio: number;
  syncState: SyncState;
  syncError: string | null;
  userProfile: UserProfile | null;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
  onOpenFirebaseModal: () => void;
}

const NAV_ITEMS: { mode: ViewMode; label: string; Icon: typeof LayoutDashboard }[] = [
  { mode: 'dashboard', label: '현황판', Icon: LayoutDashboard },
  { mode: 'assignment', label: '역할 배정', Icon: Shuffle },
  { mode: 'stats', label: '통계 및 이력', Icon: BarChart3 },
  { mode: 'settings', label: '교사 설정', Icon: Settings },
];

const SYNC_DISPLAY: Record<SyncState, { label: string; Icon: typeof Cloud; className: string }> = {
  off: {
    label: '로컬 전용 모드',
    Icon: CloudOff,
    className: 'bg-elevated text-muted border-line-strong hover:text-ink',
  },
  'needs-login': {
    label: '로그인 필요 (미동기화)',
    Icon: ShieldAlert,
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
  },
  saving: {
    label: '클라우드 저장 중...',
    Icon: CloudUpload,
    className: 'bg-accent-soft/20 text-accent-text border-accent-soft/40',
  },
  idle: {
    label: '클라우드 동기화 켜짐',
    Icon: Cloud,
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30',
  },
  error: {
    label: '동기화 오류 — 눌러서 확인',
    Icon: ShieldAlert,
    className: 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  prefs,
  onOpenTweaks,
  onToggleSound,
  classrooms,
  activeClassId,
  onSwitchClass,
  onOpenClassManager,
  categories,
  activeCategory,
  onCategoryChange,
  selectedDate,
  completedRatio,
  syncState,
  syncError,
  userProfile,
  onLoginGoogle,
  onLogoutGoogle,
  onOpenFirebaseModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const classMenuRef = useRef<HTMLDivElement>(null);

  const sync = SYNC_DISPLAY[syncState];
  const SyncIcon = sync.Icon;
  const isDark = resolveIsDark(prefs.theme);

  const activeClass = classrooms.find((c) => c.id === activeClassId) || classrooms[0];
  const activePalette = paletteOf(activeClass?.color);

  // 바깥을 누르거나 ESC 를 누르면 학급 드롭다운을 닫는다.
  useEffect(() => {
    if (!classMenuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (classMenuRef.current && !classMenuRef.current.contains(e.target as Node)) setClassMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setClassMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [classMenuOpen]);

  const handleNavigate = (mode: ViewMode) => {
    soundFx.playClick();
    onModeChange(mode);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-line">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px] gap-3">

          {/* ── 학급 선택기 ─────────────────────────────────────── */}
          {/* flex-1 min-w-0 : 공간이 모자라면 내비게이션이 아니라 이쪽이 먼저 줄어든다 */}
          <div className="flex items-center gap-2 min-w-0 flex-1" ref={classMenuRef}>
            <div className="relative min-w-0">
              <button
                onClick={() => {
                  soundFx.playClick();
                  setClassMenuOpen((v) => !v);
                }}
                aria-haspopup="menu"
                aria-expanded={classMenuOpen}
                className="flex items-center gap-2.5 pl-2 pr-2.5 py-2 rounded-2xl bg-elevated hover:bg-hover border border-line-strong transition min-w-0 max-w-[62vw] sm:max-w-none"
              >
                <span className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center text-lg ${activePalette.badge}`}>
                  {activeClass?.emoji || '🏫'}
                </span>
                <span className="min-w-0 text-left">
                  <span className="flex items-center gap-1.5">
                    <span className="block text-sm sm:text-base font-extrabold text-ink truncate max-w-[38vw] sm:max-w-[220px]">
                      {activeClass?.name || '학급 없음'}
                    </span>
                    <ChevronDown className={`w-4 h-4 shrink-0 text-muted transition ${classMenuOpen ? 'rotate-180' : ''}`} />
                  </span>
                  <span className="hidden sm:block text-[11px] font-semibold text-muted truncate max-w-[220px]">
                    {activeClass?.term || '우리 반 역할 & 활동 현황판'}
                  </span>
                </span>
              </button>

              {classMenuOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-2 w-[280px] p-2 rounded-2xl bg-surface border border-line-strong shadow-2xl z-50 animate-pop"
                >
                  <p className="px-2.5 py-1.5 text-[11px] font-bold text-faint uppercase tracking-wide">
                    학급 전환 ({classrooms.length})
                  </p>
                  <div className="max-h-[50vh] overflow-y-auto space-y-1">
                    {classrooms.map((c) => {
                      const p = paletteOf(c.color);
                      const isActive = c.id === activeClassId;
                      return (
                        <button
                          key={c.id}
                          role="menuitem"
                          onClick={() => {
                            onSwitchClass(c.id);
                            setClassMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition ${
                            isActive ? 'bg-accent-soft/15 border border-accent-soft/40' : 'hover:bg-elevated border border-transparent'
                          }`}
                        >
                          <span className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center ${p.badge}`}>
                            {c.emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-ink truncate">{c.name}</span>
                            {c.term && <span className="block text-[11px] text-muted truncate">{c.term}</span>}
                          </span>
                          {isActive && <Check className="w-4 h-4 text-accent-text shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setClassMenuOpen(false);
                      onOpenClassManager();
                    }}
                    className="mt-1.5 w-full flex items-center gap-2 px-2.5 py-2.5 rounded-xl bg-elevated hover:bg-hover text-sm font-bold text-ink border border-line transition"
                  >
                    <Plus className="w-4 h-4 text-accent-text" /> 학급 추가 · 관리
                  </button>
                </div>
              )}
            </div>

            {/* 동기화 상태 — 좁은 화면에서는 아이콘만 남겨 내비게이션 자리를 뺏지 않는다 */}
            <button
              onClick={onOpenFirebaseModal}
              className={`hidden lg:inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold px-2 2xl:px-2.5 py-1.5 rounded-full border whitespace-nowrap transition ${sync.className}`}
              title={syncError || `${sync.label} — 눌러서 클라우드 설정 열기`}
              aria-label={sync.label}
            >
              <SyncIcon className={`w-3.5 h-3.5 shrink-0 ${syncState === 'saving' ? 'animate-pulse' : ''}`} />
              <span className="hidden 2xl:inline truncate max-w-[150px]">{sync.label}</span>
            </button>
          </div>

          {/* ── 데스크톱 내비게이션 ──────────────────────────────── */}
          {/* shrink-0 + whitespace-nowrap : 메뉴 이름이 절대 두 줄로 접히지 않게 한다 */}
          <nav className="hidden md:flex shrink-0 items-center gap-1 p-1.5 rounded-2xl bg-elevated border border-line">
            {NAV_ITEMS.map(({ mode, label, Icon }) => (
              <button
                key={mode}
                onClick={() => handleNavigate(mode)}
                aria-current={currentMode === mode ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-1.5 px-2.5 lg:px-3.5 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition ${
                  currentMode === mode
                    ? 'bg-accent text-white shadow-md shadow-accent/30'
                    : 'text-muted hover:text-ink hover:bg-hover'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          {/* ── 도구 ────────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            <span className="hidden 2xl:inline shrink-0 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
              {completedRatio}% 완수
            </span>

            {/* Google 로그인 */}
            {userProfile ? (
              <div className="hidden sm:flex shrink-0 items-center gap-2 p-1.5 rounded-2xl bg-elevated border border-line-strong">
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt="" className="w-7 h-7 rounded-full border border-accent-soft" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center font-bold text-xs text-white">
                    {userProfile.displayName ? userProfile.displayName[0] : 'G'}
                  </div>
                )}
                <span className="text-xs font-bold text-ink hidden 2xl:inline max-w-[90px] truncate">
                  {userProfile.displayName || '선생님'}
                </span>
                <button
                  onClick={onLogoutGoogle}
                  title="로그아웃"
                  aria-label="로그아웃"
                  className="p-1 rounded-lg text-muted hover:text-rose-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginGoogle}
                className="hidden sm:flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-hover text-ink font-bold text-xs border border-line-strong whitespace-nowrap transition"
                title="Google 계정으로 로그인"
              >
                <LogIn className="w-3.5 h-3.5 text-accent-text" />
                <span className="hidden 2xl:inline">구글 로그인</span>
              </button>
            )}

            {/* 화면 설정 (테마 아이콘이 현재 모드를 알려준다) */}
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenTweaks();
              }}
              title="화면 & 사용 환경 설정 (라이트/다크 모드)"
              aria-label="화면 설정 열기"
              className="relative shrink-0 p-2.5 rounded-xl bg-elevated text-muted hover:bg-hover hover:text-ink border border-line-strong transition"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center">
                {isDark ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
              </span>
            </button>

            {/* 효과음 켜기/끄기 */}
            <button
              onClick={() => {
                // 켜는 순간에는 소리로 확인시켜 준다(끌 때는 당연히 소리가 나면 안 된다).
                const next = !prefs.sound;
                soundFx.enabled = next;
                if (next) soundFx.playSuccess();
                onToggleSound();
              }}
              role="switch"
              aria-checked={prefs.sound}
              aria-label={prefs.sound ? '효과음 끄기' : '효과음 켜기'}
              title={prefs.sound ? '효과음 켜짐 — 눌러서 끄기' : '효과음 꺼짐 — 눌러서 켜기'}
              className="hidden sm:flex shrink-0 items-center p-2.5 rounded-xl bg-elevated hover:bg-hover border border-line-strong text-muted transition"
            >
              {prefs.sound ? <Volume2 className="w-5 h-5 text-accent-text" /> : <VolumeX className="w-5 h-5 text-faint" />}
            </button>

            {/* TV 모드 */}
            <button
              onClick={() => handleNavigate('tv')}
              title="교실 TV 모드로 크게 보기"
              aria-label="교실 TV 모드"
              className="hidden md:flex shrink-0 items-center gap-2 px-3 lg:px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 whitespace-nowrap transition"
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span className="hidden xl:inline">교실 TV 모드</span>
            </button>

            {/* 모바일 메뉴 */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2.5 rounded-xl bg-elevated text-ink border border-line-strong transition"
              aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* ── 모바일 패널 ────────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2 animate-pop">
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  onClick={() => handleNavigate(mode)}
                  aria-current={currentMode === mode ? 'page' : undefined}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-2xl border transition ${
                    currentMode === mode
                      ? 'bg-accent text-white border-accent-soft shadow-md shadow-accent/30'
                      : 'bg-elevated text-muted border-line hover:text-ink'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavigate('tv')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition"
              >
                <Monitor className="w-4 h-4" />
                <span>교실 TV 모드</span>
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenTweaks(); }}
                aria-label="화면 설정"
                className="p-3 rounded-2xl bg-elevated text-muted border border-line transition"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>

            {userProfile ? (
              <button
                onClick={onLogoutGoogle}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-elevated text-muted border border-line text-xs font-bold"
              >
                <LogOut className="w-4 h-4" /> {userProfile.displayName || '선생님'} 로그아웃
              </button>
            ) : (
              <button
                onClick={onLoginGoogle}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-elevated text-ink border border-line text-xs font-bold"
              >
                <LogIn className="w-4 h-4 text-accent-text" /> 구글 로그인
              </button>
            )}

            <button
              onClick={onOpenFirebaseModal}
              className={`w-full inline-flex items-center justify-center gap-1 text-[11px] font-semibold px-2 py-2 rounded-full border transition ${sync.className}`}
            >
              <SyncIcon className={`w-3 h-3 ${syncState === 'saving' ? 'animate-pulse' : ''}`} />
              {sync.label}
            </button>

            <div className="text-center text-[11px] font-bold text-emerald-300">
              오늘 완수율 {completedRatio}%
            </div>
          </div>
        )}

        {/* ── 활동 범주 퀵바 ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 py-2.5 border-t border-line overflow-x-auto">
          <span className="text-xs font-bold text-muted shrink-0 mr-1">🎯 활동 범주:</span>
          {categories.map((cat) => {
            const palette = paletteOf(cat.color);
            const period = getPeriodInfo(cat, selectedDate);
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  soundFx.playClick();
                  onCategoryChange(cat.id);
                }}
                aria-pressed={isActive}
                title={period.rangeLabel ? `운영 기간 ${period.rangeLabel} · ${period.label}` : '상시 운영'}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap border transition ${
                  isActive ? palette.activeChip : palette.chip
                } ${!period.inPeriod && !isActive ? 'opacity-50' : ''}`}
              >
                <RoleIcon name={cat.icon} className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
                {period.status !== 'always' && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      isActive ? 'bg-black/25 text-white' : 'bg-surface/70 text-muted'
                    }`}
                  >
                    {period.status === 'ended' ? '종료' : period.status === 'upcoming' ? '예정' : period.label}
                  </span>
                )}
              </button>
            );
          })}
          {categories.length === 0 && (
            <span className="text-xs text-faint">
              활동 범주가 없습니다. [교사 설정 → 활동 범주]에서 추가해 주세요.
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
