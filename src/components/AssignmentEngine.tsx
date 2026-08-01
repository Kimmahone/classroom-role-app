import React, { useState, useMemo } from 'react';
import { Student, Role, Assignment, ActivityCategory, ActivityCategoryConfig, RoleHistoryRecord } from '../types';
import { RoleIcon } from './RoleIcon';
import { soundFx } from '../utils/sound';
import confetti from 'canvas-confetti';
import { Shuffle, RotateCw, Pin, PinOff, Lock, Trash2, UserCheck, Scale, CalendarClock } from 'lucide-react';
import { buildRoleSlots, buildFairnessIndex, assignSlotsFairly } from '../utils/assignment';
import { getPeriodInfo, PERIOD_BADGE_CLASS } from '../utils/category';

interface AssignmentEngineProps {
  students: Student[];
  roles: Role[];
  assignments: Assignment[];
  roleHistory: RoleHistoryRecord[];
  activeCategory: ActivityCategory;
  categoryConfig: ActivityCategoryConfig;
  selectedDate: string;
  onUpdateAssignments: (newAssignments: Assignment[]) => void;
}

export const AssignmentEngine: React.FC<AssignmentEngineProps> = ({
  students,
  roles,
  assignments,
  roleHistory,
  activeCategory,
  categoryConfig,
  selectedDate,
  onUpdateAssignments,
}) => {
  const [isShuffling, setIsShuffling] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [useFairMode, setUseFairMode] = useState(true);

  const period = getPeriodInfo(categoryConfig, selectedDate);
  const categoryRoles = roles.filter((r) => !r.activityCategory || r.activityCategory === activeCategory);

  // --- 이력 기반 공정성 지표 -------------------------------------------------
  const fairnessIndex = useMemo(
    () => buildFairnessIndex(roleHistory, activeCategory),
    [roleHistory, activeCategory]
  );
  const { timesHeld, sessionCount } = fairnessIndex;

  // Map assignments for current category
  const categoryAssignments = assignments.filter(
    (a) => a.activityCategory === activeCategory || (!a.activityCategory && activeCategory === 'daily')
  );

  const assignmentMap = new Map<string, { roleId: string; locked?: boolean }>();
  categoryAssignments.forEach((a) => assignmentMap.set(a.studentId, { roleId: a.roleId, locked: a.locked }));

  // Pin / Lock Toggle
  const toggleLock = (studentId: string) => {
    soundFx.playClick();
    const current = assignmentMap.get(studentId);
    if (!current) return;

    const nextAssignments = assignments.map((a) => {
      if (a.studentId === studentId && (a.activityCategory === activeCategory || !a.activityCategory)) {
        return { ...a, locked: !a.locked, activityCategory: activeCategory };
      }
      return a;
    });
    onUpdateAssignments(nextAssignments);
  };

  /** 다른 활동 범주의 배정은 절대 건드리지 않는다. */
  const otherCategoryAssignments = assignments.filter(
    (a) => a.activityCategory && a.activityCategory !== activeCategory
  );

  // Random Shuffle Engine for active category
  const handleRandomShuffle = () => {
    if (students.length === 0 || categoryRoles.length === 0) return;
    soundFx.playClick();
    setIsShuffling(true);

    setTimeout(() => {
      const lockedStudents = students.filter((st) => assignmentMap.get(st.id)?.locked);
      const unlockedStudents = students.filter((st) => !assignmentMap.get(st.id)?.locked);

      const slots = buildRoleSlots(categoryRoles, students.length);

      // 고정된 학생이 이미 차지한 자리는 후보 목록에서 하나씩 뺀다.
      const availableSlots = [...slots];
      lockedStudents.forEach((st) => {
        const roleId = assignmentMap.get(st.id)?.roleId;
        if (!roleId) return;
        const idx = availableSlots.indexOf(roleId);
        if (idx !== -1) availableSlots.splice(idx, 1);
      });

      const picked = assignSlotsFairly(unlockedStudents, availableSlots, fairnessIndex, useFairMode);

      const newCategoryAssignments: Assignment[] = students.map((st) => {
        const existing = assignmentMap.get(st.id);
        if (existing?.locked) {
          return { studentId: st.id, roleId: existing.roleId, activityCategory: activeCategory, locked: true };
        }
        const assignedRoleId = picked.get(st.id) || existing?.roleId || categoryRoles[0].id;
        return { studentId: st.id, roleId: assignedRoleId, activityCategory: activeCategory, locked: false };
      });

      onUpdateAssignments([...otherCategoryAssignments, ...newCategoryAssignments]);

      setIsShuffling(false);
      soundFx.playSuccess();
      confetti({ particleCount: 70, spread: 60 });
    }, 1200);
  };

  // Rotation Engine (+1 Shift)
  const handleRotation = () => {
    if (students.length === 0 || categoryRoles.length === 0) return;
    soundFx.playClick();

    const roleIds = categoryRoles.map((r) => r.id);

    const newCategoryAssignments: Assignment[] = students.map((st) => {
      const existing = assignmentMap.get(st.id);
      if (existing?.locked) {
        return { studentId: st.id, roleId: existing.roleId, activityCategory: activeCategory, locked: true };
      }

      const currIdx = existing ? roleIds.indexOf(existing.roleId) : -1;
      // 아직 배정이 없거나(-1) 이 범주에 없는 역할을 갖고 있으면 첫 역할부터 시작한다.
      const nextRoleId = currIdx === -1 ? roleIds[0] : roleIds[(currIdx + 1) % roleIds.length];
      return { studentId: st.id, roleId: nextRoleId, activityCategory: activeCategory, locked: false };
    });

    onUpdateAssignments([...otherCategoryAssignments, ...newCategoryAssignments]);
    soundFx.playSuccess();
  };

  // Manual Assign
  const handleManualAssign = (studentId: string, roleId: string) => {
    soundFx.playClick();
    // 이 학생의 '현재 범주' 배정만 교체하고 나머지는 그대로 둔다.
    const retained = assignments.filter(
      (a) => a.studentId !== studentId || (a.activityCategory && a.activityCategory !== activeCategory)
    );
    const updated: Assignment = { studentId, roleId, activityCategory: activeCategory };
    onUpdateAssignments([...retained, updated]);
    setSelectedStudentId(null);
  };

  // Clear all assignments for current category
  const handleClearCategoryAssignments = () => {
    if (confirm(`'${categoryConfig.name}' 배정을 모두 해제하시겠습니까?`)) {
      soundFx.playClick();
      const remaining = assignments.filter((a) => a.activityCategory && a.activityCategory !== activeCategory);
      onUpdateAssignments(remaining);
    }
  };

  return (
    <div className="space-y-8 animate-pop">
      
      {/* Control Deck */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-line-strong/60 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-accent-soft/20 text-accent-text">
                <Shuffle className="w-5 h-5" />
              </span>
              <h2 className="text-2xl font-extrabold text-ink">
                🎲 [{categoryConfig.name}] 역할 배정 & 셔플 Engine
              </h2>
            </div>
            <p className="text-sm text-muted">
              선택된 범주의 역할({categoryRoles.length}종)에 맞추어 랜덤 셔플 및 순환 배정을 진행합니다.
            </p>

            <span
              className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 text-[11px] font-bold rounded-lg border ${PERIOD_BADGE_CLASS[period.status]}`}
              title={period.rangeLabel ? `운영 기간 ${period.rangeLabel}` : '운영 기간이 지정되지 않았습니다'}
            >
              <CalendarClock className="w-3 h-3" />
              {period.rangeLabel ? `운영 기간 ${period.rangeLabel} · ${period.label}` : '상시 운영'}
            </span>

            {/* 이력 기반 공정 배정 토글 */}
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setUseFairMode((v) => !v);
              }}
              aria-pressed={useFairMode}
              className={`mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                useFairMode
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-elevated text-muted border-line-strong'
              }`}
              title="지난 배정 이력을 반영해 같은 역할이 반복되지 않도록 합니다."
            >
              <Scale className="w-4 h-4" />
              <span>
                {useFairMode ? '이력 반영 공정 배정 ON' : '완전 무작위 배정'}
                {useFairMode && sessionCount > 0 && ` · 누적 ${sessionCount}회차 반영`}
              </span>
            </button>
            {useFairMode && sessionCount === 0 && (
              <p className="text-[11px] text-faint mt-1.5">
                아직 저장된 배정 이력이 없습니다. 첫 배정을 실행하면 다음 회차부터 반복을 피해 배정합니다.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRandomShuffle}
              disabled={isShuffling || categoryRoles.length === 0}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-accent to-purple-600 hover:from-accent-soft hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-accent/30 transition transform hover:-translate-y-0.5 ${
                isShuffling ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Shuffle className={`w-5 h-5 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>{isShuffling ? '역할 섞는 중...' : '🎲 랜덤 자동 배정'}</span>
            </button>

            <button
              onClick={handleRotation}
              disabled={categoryRoles.length === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-elevated hover:bg-hover text-ink font-bold text-sm border border-line-strong transition"
            >
              <RotateCw className="w-4 h-4 text-emerald-400" />
              <span>🔄 1칸 순환 배정</span>
            </button>

            <button
              onClick={handleClearCategoryAssignments}
              className="p-3 rounded-2xl bg-elevated/80 hover:bg-rose-500/20 text-muted hover:text-rose-400 border border-line-strong transition"
              title="이 카테고리 배정 전체 초기화"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Matching Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Student List */}
        <div className="p-6 rounded-3xl bg-surface border border-line shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-accent-text" />
              학생 명단 ({students.length}명)
            </h3>
            <span className="text-xs text-muted">클릭하여 수동 배정</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {students.map((student) => {
              const current = assignmentMap.get(student.id);
              const assignedRole = current ? categoryRoles.find((r) => r.id === current.roleId) : null;
              const isSelected = selectedStudentId === student.id;
              // 이 학생이 지금 역할을 과거에 몇 번 맡았는지 (오늘 기록 포함)
              const heldCount = current ? timesHeld.get(`${student.id}|${current.roleId}`) || 0 : 0;

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentId(isSelected ? null : student.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-accent/30 border-accent-soft shadow-md ring-1 ring-accent'
                      : current
                      ? 'bg-elevated/50 border-line hover:border-line-strong'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-faint w-6">{student.number}번</span>
                    <span className="font-bold text-ink">{student.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {assignedRole ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-elevated text-xs font-bold text-accent-text border border-line-strong">
                        <RoleIcon name={assignedRole.icon} className="w-3.5 h-3.5" />
                        <span>{assignedRole.title}</span>
                        {heldCount > 1 && (
                          <span
                            className="px-1.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px]"
                            title={`이 학생이 '${assignedRole.title}' 역할을 맡은 누적 횟수`}
                          >
                            {heldCount}회째
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300">
                        미배정
                      </span>
                    )}

                    {current && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLock(student.id);
                        }}
                        className={`p-1.5 rounded-lg transition ${
                          current.locked
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'text-faint hover:text-muted'
                        }`}
                        title={current.locked ? '배정 고정됨' : '배정 고정하기'}
                      >
                        {current.locked ? <Pin className="w-3.5 h-3.5 fill-amber-400" /> : <PinOff className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Roles */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-line">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              [{categoryConfig.name}] 역할별 배정 현황
            </h3>
            {selectedStudentId && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent text-white animate-pulse">
                {students.find((s) => s.id === selectedStudentId)?.name} 학생 배정할 역할 선택 중...
              </span>
            )}
          </div>

          {categoryRoles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
              {categoryRoles.map((role) => {
                const assignedStudents = students.filter((st) => {
                  const a = assignmentMap.get(st.id);
                  return a && a.roleId === role.id;
                });

                return (
                  <div
                    key={role.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      selectedStudentId
                        ? 'bg-surface border-accent-soft/40 hover:border-accent-soft hover:scale-[1.01] cursor-pointer'
                        : 'bg-surface border-line'
                    }`}
                    onClick={() => {
                      if (selectedStudentId) {
                        handleManualAssign(selectedStudentId, role.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-accent-soft/10 text-accent-text border border-accent-soft/20">
                          <RoleIcon name={role.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-ink">{role.title}</h4>
                          <span className="text-xs text-muted">필요 인원: {role.count}명</span>
                        </div>
                      </div>

                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                        assignedStudents.length >= role.count
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {assignedStudents.length} / {role.count}명
                      </span>
                    </div>

                    <p className="text-xs text-muted mb-3 line-clamp-2">{role.description}</p>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-line">
                      {assignedStudents.length > 0 ? (
                        assignedStudents.map((st) => {
                          const isLocked = assignmentMap.get(st.id)?.locked;
                          return (
                            <span
                              key={st.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                                isLocked
                                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                                  : 'bg-elevated text-ink border-line-strong'
                              }`}
                            >
                              <span>{st.name}</span>
                              {isLocked && <Pin className="w-3 h-3 fill-amber-400" />}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-faint italic">배정된 학생 없음</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-surface/60 rounded-3xl border border-line text-muted text-sm">
              이 범주({categoryConfig.name})에 등록된 역할이 없습니다. [교사 설정] -&gt; [역할 목록]에서 새 역할을 추가해 주세요.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
