import React, { useState, useMemo } from 'react';
import {
  Student, Role, Assignment, DailyCheck, ActivityCategory, ActivityCategoryConfig,
  DashboardLayout, paletteOf
} from '../types';
import { RoleIcon } from './RoleIcon';
import { formatKoreanDate, getTodayKey } from '../utils/storage';
import { getPeriodInfo, PERIOD_BADGE_CLASS } from '../utils/category';
import { soundFx } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  CheckCircle, RefreshCw, Search, Info, Sparkles, Trophy, LayoutGrid, List, Layers,
  ChevronDown, ChevronUp, CalendarClock, Check
} from 'lucide-react';

interface DashboardViewProps {
  students: Student[];
  roles: Role[];
  assignments: Assignment[];
  dailyStatus: DailyCheck;
  activeCategory: ActivityCategory;
  categoryConfig: ActivityCategoryConfig;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onToggleStatus: (studentId: string) => void;
  onResetToday: () => void;
  onOpenSop: (role: Role) => void;
}

type StatusFilter = 'all' | 'completed' | 'pending';

const LAYOUT_OPTIONS: { id: DashboardLayout; label: string; Icon: typeof LayoutGrid }[] = [
  { id: 'card', label: '카드', Icon: LayoutGrid },
  { id: 'list', label: '명단', Icon: List },
  { id: 'byRole', label: '역할별', Icon: Layers },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  roles,
  assignments,
  dailyStatus,
  activeCategory,
  categoryConfig,
  selectedDate,
  onDateChange,
  onToggleStatus,
  onResetToday,
  onOpenSop,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<DashboardLayout>('card');
  const [showDetail, setShowDetail] = useState(false);

  const todayKey = getTodayKey();
  const isToday = selectedDate === todayKey;
  const palette = paletteOf(categoryConfig.color);
  const period = getPeriodInfo(categoryConfig, selectedDate);

  // Filter roles relevant to activeCategory (or general fallback)
  const categoryRoles = useMemo(
    () => roles.filter((r) => !r.activityCategory || r.activityCategory === activeCategory),
    [roles, activeCategory]
  );
  const roleMap = useMemo(() => new Map(categoryRoles.map((r) => [r.id, r])), [categoryRoles]);

  // Build student assignment list for active category
  const cardData = useMemo(
    () =>
      students.map((student) => {
        const assign = assignments.find(
          (a) => a.studentId === student.id && (a.activityCategory === activeCategory || !a.activityCategory)
        );
        const role = assign ? roleMap.get(assign.roleId) || null : null;
        return { student, role, isDone: !!dailyStatus[student.id] };
      }),
    [students, assignments, activeCategory, roleMap, dailyStatus]
  );

  const totalCount = cardData.length;
  const completedCount = cardData.filter((c) => c.isDone).length;
  const ratio = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredCards = cardData.filter((item) => {
    if (statusFilter === 'completed' && !item.isDone) return false;
    if (statusFilter === 'pending' && item.isDone) return false;
    if (roleFilter === 'unassigned' && item.role) return false;
    if (roleFilter !== 'all' && roleFilter !== 'unassigned' && item.role?.id !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const stName = item.student.name.toLowerCase();
      const roleName = item.role?.title.toLowerCase() || '';
      if (!stName.includes(q) && !roleName.includes(q)) return false;
    }
    return true;
  });

  // 역할별 보기용 그룹핑 (배정된 학생이 없는 역할도 보여준다)
  const roleGroups = useMemo(() => {
    const groups = categoryRoles.map((role) => ({
      role,
      members: filteredCards.filter((c) => c.role?.id === role.id),
    }));
    const unassigned = filteredCards.filter((c) => !c.role);
    return { groups, unassigned };
  }, [categoryRoles, filteredCards]);

  const handleToggle = (studentId: string, currentDone: boolean) => {
    if (!currentDone) {
      soundFx.playSuccess();
      if (completedCount + 1 === totalCount && totalCount > 0) {
        soundFx.playFanfare();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    } else {
      soundFx.playClick();
    }
    onToggleStatus(studentId);
  };

  const filterButton = (mode: StatusFilter, label: string, activeClass: string) => (
    <button
      onClick={() => setStatusFilter(mode)}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
        statusFilter === mode ? activeClass : 'bg-slate-800 text-slate-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4 animate-pop">

      {/* ── 컴팩트 현황 바 ─────────────────────────────────────────── */}
      <div className="px-4 py-3 rounded-2xl glass-panel border border-slate-700/60 shadow-lg space-y-2.5">

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`p-1.5 rounded-xl border ${palette.badge}`}>
            <RoleIcon name={categoryConfig.icon} className="w-4 h-4" />
          </span>
          <h2 className="font-extrabold text-slate-100 text-base sm:text-lg truncate max-w-[46vw]">
            {categoryConfig.name}
          </h2>

          {isToday && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white">오늘</span>
          )}

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full border ${PERIOD_BADGE_CLASS[period.status]}`}
            title={period.rangeLabel ? `운영 기간 ${period.rangeLabel}` : '운영 기간이 지정되지 않았습니다'}
          >
            <CalendarClock className="w-3 h-3" />
            {period.rangeLabel ? `${period.rangeLabel} · ${period.label}` : period.label}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-slate-800 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="hidden lg:inline text-xs font-semibold text-slate-400">
              {formatKoreanDate(selectedDate)}
            </span>
            {!isToday && (
              <button
                onClick={() => onDateChange(todayKey)}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-bold border border-indigo-500/30 transition"
              >
                오늘
              </button>
            )}
            <button
              onClick={() => {
                soundFx.playClick();
                onResetToday();
              }}
              title="이 날짜의 완수 체크를 모두 지웁니다"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">초기화</span>
            </button>
            <button
              onClick={() => setShowDetail((v) => !v)}
              aria-expanded={showDetail}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition"
              title="활동 설명 보기"
            >
              {showDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 얇은 진행 바 + 인라인 수치 */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/70">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${
                ratio === 100 ? 'from-amber-400 via-emerald-400 to-indigo-400' : palette.bar
              }`}
              style={{ width: `${ratio}%` }}
            />
          </div>
          <div className="shrink-0 text-xs font-bold">
            <span className="text-white text-sm">{completedCount}</span>
            <span className="text-slate-400"> / {totalCount}명 ({ratio}%)</span>
          </div>
          {ratio === 100 && totalCount > 0 && (
            <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Trophy className="w-3 h-3" /> 완수!
            </span>
          )}
        </div>

        {showDetail && (
          <p className="text-xs text-slate-400 pt-1.5 border-t border-slate-800">
            {categoryConfig.description || '설명이 등록되지 않은 활동입니다.'}
            {period.rangeLabel && (
              <span className="block mt-1 text-slate-500">
                운영 기간: {categoryConfig.startDate || '제한 없음'} ~ {categoryConfig.endDate || '제한 없음'}
              </span>
            )}
          </p>
        )}
      </div>

      {/* 기간을 벗어난 날짜를 보고 있을 때의 안내 */}
      {!period.inPeriod && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 shrink-0" />
          <span>
            {period.status === 'upcoming'
              ? `이 활동은 ${categoryConfig.startDate}부터 시작합니다. 선택한 날짜는 운영 기간 이전입니다.`
              : `이 활동은 ${categoryConfig.endDate}에 종료되었습니다. 기록은 계속 남지만 운영 기간이 지났습니다.`}
          </span>
        </div>
      )}

      {/* ── 툴바: 보기 방식 + 필터 ────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">

        {/* 보기 방식 */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0">
          {LAYOUT_OPTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                soundFx.playClick();
                setLayout(id);
              }}
              aria-pressed={layout === id}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                layout === id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1">
          {filterButton('all', `전체 ${totalCount}`, 'bg-indigo-600 text-white shadow')}
          {filterButton('completed', `완수 ${completedCount}`, 'bg-emerald-600 text-white shadow')}
          {filterButton('pending', `미완수 ${totalCount - completedCount}`, 'bg-amber-600 text-white shadow')}

          {/* 역할 필터 */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-800 text-slate-100 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
          >
            <option value="all">모든 역할</option>
            {categoryRoles.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
            <option value="unassigned">미배정만</option>
          </select>

          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="학생 이름 또는 역할 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
          </div>

          {(statusFilter !== 'all' || roleFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setRoleFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1.5"
            >
              필터 해제
            </button>
          )}
        </div>
      </div>

      {/* ── 본문 ──────────────────────────────────────────────────── */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-3xl border border-slate-800">
          <p className="text-slate-400 font-medium text-sm">검색 조건에 맞는 학생이나 역할이 없습니다.</p>
        </div>
      ) : layout === 'card' ? (
        /* 카드 보기 — 기존보다 촘촘하게 */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredCards.map(({ student, role, isDone }) => (
            <div
              key={student.id}
              onClick={() => handleToggle(student.id, isDone)}
              className={`relative rounded-2xl p-3.5 border cursor-pointer select-none transition-all duration-200 group ${
                isDone
                  ? 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-500/30'
                  : 'glass-card border-slate-800 hover:border-indigo-500/50'
              }`}
            >
              <div className="flex items-start justify-between gap-1.5 mb-2">
                {role ? (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border truncate ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                  }`}>
                    <RoleIcon name={role.icon} className="w-3 h-3 shrink-0" />
                    <span className="truncate">{role.title}</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
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
                    className="p-0.5 rounded text-slate-500 hover:text-white transition shrink-0"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-500">{student.number}번</span>
                  <h3 className="text-lg font-black text-white truncate group-hover:text-indigo-200 transition">
                    {student.name}
                  </h3>
                </div>

                <div className={`flex items-center justify-center w-8 h-8 shrink-0 rounded-xl transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 group-hover:border-indigo-500 group-hover:text-indigo-400'
                }`}>
                  {isDone ? <CheckCircle className="w-5 h-5 stroke-[2.5]" /> : <Sparkles className="w-4 h-4" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : layout === 'list' ? (
        /* 명단 보기 — 한 화면에 최대한 많이 */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {filteredCards.map(({ student, role, isDone }) => (
            <div
              key={student.id}
              onClick={() => handleToggle(student.id, isDone)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer select-none transition ${
                isDone
                  ? 'bg-emerald-950/40 border-emerald-500/40'
                  : 'bg-slate-900/70 border-slate-800 hover:border-indigo-500/50'
              }`}
            >
              <div className={`flex items-center justify-center w-6 h-6 shrink-0 rounded-lg ${
                isDone ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-600 border border-slate-700'
              }`}>
                <Check className="w-4 h-4 stroke-[3]" />
              </div>

              <span className="text-[11px] font-bold text-slate-500 w-8 shrink-0">{student.number}번</span>
              <span className="font-bold text-slate-100 text-sm shrink-0">{student.name}</span>

              {role ? (
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-indigo-300 border border-slate-700 truncate max-w-[55%]">
                  <RoleIcon name={role.icon} className="w-3 h-3 shrink-0" />
                  <span className="truncate">{role.title}</span>
                </span>
              ) : (
                <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
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
                  className="p-0.5 rounded text-slate-500 hover:text-white transition shrink-0"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* 역할별 보기 — 누가 어떤 역할인지 한눈에 */
        <div className="space-y-3">
          {roleGroups.groups.map(({ role, members }) => {
            if (members.length === 0 && (roleFilter !== 'all' || statusFilter !== 'all' || searchQuery)) return null;
            const doneInGroup = members.filter((m) => m.isDone).length;
            return (
              <div key={role.id} className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-800/50 border-b border-slate-800">
                  <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <RoleIcon name={role.icon} className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-white text-sm">{role.title}</h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    {members.length}명 배정 · 정원 {role.count}명
                  </span>
                  <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                    members.length > 0 && doneInGroup === members.length
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    완수 {doneInGroup}/{members.length}
                  </span>
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onOpenSop(role);
                    }}
                    title="역할 수행 지침(SOP) 보기"
                    className="p-1 rounded text-slate-500 hover:text-white transition"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 flex flex-wrap gap-2">
                  {members.length > 0 ? (
                    members.map(({ student, isDone }) => (
                      <button
                        key={student.id}
                        onClick={() => handleToggle(student.id, isDone)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border transition ${
                          isDone
                            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-indigo-500'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-600" />}
                        <span className="text-[11px] text-slate-500 font-bold">{student.number}</span>
                        {student.name}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic px-1">배정된 학생 없음</span>
                  )}
                </div>
              </div>
            );
          })}

          {roleGroups.unassigned.length > 0 && (
            <div className="rounded-2xl bg-slate-900/70 border border-amber-500/20 overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
                <h3 className="font-bold text-amber-200 text-sm">미배정 학생</h3>
                <span className="text-[11px] font-bold text-amber-300/70">{roleGroups.unassigned.length}명</span>
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                {roleGroups.unassigned.map(({ student, isDone }) => (
                  <button
                    key={student.id}
                    onClick={() => handleToggle(student.id, isDone)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border transition ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-indigo-500'
                    }`}
                  >
                    <span className="text-[11px] text-slate-500 font-bold">{student.number}</span>
                    {student.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
