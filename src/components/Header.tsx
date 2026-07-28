import React, { useState } from 'react';
import { ViewMode, ActivityCategory, ACTIVITY_CATEGORIES, UserProfile, SyncState } from '../types';
import {
  LayoutDashboard, Shuffle, BarChart3, Settings, Monitor, Volume2, VolumeX,
  Cloud, CloudOff, CloudUpload, ShieldAlert, LogIn, LogOut, Menu, X
} from 'lucide-react';
import { soundFx } from '../utils/sound';

interface HeaderProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeCategory: ActivityCategory;
  onCategoryChange: (category: ActivityCategory) => void;
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
    className: 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200',
  },
  'needs-login': {
    label: '로그인 필요 (미동기화)',
    Icon: ShieldAlert,
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
  },
  saving: {
    label: '클라우드 저장 중...',
    Icon: CloudUpload,
    className: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
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
  soundEnabled,
  onToggleSound,
  activeCategory,
  onCategoryChange,
  completedRatio,
  syncState,
  syncError,
  userProfile,
  onLoginGoogle,
  onLogoutGoogle,
  onOpenFirebaseModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sync = SYNC_DISPLAY[syncState];
  const SyncIcon = sync.Icon;

  const handleNavigate = (mode: ViewMode) => {
    soundFx.playClick();
    onModeChange(mode);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">

      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3">

          {/* Logo & Cloud Status */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => handleNavigate('dashboard')}
              className="flex items-center justify-center w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-lg shadow-indigo-500/25"
              aria-label="현황판으로 이동"
            >
              <span className="text-2xl">🏫</span>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-extrabold text-white tracking-tight truncate">
                  우리 반 역할 &amp; 활동 현황판
                </h1>
                <span className="hidden sm:inline px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {completedRatio}% 완수
                </span>
              </div>

              {/* Cloud sync status indicator */}
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  onClick={onOpenFirebaseModal}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border transition ${sync.className}`}
                  title={syncError || '클라우드 동기화 설정'}
                >
                  <SyncIcon className={`w-3 h-3 ${syncState === 'saving' ? 'animate-pulse' : ''}`} />
                  <span className="truncate max-w-[180px]">{sync.label}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            {NAV_ITEMS.map(({ mode, label, Icon }) => (
              <button
                key={mode}
                onClick={() => handleNavigate(mode)}
                aria-current={currentMode === mode ? 'page' : undefined}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
                  currentMode === mode
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* Action Tools */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Google Authentication */}
            {userProfile ? (
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-800 border border-slate-700">
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt="" className="w-7 h-7 rounded-full border border-indigo-400" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                    {userProfile.displayName ? userProfile.displayName[0] : 'G'}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-200 hidden lg:inline max-w-[100px] truncate">
                  {userProfile.displayName || '선생님'}
                </span>
                <button
                  onClick={onLogoutGoogle}
                  title="로그아웃"
                  aria-label="로그아웃"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginGoogle}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
                title="Google 계정으로 로그인"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">구글 로그인</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              title={soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'}
              aria-label={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
              aria-pressed={soundEnabled}
              className="hidden sm:block p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/70 transition"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            </button>

            {/* TV Mode (desktop) */}
            <button
              onClick={() => handleNavigate('tv')}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition"
            >
              <Monitor className="w-4 h-4" />
              <span>교실 TV 모드</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 transition"
              aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Panel */}
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
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
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
                onClick={onToggleSound}
                aria-label={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
                aria-pressed={soundEnabled}
                className="p-3 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 transition"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
              </button>
            </div>

            <div className="text-center text-[11px] font-bold text-emerald-300">
              오늘 완수율 {completedRatio}%
            </div>
          </div>
        )}

        {/* Activity Category Quick Bar */}
        <div className="flex items-center gap-2 py-3 border-t border-slate-800/80 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">🎯 활동 범주:</span>
          {ACTIVITY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                soundFx.playClick();
                onCategoryChange(cat.id);
              }}
              aria-pressed={activeCategory === cat.id}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
