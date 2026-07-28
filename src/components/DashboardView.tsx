import React, { useState } from 'react';
import { Student, Role, Assignment, DailyCheck, ActivityCategory, ACTIVITY_CATEGORIES } from '../types';
import { RoleIcon } from './RoleIcon';
import { formatKoreanDate, getTodayKey } from '../utils/storage';
import { soundFx } from '../utils/sound';
import confetti from 'canvas-confetti';
import { 
  CheckCircle, Calendar, RefreshCw, Filter, Search, Info, Sparkles, Trophy, Flame
} from 'lucide-react';

interface DashboardViewProps {
  students: Student[];
  roles: Role[];
  assignments: Assignment[];
  dailyStatus: DailyCheck;
  activeCategory: ActivityCategory;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onToggleStatus: (studentId: string) => void;
  onResetToday: () => void;
  onOpenSop: (role: Role) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  roles,
  assignments,
  dailyStatus,
  activeCategory,
  selectedDate,
  onDateChange,
  onToggleStatus,
  onResetToday,
  onOpenSop,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'completed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const todayKey = getTodayKey();
  const isToday = selectedDate === todayKey;

  const categoryConfig = ACTIVITY_CATEGORIES.find((c) => c.id === activeCategory) || ACTIVITY_CATEGORIES[0];

  // Filter roles relevant to activeCategory (or general fallback)
  const categoryRoles = roles.filter((r) => !r.activityCategory || r.activityCategory === activeCategory);
  const roleMap = new Map<string, Role>();
  categoryRoles.forEach((r) => roleMap.set(r.id, r));

  // Build student assignment list for active category
  const cardData = students.map((student) => {
    const assign = assignments.find(
      (a) => a.studentId === student.id && (a.activityCategory === activeCategory || !a.activityCategory)
    );
    const role = assign ? roleMap.get(assign.roleId) || null : null;
    const isDone = !!dailyStatus[student.id];
    return {
      student,
      role,
      isDone,
    };
  });

  const totalCount = cardData.length;
  const completedCount = cardData.filter((c) => c.isDone).length;
  const ratio = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredCards = cardData.filter((item) => {
    if (filterMode === 'completed' && !item.isDone) return false;
    if (filterMode === 'pending' && item.isDone) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const stName = item.student.name.toLowerCase();
      const roleName = item.role?.title.toLowerCase() || '';
      if (!stName.includes(q) && !roleName.includes(q)) return false;
    }
    return true;
  });

  const handleToggle = (studentId: string, currentDone: boolean) => {
    if (!currentDone) {
      soundFx.playSuccess();
      if (completedCount + 1 === totalCount && totalCount > 0) {
        soundFx.playFanfare();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    } else {
      soundFx.playClick();
    }
    onToggleStatus(studentId);
  };

  return (
    <div className="space-y-8 animate-pop">
      
      {/* Active Category Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel relative overflow-hidden shadow-2xl border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Calendar className="w-5 h-5" />
              </span>
              <span className="text-sm font-semibold text-indigo-300">
                🎯 {categoryConfig.name} 현황판
              </span>
              {isToday && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-600 text-white animate-pulse">
                  오늘
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-slate-800 text-white font-bold text-lg px-4 py-2 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xl font-bold text-slate-200">
                {formatKoreanDate(selectedDate)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">{categoryConfig.description}</p>
          </div>

          <div className="flex items-center gap-3">
            {!isToday && (
              <button
                onClick={() => onDateChange(todayKey)}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-sm font-semibold transition border border-indigo-500/30"
              >
                오늘 날짜로 이동
              </button>
            )}
            <button
              onClick={() => {
                soundFx.playClick();
                onResetToday();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>체크 초기화</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className={`w-6 h-6 ${ratio === 100 ? 'text-amber-400 animate-bounce' : 'text-emerald-400'}`} />
              <span className="font-extrabold text-slate-100 text-lg">
                [{categoryConfig.name}] 완수 온도계
              </span>
              {ratio === 100 && (
                <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Trophy className="w-3.5 h-3.5" /> 100% 미션 완수!
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white">{completedCount}</span>
              <span className="text-slate-400 font-bold text-lg"> / {totalCount}명 ({ratio}%)</span>
            </div>
          </div>

          <div className="relative w-full h-5 rounded-full bg-slate-800/90 overflow-hidden border border-slate-700 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden ${
                ratio === 100
                  ? 'bg-gradient-to-r from-amber-500 via-emerald-500 to-indigo-500'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-400'
              }`}
              style={{ width: `${ratio}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-400 text-xs font-bold flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> 필터:
          </span>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            전체 ({totalCount})
          </button>
          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
              filterMode === 'completed'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            완수 ({completedCount})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
              filterMode === 'pending'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            미완수 ({totalCount - completedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="학생 이름 또는 역할 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 text-slate-100 text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredCards.map(({ student, role, isDone }) => (
            <div
              key={student.id}
              onClick={() => handleToggle(student.id, isDone)}
              className={`relative rounded-3xl p-5 border cursor-pointer select-none transition-all duration-300 group ${
                isDone
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                  : 'glass-card border-slate-800 hover:border-indigo-500/50 hover:shadow-xl'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                {role ? (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl border ${
                    isDone 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                  }`}>
                    <RoleIcon name={role.icon} className="w-3.5 h-3.5" />
                    <span>{role.title}</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                    미배정
                  </span>
                )}

                {role && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFx.playClick();
                      onOpenSop(role);
                    }}
                    title="역할 수행 지침(SOP) 보기"
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between my-2">
                <div>
                  <span className="text-xs font-bold text-slate-500">{student.number}번</span>
                  <h3 className="text-2xl font-black text-white group-hover:text-indigo-200 transition">
                    {student.name}
                  </h3>
                </div>

                <div className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500 text-slate-950 font-bold scale-110 shadow-lg shadow-emerald-500/40'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 group-hover:border-indigo-500 group-hover:text-indigo-400'
                }`}>
                  {isDone ? <CheckCircle className="w-6 h-6 stroke-[2.5]" /> : <Sparkles className="w-5 h-5" />}
                </div>
              </div>

              <p className={`text-xs mt-3 line-clamp-2 ${isDone ? 'text-emerald-300/80 font-medium' : 'text-slate-400'}`}>
                {role ? role.description : '이 활동 범주에 배정된 역할이 없습니다.'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-800/30 rounded-3xl border border-slate-800">
          <p className="text-slate-400 font-medium text-sm">검색 조건에 맞는 학생이나 역할이 없습니다.</p>
        </div>
      )}

    </div>
  );
};
