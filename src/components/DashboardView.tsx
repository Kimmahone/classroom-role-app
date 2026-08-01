import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Student, Role, Assignment, DailyCheck, DailyStatusHistory, ActivityCategory, ActivityCategoryConfig,
  DashboardLayout, Classroom, paletteOf
} from '../types';
import { RoleIcon } from './RoleIcon';
import { ProgressRing } from './ProgressRing';
import { formatKoreanDate, getTodayKey } from '../utils/storage';
import { getPeriodInfo, PERIOD_BADGE_CLASS } from '../utils/category';
import { avatarStyle, initialsOf, buildTrend, streakOf, shiftDateKey } from '../utils/visual';
import { AppPrefs, DENSITY_GRID, vibrate } from '../utils/prefs';
import { soundFx } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  CheckCircle, RefreshCw, Search, Info, Trophy, LayoutGrid, List, Layers, Grid3x3,
  ChevronDown, ChevronUp, CalendarClock, Check, Flame, ChevronLeft, ChevronRight,
  CheckCheck, Undo2, Users
} from 'lucide-react';

interface DashboardViewProps {
  students: Student[];
  roles: Role[];
  assignments: Assignment[];
  dailyStatus: DailyCheck;
  dailyStatusHistory: DailyStatusHistory;
  activeCategory: ActivityCategory;
  categoryConfig: ActivityCategoryConfig;
  classroom?: Classroom;
  selectedDate: string;
  prefs: AppPrefs;
  onDateChange: (date: string) => void;
  onToggleStatus: (studentId: string) => void;
  onSetManyStatus: (studentIds: string[], done: boolean) => void;
  onResetToday: () => void;
  onOpenSop: (role: Role) => void;
}

type StatusFilter = 'all' | 'completed' | 'pending';
/** 좌석표(seat)를 추가해 4가지 보기 방식 */
type Layout = DashboardLayout | 'seat';

const LAYOUT_OPTIONS: { id: Layout; label: string; Icon: typeof LayoutGrid }[] = [
  { id: 'card', label: '카드', Icon: LayoutGrid },
  { id: 'seat', label: '좌석표', Icon: Grid3x3 },
  { id: 'list', label: '명단', Icon: List },
  { id: 'byRole', label: '역할별', Icon: Layers },
];

interface TapFx { x: number; y: number; key: number }

/**
 * 탭한 지점에서 번지는 물결.
 * 모듈 최상위에 두어야 부모가 리렌더될 때 다른 카드의 물결이 다시 재생되지 않는다.
 */
const Ripple: React.FC<{ fx?: TapFx; enabled: boolean }> = ({ fx, enabled }) => {
  if (!fx || !enabled) return null;
  return (
    <span
      key={fx.key}
      className="tap-ripple animate-ripple"
      style={{ left: fx.x, top: fx.y }}
      aria-hidden="true"
    />
  );
};

/** 이름 첫 글자로 만든 색 동그라미 */
const Avatar: React.FC<{ name: string; done: boolean; size?: string }> = ({
  name,
  done,
  size = 'w-9 h-9 text-xs',
}) => (
  <span
    className={`${size} shrink-0 rounded-full flex items-center justify-center font-black tracking-tight transition ${
      done ? 'ring-2 ring-emerald-400' : ''
    }`}
    style={avatarStyle(name)}
    aria-hidden="true"
  >
    {initialsOf(name)}
  </span>
);

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  roles,
  assignments,
  dailyStatus,
  dailyStatusHistory,
  activeCategory,
  categoryConfig,
  classroom,
  selectedDate,
  prefs,
  onDateChange,
  onToggleStatus,
  onSetManyStatus,
  onResetToday,
  onOpenSop,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<Layout>('card');
  const [showDetail, setShowDetail] = useState(false);
  const [tapFx, setTapFx] = useState<Record<string, TapFx>>({});
  /** 되돌리기 스낵바 (일괄 변경 직후에만 뜬다) */
  const [undoBar, setUndoBar] = useState<{ ids: string[]; prevDone: boolean; label: string } | null>(null);
  const undoTimer = useRef<number | null>(null);

  const todayKey = getTodayKey();
  const isToday = selectedDate === todayKey;
  const palette = paletteOf(categoryConfig.color);
  const period = getPeriodInfo(categoryConfig, selectedDate);

  const categoryRoles = useMemo(
    () => roles.filter((r) => !r.activityCategory || r.activityCategory === activeCategory),
    [roles, activeCategory]
  );
  const roleMap = useMemo(() => new Map(categoryRoles.map((r) => [r.id, r])), [categoryRoles]);

  const cardData = useMemo(
    () =>
      students.map((student) => {
        const assign = assignments.find(
          (a) => a.studentId === student.id && (a.activityCategory === activeCategory || !a.activityCategory)
        );
        const role = assign ? roleMap.get(assign.roleId) || null : null;
        const isDone = !!dailyStatus[student.id];
        return {
          student,
          role,
          isDone,
          streak: isDone ? streakOf(dailyStatusHistory, activeCategory, student.id, selectedDate) : 0,
        };
      }),
    [students, assignments, activeCategory, roleMap, dailyStatus, dailyStatusHistory, selectedDate]
  );

  const totalCount = cardData.length;
  const completedCount = cardData.filter((c) => c.isDone).length;
  const ratio = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const trend = useMemo(
    () => buildTrend(dailyStatusHistory, activeCategory, selectedDate, totalCount, 7),
    [dailyStatusHistory, activeCategory, selectedDate, totalCount]
  );

  const filteredCards = useMemo(
    () =>
      cardData.filter((item) => {
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
      }),
    [cardData, statusFilter, roleFilter, searchQuery]
  );

  // 역할별 진행 요약 (상단 스트립용 — 필터와 무관하게 전체 기준)
  const roleProgress = useMemo(
    () =>
      categoryRoles.map((role) => {
        const members = cardData.filter((c) => c.role?.id === role.id);
        return { role, done: members.filter((m) => m.isDone).length, total: members.length };
      }),
    [categoryRoles, cardData]
  );

  const roleGroups = useMemo(() => {
    const groups = categoryRoles.map((role) => ({
      role,
      members: filteredCards.filter((c) => c.role?.id === role.id),
    }));
    const unassigned = filteredCards.filter((c) => !c.role);
    return { groups, unassigned };
  }, [categoryRoles, filteredCards]);

  useEffect(() => () => {
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
  }, []);

  /** 카드 안에서 누른 지점에 물결과 색종이를 터뜨린다. */
  const burst = useCallback(
    (e: React.MouseEvent, studentId: string, willBeDone: boolean) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
      const y = e.clientY ? e.clientY - rect.top : rect.height / 2;

      setTapFx((prev) => ({ ...prev, [studentId]: { x, y, key: Date.now() } }));

      if (willBeDone && prefs.confetti && prefs.animations) {
        confetti({
          particleCount: 18,
          spread: 45,
          startVelocity: 22,
          scalar: 0.7,
          ticks: 60,
          origin: {
            x: (rect.left + x) / window.innerWidth,
            y: (rect.top + y) / window.innerHeight,
          },
        });
      }
    },
    [prefs.confetti, prefs.animations]
  );

  const handleToggle = (e: React.MouseEvent, studentId: string, currentDone: boolean) => {
    const willBeDone = !currentDone;
    burst(e, studentId, willBeDone);

    if (willBeDone) {
      soundFx.playSuccess();
      if (prefs.haptics) vibrate(18);
      if (completedCount + 1 === totalCount && totalCount > 0) {
        soundFx.playFanfare();
        if (prefs.haptics) vibrate([25, 60, 25, 60, 45]);
        if (prefs.confetti && prefs.animations) {
          confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
        }
      }
    } else {
      soundFx.playClick();
      if (prefs.haptics) vibrate(10);
    }
    onToggleStatus(studentId);
  };

  /** 화면에 보이는 학생 전체를 한 번에 완수 처리하고 되돌리기를 제공한다. */
  const handleBulk = (done: boolean) => {
    const ids = filteredCards.filter((c) => c.isDone !== done).map((c) => c.student.id);
    if (ids.length === 0) return;

    soundFx.playSuccess();
    if (prefs.haptics) vibrate(20);
    onSetManyStatus(ids, done);

    if (done && ids.length + completedCount === totalCount && prefs.confetti && prefs.animations) {
      soundFx.playFanfare();
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    }

    setUndoBar({
      ids,
      prevDone: !done,
      label: done ? `${ids.length}명을 완수로 표시했습니다` : `${ids.length}명의 완수를 취소했습니다`,
    });
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndoBar(null), 6000);
  };

  const handleUndo = () => {
    if (!undoBar) return;
    soundFx.playClick();
    onSetManyStatus(undoBar.ids, undoBar.prevDone);
    setUndoBar(null);
  };

  const filterButton = (mode: StatusFilter, label: string, activeClass: string) => (
    <button
      onClick={() => setStatusFilter(mode)}
      aria-pressed={statusFilter === mode}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
        statusFilter === mode ? activeClass : 'bg-elevated text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  const pendingCount = totalCount - completedCount;

  return (
    <div className="space-y-4 animate-pop pb-20">

      {/* ══ 히어로: 링 게이지 + 날짜 + 7일 추이 ═══════════════════════ */}
      <div className="p-4 sm:p-5 rounded-3xl glass-panel border border-line-strong shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">

          {/* 링 게이지 */}
          <div className="flex items-center gap-4 shrink-0">
            <ProgressRing value={ratio} size={124} stroke={11} celebrate={ratio === 100 && totalCount > 0}>
              <span className={`text-3xl font-black tabular-nums ${ratio === 100 ? 'text-amber-300' : 'text-ink'}`}>
                {ratio}
                <span className="text-base font-bold text-muted">%</span>
              </span>
              <span className="mt-0.5 text-[11px] font-bold text-muted tabular-nums">
                {completedCount} / {totalCount}명
              </span>
            </ProgressRing>

            <div className="min-w-0 space-y-1.5">
              {classroom && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted">
                  {classroom.emoji} {classroom.name}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-xl border shrink-0 ${palette.badge}`}>
                  <RoleIcon name={categoryConfig.icon} className="w-4 h-4" />
                </span>
                <h2 className="font-extrabold text-ink text-lg sm:text-xl truncate">{categoryConfig.name}</h2>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {isToday && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent text-white">오늘</span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full border ${PERIOD_BADGE_CLASS[period.status]}`}
                  title={period.rangeLabel ? `운영 기간 ${period.rangeLabel}` : '운영 기간이 지정되지 않았습니다'}
                >
                  <CalendarClock className="w-3 h-3" />
                  {period.rangeLabel ? `${period.rangeLabel} · ${period.label}` : period.label}
                </span>
                {ratio === 100 && totalCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Trophy className="w-3 h-3" /> 전원 완수!
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowDetail((v) => !v)}
                aria-expanded={showDetail}
                className="flex items-center gap-1 text-[11px] font-bold text-muted hover:text-ink transition"
              >
                활동 설명 {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* 7일 추이 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-muted">최근 7일 완수 추이 · 막대를 누르면 그 날로 이동</span>
              <span className="text-[11px] font-bold text-faint hidden sm:inline">{formatKoreanDate(selectedDate)}</span>
            </div>
            <div className="flex items-end gap-1.5 h-[86px]">
              {trend.map((pt) => (
                <button
                  key={pt.date}
                  onClick={() => {
                    soundFx.playClick();
                    onDateChange(pt.date);
                  }}
                  title={`${pt.date} · ${pt.completed}/${pt.total}명 (${pt.ratio}%)`}
                  className="group flex-1 flex flex-col items-center justify-end gap-1 h-full"
                >
                  <span className={`text-[10px] font-bold tabular-nums ${pt.isSelected ? 'text-accent-text' : 'text-faint'}`}>
                    {pt.ratio}
                  </span>
                  <span
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      pt.isFuture
                        ? 'bg-line'
                        : pt.ratio === 100
                          ? 'bg-gradient-to-t from-amber-500 to-emerald-400'
                          : pt.isSelected
                            ? 'bg-accent'
                            : 'bg-line-strong group-hover:bg-accent-soft'
                    }`}
                    style={{ height: `${Math.max(pt.ratio, 3)}%` }}
                  />
                  <span className={`text-[10px] font-bold ${pt.isSelected ? 'text-ink' : 'text-faint'}`}>
                    {pt.weekday}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 날짜 이동 & 초기화 */}
          <div className="flex flex-row lg:flex-col items-stretch gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-elevated border border-line">
              <button
                onClick={() => onDateChange(shiftDateKey(selectedDate, -1))}
                aria-label="이전 날짜"
                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-hover transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                aria-label="날짜 선택"
                className="bg-transparent text-ink font-bold text-xs px-1 py-1 focus:outline-none"
              />
              <button
                onClick={() => onDateChange(shiftDateKey(selectedDate, 1))}
                aria-label="다음 날짜"
                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-hover transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!isToday && (
                <button
                  onClick={() => onDateChange(todayKey)}
                  className="flex-1 px-3 py-2 rounded-xl bg-accent/25 hover:bg-accent/40 text-accent-text text-xs font-bold border border-accent-soft/40 transition"
                >
                  오늘로
                </button>
              )}
              <button
                onClick={() => {
                  soundFx.playClick();
                  if (confirm(`${formatKoreanDate(selectedDate)}의 [${categoryConfig.name}] 완수 체크를 모두 지웁니다.\n계속하시겠습니까?`)) {
                    onResetToday();
                  }
                }}
                title="이 날짜의 완수 체크를 모두 지웁니다"
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-elevated hover:bg-hover text-muted text-xs font-bold border border-line transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                초기화
              </button>
            </div>
          </div>
        </div>

        {showDetail && (
          <p className="text-xs text-muted pt-3 mt-3 border-t border-line">
            {categoryConfig.description || '설명이 등록되지 않은 활동입니다.'}
            {period.rangeLabel && (
              <span className="block mt-1 text-faint">
                운영 기간: {categoryConfig.startDate || '제한 없음'} ~ {categoryConfig.endDate || '제한 없음'}
              </span>
            )}
          </p>
        )}
      </div>

      {/* 기간 밖 안내 */}
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

      {/* ══ 역할별 진행 스트립 ═══════════════════════════════════════ */}
      {roleProgress.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {roleProgress.map(({ role, done, total }) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isFiltered = roleFilter === role.id;
            return (
              <button
                key={role.id}
                onClick={() => {
                  soundFx.playClick();
                  setRoleFilter(isFiltered ? 'all' : role.id);
                }}
                aria-pressed={isFiltered}
                className={`shrink-0 w-[164px] p-3 rounded-2xl border text-left transition ${
                  isFiltered
                    ? 'bg-accent-soft/15 border-accent-soft'
                    : 'bg-surface border-line hover:border-line-strong'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-accent-soft/10 text-accent-text border border-accent-soft/20 shrink-0">
                    <RoleIcon name={role.icon} className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-bold text-ink truncate flex-1">{role.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${
                        pct === 100 && total > 0 ? 'from-amber-400 to-emerald-400' : palette.bar
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold tabular-nums ${
                    total > 0 && done === total ? 'text-emerald-300' : 'text-muted'
                  }`}>
                    {done}/{total}
                  </span>
                </div>
                <span className="block mt-1 text-[10px] font-bold text-faint">정원 {role.count}명</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ══ 툴바 ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-elevated/50 p-3 rounded-2xl border border-line">

        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-line shrink-0">
          {LAYOUT_OPTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                soundFx.playClick();
                setLayout(id);
              }}
              aria-pressed={layout === id}
              title={`${label} 보기`}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                layout === id ? 'bg-accent text-white shadow' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1">
          {filterButton('all', `전체 ${totalCount}`, 'bg-accent text-white shadow')}
          {filterButton('completed', `완수 ${completedCount}`, 'bg-emerald-600 text-white shadow')}
          {filterButton('pending', `미완수 ${pendingCount}`, 'bg-amber-600 text-white shadow')}

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="역할로 거르기"
            className="bg-elevated text-ink text-xs font-bold px-3 py-1.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-accent max-w-[190px]"
          >
            <option value="all">모든 역할</option>
            {categoryRoles.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
            <option value="unassigned">미배정만</option>
          </select>

          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-muted" />
            <input
              type="text"
              placeholder="학생 이름 또는 역할 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-elevated text-ink text-xs pl-8 pr-3 py-1.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-accent placeholder-faint"
            />
          </div>

          {(statusFilter !== 'all' || roleFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setRoleFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-muted hover:text-ink px-2 py-1.5"
            >
              필터 해제
            </button>
          )}
        </div>

        <button
          onClick={() => handleBulk(true)}
          disabled={filteredCards.length === 0 || filteredCards.every((c) => c.isDone)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-bold shadow transition shrink-0"
          title="지금 화면에 보이는 학생을 모두 완수 처리합니다"
        >
          <CheckCheck className="w-4 h-4" /> 보이는 학생 모두 완수
        </button>
      </div>

      {/* ══ 본문 ═══════════════════════════════════════════════════ */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-16 bg-elevated/30 rounded-3xl border border-line">
          <Users className="w-10 h-10 mx-auto mb-3 text-faint" />
          <p className="text-muted font-medium text-sm">
            {students.length === 0
              ? '아직 학생이 없습니다. [교사 설정 → 학생 명단]에서 명단을 등록해 주세요.'
              : '검색 조건에 맞는 학생이나 역할이 없습니다.'}
          </p>
        </div>
      ) : layout === 'card' ? (
        /* ── 카드 보기 ─────────────────────────────────────── */
        <div className={`grid ${DENSITY_GRID[prefs.density]}`}>
          {filteredCards.map(({ student, role, isDone, streak }) => (
            <button
              key={student.id}
              onClick={(e) => handleToggle(e, student.id, isDone)}
              aria-pressed={isDone}
              className={`relative overflow-hidden text-left rounded-2xl p-3.5 border select-none transition-all duration-200 group active:scale-[0.97] ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30 fill-sweep'
                  : 'glass-card border-line hover:border-accent-soft/50'
              }`}
            >
              <Ripple fx={tapFx[student.id]} enabled={prefs.animations} />

              <div className="flex items-start justify-between gap-1.5 mb-2 relative">
                {role ? (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border truncate ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-accent-soft/10 text-accent-text border-accent-soft/20'
                  }`}>
                    <RoleIcon name={role.icon} className="w-3 h-3 shrink-0" />
                    <span className="truncate">{role.title}</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    미배정
                  </span>
                )}

                {role && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFx.playClick();
                      onOpenSop(role);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onOpenSop(role);
                      }
                    }}
                    title="역할 수행 지침(SOP) 보기"
                    className="p-0.5 rounded text-faint hover:text-ink transition shrink-0 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 relative">
                <div className="flex items-center gap-2 min-w-0">
                  {prefs.showAvatars && <Avatar name={student.name} done={isDone} />}
                  <div className="min-w-0">
                    {prefs.showNumbers && (
                      <span className="text-[10px] font-bold text-faint">{student.number}번</span>
                    )}
                    <h3 className="text-base sm:text-lg font-black text-ink truncate">{student.name}</h3>
                  </div>
                </div>

                <div className={`flex items-center justify-center w-9 h-9 shrink-0 rounded-xl transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-stamp'
                    : 'bg-elevated text-faint border-2 border-dashed border-line-strong group-hover:border-accent-soft group-hover:text-accent-text'
                }`}>
                  {isDone ? <CheckCircle className="w-5 h-5 stroke-[2.5]" /> : <Check className="w-4 h-4" />}
                </div>
              </div>

              {streak > 1 && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40">
                  <Flame className="w-2.5 h-2.5" />{streak}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : layout === 'seat' ? (
        /* ── 좌석표 보기: 교실 TV·태블릿에서 크게 누르기 좋은 정사각 타일 ── */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
          {filteredCards.map(({ student, role, isDone, streak }) => (
            <button
              key={student.id}
              onClick={(e) => handleToggle(e, student.id, isDone)}
              aria-pressed={isDone}
              className={`relative overflow-hidden aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 p-2 select-none transition-all duration-200 active:scale-95 ${
                isDone
                  ? 'bg-emerald-500/15 border-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-surface border-line hover:border-accent-soft'
              }`}
            >
              <Ripple fx={tapFx[student.id]} enabled={prefs.animations} />

              {prefs.showAvatars ? (
                <Avatar name={student.name} done={isDone} size="w-11 h-11 text-sm" />
              ) : (
                <span className={`w-11 h-11 rounded-full flex items-center justify-center ${
                  isDone ? 'bg-emerald-500 text-white' : 'bg-elevated text-faint border border-line-strong'
                }`}>
                  {isDone ? <Check className="w-6 h-6 stroke-[3]" /> : <span className="text-lg font-black">{student.number}</span>}
                </span>
              )}

              <span className="text-sm font-black text-ink truncate max-w-full leading-tight">{student.name}</span>
              {role && (
                <span className="text-[10px] font-bold text-muted truncate max-w-full leading-tight">
                  {role.title}
                </span>
              )}

              {isDone && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-stamp">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
              {streak > 1 && (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 text-[10px] font-black px-1 py-0.5 rounded-full bg-amber-500/25 text-amber-300">
                  <Flame className="w-2.5 h-2.5" />{streak}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : layout === 'list' ? (
        /* ── 명단 보기 ─────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {filteredCards.map(({ student, role, isDone, streak }) => (
            <button
              key={student.id}
              onClick={(e) => handleToggle(e, student.id, isDone)}
              aria-pressed={isDone}
              className={`relative overflow-hidden w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border select-none transition active:scale-[0.98] ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-surface border-line hover:border-accent-soft/50'
              }`}
            >
              <Ripple fx={tapFx[student.id]} enabled={prefs.animations} />

              <span className={`flex items-center justify-center w-7 h-7 shrink-0 rounded-lg transition ${
                isDone ? 'bg-emerald-500 text-white animate-stamp' : 'bg-elevated text-faint border-2 border-dashed border-line-strong'
              }`}>
                <Check className="w-4 h-4 stroke-[3]" />
              </span>

              {prefs.showNumbers && (
                <span className="text-[11px] font-bold text-faint w-8 shrink-0">{student.number}번</span>
              )}
              <span className="font-bold text-ink text-sm shrink-0">{student.name}</span>

              {streak > 1 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 shrink-0">
                  <Flame className="w-2.5 h-2.5" />{streak}
                </span>
              )}

              {role ? (
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-elevated text-accent-text border border-line-strong truncate max-w-[50%]">
                  <RoleIcon name={role.icon} className="w-3 h-3 shrink-0" />
                  <span className="truncate">{role.title}</span>
                </span>
              ) : (
                <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  미배정
                </span>
              )}

              {role && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    soundFx.playClick();
                    onOpenSop(role);
                  }}
                  title="역할 수행 지침(SOP) 보기"
                  className="p-0.5 rounded text-faint hover:text-ink transition shrink-0 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        /* ── 역할별 보기 ───────────────────────────────────── */
        <div className="space-y-3">
          {roleGroups.groups.map(({ role, members }) => {
            if (members.length === 0 && (roleFilter !== 'all' || statusFilter !== 'all' || searchQuery)) return null;
            const doneInGroup = members.filter((m) => m.isDone).length;
            const pct = members.length > 0 ? Math.round((doneInGroup / members.length) * 100) : 0;
            return (
              <div key={role.id} className="rounded-2xl bg-surface border border-line overflow-hidden">
                <div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 bg-elevated/60 border-b border-line">
                  <span className="p-1.5 rounded-lg bg-accent-soft/10 text-accent-text border border-accent-soft/20">
                    <RoleIcon name={role.icon} className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-ink text-sm">{role.title}</h3>
                  <span className="text-[11px] font-bold text-muted">
                    {members.length}명 배정 · 정원 {role.count}명
                  </span>

                  <div className="hidden sm:block flex-1 min-w-[80px] max-w-[200px] h-1.5 rounded-full bg-line overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${
                        pct === 100 && members.length > 0 ? 'from-amber-400 to-emerald-400' : palette.bar
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                    members.length > 0 && doneInGroup === members.length
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-elevated text-muted'
                  }`}>
                    완수 {doneInGroup}/{members.length}
                  </span>
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onOpenSop(role);
                    }}
                    title="역할 수행 지침(SOP) 보기"
                    className="p-1 rounded text-faint hover:text-ink transition"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 flex flex-wrap gap-2">
                  {members.length > 0 ? (
                    members.map(({ student, isDone, streak }) => (
                      <button
                        key={student.id}
                        onClick={(e) => handleToggle(e, student.id, isDone)}
                        aria-pressed={isDone}
                        className={`relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition active:scale-95 ${
                          isDone
                            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                            : 'bg-elevated text-ink border-line-strong hover:border-accent-soft'
                        }`}
                      >
                        <Ripple fx={tapFx[student.id]} enabled={prefs.animations} />
                        {isDone
                          ? <Check className="w-3.5 h-3.5 stroke-[3] animate-stamp" />
                          : <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-line-strong" />}
                        {prefs.showNumbers && <span className="text-[11px] text-faint font-bold">{student.number}</span>}
                        {student.name}
                        {streak > 1 && (
                          <span className="inline-flex items-center text-[10px] font-black text-amber-300">
                            <Flame className="w-2.5 h-2.5" />{streak}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-faint italic px-1">배정된 학생 없음</span>
                  )}
                </div>
              </div>
            );
          })}

          {roleGroups.unassigned.length > 0 && (
            <div className="rounded-2xl bg-surface border border-amber-500/20 overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
                <h3 className="font-bold text-amber-200 text-sm">미배정 학생</h3>
                <span className="text-[11px] font-bold text-amber-300/70">{roleGroups.unassigned.length}명</span>
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                {roleGroups.unassigned.map(({ student, isDone }) => (
                  <button
                    key={student.id}
                    onClick={(e) => handleToggle(e, student.id, isDone)}
                    aria-pressed={isDone}
                    className={`relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition active:scale-95 ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                        : 'bg-elevated text-muted border-line-strong hover:border-accent-soft'
                    }`}
                  >
                    <Ripple fx={tapFx[student.id]} enabled={prefs.animations} />
                    {prefs.showNumbers && <span className="text-[11px] text-faint font-bold">{student.number}</span>}
                    {student.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ 되돌리기 스낵바 ═══════════════════════════════════════ */}
      {undoBar && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-slide-up px-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface border border-line-strong shadow-2xl">
            <span className="text-sm font-bold text-ink">{undoBar.label}</span>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-soft text-white text-xs font-bold transition"
            >
              <Undo2 className="w-3.5 h-3.5" /> 되돌리기
            </button>
            <button
              onClick={() => setUndoBar(null)}
              aria-label="알림 닫기"
              className="text-faint hover:text-ink text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
