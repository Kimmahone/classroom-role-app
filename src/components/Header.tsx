import React from 'react';
import { ViewMode, ActivityCategory, ACTIVITY_CATEGORIES, FirebaseConfig, UserProfile } from '../types';
import { LayoutDashboard, Shuffle, BarChart3, Settings, Monitor, Volume2, VolumeX, Cloud, CloudOff, LogIn, LogOut } from 'lucide-react';
import { soundFx } from '../utils/sound';

interface HeaderProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeCategory: ActivityCategory;
  onCategoryChange: (category: ActivityCategory) => void;
  completedRatio: number;
  firebaseConfig: FirebaseConfig;
  userProfile: UserProfile | null;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
  onOpenFirebaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  soundEnabled,
  onToggleSound,
  activeCategory,
  onCategoryChange,
  completedRatio,
  firebaseConfig,
  userProfile,
  onLoginGoogle,
  onLogoutGoogle,
  onOpenFirebaseModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Cloud Status */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onModeChange('dashboard')}>
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-lg shadow-indigo-500/25">
              <span className="text-2xl">🏫</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">우리 반 역할 & 활동 현황판</h1>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {completedRatio}% 완수
                </span>
              </div>
              
              {/* Firebase Cloud status indicator */}
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFirebaseModal();
                  }}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition ${
                    firebaseConfig.enabled && firebaseConfig.apiKey
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                  title="Firebase 클라우드 연동 설정"
                >
                  {firebaseConfig.enabled && firebaseConfig.apiKey ? (
                    <>
                      <Cloud className="w-3 h-3 text-emerald-400" />
                      <span>Firebase 클라우드 켜짐</span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-3 h-3 text-slate-500" />
                      <span>로컬 전용 모드</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <nav className="hidden md:flex items-center gap-1 p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <button
              onClick={() => onModeChange('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
                currentMode === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              현황판
            </button>

            <button
              onClick={() => onModeChange('assignment')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
                currentMode === 'assignment'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              역할 배정
            </button>

            <button
              onClick={() => onModeChange('stats')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
                currentMode === 'stats'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              통계 및 이력
            </button>

            <button
              onClick={() => onModeChange('settings')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
                currentMode === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              교사 설정
            </button>
          </nav>

          {/* Action Tools: Sound, Google Auth & TV Mode Button */}
          <div className="flex items-center gap-2">
            
            {/* Google Authentication Button */}
            {userProfile ? (
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-800 border border-slate-700">
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt="Google Profile" className="w-7 h-7 rounded-full border border-indigo-400" />
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
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/70 transition"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            </button>

            {/* TV Mode */}
            <button
              onClick={() => {
                soundFx.playClick();
                onModeChange('tv');
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition"
            >
              <Monitor className="w-4 h-4" />
              <span>교실 TV 모드</span>
            </button>
          </div>

        </div>

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
