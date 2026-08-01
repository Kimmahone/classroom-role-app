import React, { useMemo, useState } from 'react';
import { Student, Role, Assignment, DailyCheck, ActivityCategoryConfig, Classroom, paletteOf } from '../types';
import { RoleIcon } from './RoleIcon';
import { ProgressRing } from './ProgressRing';
import { avatarStyle, initialsOf } from '../utils/visual';
import { AppPrefs, vibrate } from '../utils/prefs';
import { soundFx } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, Maximize2, Minimize2, Trophy, Check, ZoomIn, ZoomOut, Users
} from 'lucide-react';

interface TvModeViewProps {
  students: Student[];
  roles: Role[];
  assignments: Assignment[];
  dailyStatus: DailyCheck;
  categoryConfig: ActivityCategoryConfig;
  classroom?: Classroom;
  prefs: AppPrefs;
  onToggleStatus: (studentId: string) => void;
  onExitTvMode: () => void;
}

/** 화면에 몇 칸씩 보여줄지 — 학생 수가 많은 학급을 위해 교사가 직접 조절한다. */
const COLUMN_STEPS = [3, 4, 5, 6, 7, 8];

const COLUMN_CLASS: Record<number, string> = {
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-3 md:grid-cols-5',
  6: 'grid-cols-3 md:grid-cols-6',
  7: 'grid-cols-4 md:grid-cols-7',
  8: 'grid-cols-4 md:grid-cols-8',
};

export const TvModeView: React.FC<TvModeViewProps> = ({
  students,
  roles,
  assignments,
  dailyStatus,
  categoryConfig,
  classroom,
  prefs,
  onToggleStatus,
  onExitTvMode,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [columnIdx, setColumnIdx] = useState(2); // 기본 5칸
  const [tapKey, setTapKey] = useState<Record<string, number>>({});

  const palette = paletteOf(categoryConfig.color);
  const columns = COLUMN_STEPS[columnIdx];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const assignMap = useMemo(() => new Map(assignments.map((a) => [a.studentId, a])), [assignments]);

  const totalCount = students.length;
  const completedCount = students.filter((s) => dailyStatus[s.id]).length;
  const ratio = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const pendingCount = totalCount - completedCount;

  const handleToggle = (e: React.MouseEvent, studentId: string, isDone: boolean) => {
    setTapKey((prev) => ({ ...prev, [studentId]: Date.now() }));

    if (!isDone) {
      soundFx.playSuccess();
      if (prefs.haptics) vibrate(20);
      if (prefs.confetti && prefs.animations) {
        const rect = e.currentTarget.getBoundingClientRect();
        confetti({
          particleCount: 26,
          spread: 55,
          startVelocity: 26,
          scalar: 0.9,
          origin: {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight,
          },
        });
      }
      if (completedCount + 1 === totalCount && totalCount > 0) {
        soundFx.playFanfare();
        if (prefs.confetti && prefs.animations) {
          confetti({ particleCount: 180, spread: 110, origin: { y: 0.5 } });
        }
      }
    } else {
      soundFx.playClick();
      if (prefs.haptics) vibrate(10);
    }
    onToggleStatus(studentId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-canvas text-ink overflow-y-auto p-4 sm:p-8 flex flex-col">

      {/* ── 상단 배너 ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 pb-5 mb-5 border-b border-line">
        <button
          onClick={onExitTvMode}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-elevated hover:bg-hover text-ink font-bold text-sm border border-line-strong transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">일반 모드</span>
        </button>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-muted">
            {classroom && <span>{classroom.emoji} {classroom.name}</span>}
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${palette.badge}`}>
              <RoleIcon name={categoryConfig.icon} className="w-3.5 h-3.5" />
              {categoryConfig.name}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-ink mt-1">
            📺 오늘의 역할 현황판
          </h1>
        </div>

        {/* 링 게이지 + 큰 수치 */}
        <div className="ml-auto flex items-center gap-4 sm:gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-3xl sm:text-5xl font-black tabular-nums">
              <span className={ratio === 100 ? 'text-amber-400' : 'text-emerald-400'}>{completedCount}</span>
              <span className="text-muted"> / {totalCount}</span>
            </div>
            <div className="text-sm font-bold text-muted">
              {pendingCount > 0 ? `아직 ${pendingCount}명 남았어요` : '모두 완수했습니다!'}
            </div>
          </div>

          <ProgressRing value={ratio} size={104} stroke={11} celebrate={ratio === 100 && totalCount > 0}>
            <span className={`text-2xl font-black tabular-nums ${ratio === 100 ? 'text-amber-300' : 'text-ink'}`}>
              {ratio}%
            </span>
          </ProgressRing>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setColumnIdx((i) => Math.max(0, i - 1))}
              disabled={columnIdx === 0}
              title="카드 크게 보기"
              aria-label="카드 크게 보기"
              className="p-2.5 rounded-xl bg-elevated hover:bg-hover text-muted border border-line-strong disabled:opacity-30 transition"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setColumnIdx((i) => Math.min(COLUMN_STEPS.length - 1, i + 1))}
              disabled={columnIdx === COLUMN_STEPS.length - 1}
              title="카드 작게 보기 (많은 인원 표시)"
              aria-label="카드 작게 보기"
              className="p-2.5 rounded-xl bg-elevated hover:bg-hover text-muted border border-line-strong disabled:opacity-30 transition"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-2xl bg-elevated hover:bg-hover text-muted border border-line-strong transition"
            title="전체 화면 토글"
            aria-label="전체 화면 토글"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* 100% 달성 배너 */}
      {ratio === 100 && totalCount > 0 && (
        <div className="mb-5 py-4 px-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-accent-soft/20 border border-amber-500/40 flex items-center justify-center gap-3 animate-pop">
          <Trophy className="w-8 h-8 text-amber-400" />
          <span className="text-xl sm:text-3xl font-black text-ink text-center">
            우리 반 모두가 오늘의 역할을 마쳤습니다! 🎉
          </span>
        </div>
      )}

      {/* ── 학생 타일 ─────────────────────────────────────────── */}
      {totalCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <Users className="w-12 h-12 text-faint" />
          <p className="text-lg font-bold text-muted">등록된 학생이 없습니다.</p>
          <p className="text-sm text-faint">[교사 설정 → 학생 명단]에서 학생을 추가해 주세요.</p>
        </div>
      ) : (
        <div className={`grid ${COLUMN_CLASS[columns]} gap-3 sm:gap-4`}>
          {students.map((student) => {
            const assign = assignMap.get(student.id);
            const role = assign ? roleMap.get(assign.roleId) || null : null;
            const isDone = !!dailyStatus[student.id];

            return (
              <button
                key={student.id}
                onClick={(e) => handleToggle(e, student.id, isDone)}
                aria-pressed={isDone}
                className={`relative overflow-hidden p-4 sm:p-5 rounded-3xl border-2 select-none transition-all duration-300 flex flex-col items-center gap-2 active:scale-95 ${
                  isDone
                    ? 'bg-emerald-500/15 border-emerald-400 shadow-xl shadow-emerald-500/10'
                    : 'bg-surface border-line hover:border-accent-soft'
                }`}
              >
                {prefs.showAvatars ? (
                  <span
                    key={tapKey[student.id]}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-lg sm:text-xl font-black shrink-0 ${
                      isDone ? 'ring-4 ring-emerald-400' : ''
                    } ${isDone && prefs.animations ? 'animate-stamp' : ''}`}
                    style={avatarStyle(student.name)}
                    aria-hidden="true"
                  >
                    {initialsOf(student.name)}
                  </span>
                ) : (
                  <span className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0 ${
                    isDone ? 'bg-emerald-500 text-white' : 'bg-elevated text-faint border-2 border-dashed border-line-strong'
                  }`}>
                    {isDone
                      ? <Check className="w-8 h-8 stroke-[3]" />
                      : <span className="text-2xl font-black">{student.number}</span>}
                  </span>
                )}

                <div className="min-w-0 w-full text-center">
                  {prefs.showNumbers && (
                    <span className="block text-[11px] sm:text-xs font-bold text-faint">{student.number}번</span>
                  )}
                  <h3 className="text-lg sm:text-2xl font-black text-ink truncate leading-tight">{student.name}</h3>
                </div>

                {role ? (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold text-[11px] sm:text-sm max-w-full ${
                    isDone ? 'bg-emerald-500/25 text-emerald-200' : 'bg-accent-soft/15 text-accent-text'
                  }`}>
                    <RoleIcon name={role.icon} className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{role.title}</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-faint">미배정</span>
                )}

                {isDone && (
                  <span className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center ${
                    prefs.animations ? 'animate-stamp' : ''
                  }`}>
                    <Check className="w-5 h-5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="text-center text-muted text-sm mt-8 pb-2">
        학생 이름을 터치하거나 클릭하면 완수 상태가 전환됩니다 · 돋보기 버튼으로 카드 크기를 조절하세요
      </div>
    </div>
  );
};
