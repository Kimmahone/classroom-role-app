import React, { useState } from 'react';
import { Student, Role, Assignment, ActivityCategory, ACTIVITY_CATEGORIES } from '../types';
import { RoleIcon } from './RoleIcon';
import { soundFx } from '../utils/sound';
import confetti from 'canvas-confetti';
import { Shuffle, RotateCw, Pin, PinOff, Lock, Trash2, UserCheck } from 'lucide-react';

interface AssignmentEngineProps {
  students: Student[];
  roles: Role[];
  assignments: Assignment[];
  activeCategory: ActivityCategory;
  onUpdateAssignments: (newAssignments: Assignment[]) => void;
}

export const AssignmentEngine: React.FC<AssignmentEngineProps> = ({
  students,
  roles,
  assignments,
  activeCategory,
  onUpdateAssignments,
}) => {
  const [isShuffling, setIsShuffling] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const categoryConfig = ACTIVITY_CATEGORIES.find((c) => c.id === activeCategory) || ACTIVITY_CATEGORIES[0];
  const categoryRoles = roles.filter((r) => !r.activityCategory || r.activityCategory === activeCategory);

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

  // Random Shuffle Engine for active category
  const handleRandomShuffle = () => {
    if (students.length === 0 || categoryRoles.length === 0) return;
    soundFx.playClick();
    setIsShuffling(true);

    const rolePool: string[] = [];
    categoryRoles.forEach((r) => {
      for (let i = 0; i < (r.count || 1); i++) {
        rolePool.push(r.id);
      }
    });

    let poolIdx = 0;
    while (rolePool.length < students.length && categoryRoles.length > 0) {
      rolePool.push(categoryRoles[poolIdx % categoryRoles.length].id);
      poolIdx++;
    }

    setTimeout(() => {
      const lockedStudents = new Set<string>();
      const usedRoles: string[] = [];

      categoryAssignments.forEach((a) => {
        if (a.locked) {
          lockedStudents.add(a.studentId);
          usedRoles.push(a.roleId);
        }
      });

      const availableRoles = [...rolePool];
      usedRoles.forEach((rId) => {
        const idx = availableRoles.indexOf(rId);
        if (idx !== -1) availableRoles.splice(idx, 1);
      });

      for (let i = availableRoles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableRoles[i], availableRoles[j]] = [availableRoles[j], availableRoles[i]];
      }

      let availIdx = 0;
      const newCategoryAssignments: Assignment[] = students.map((st) => {
        const existing = assignmentMap.get(st.id);
        if (existing && existing.locked) {
          return { studentId: st.id, roleId: existing.roleId, activityCategory: activeCategory, locked: true };
        }
        const assignedRoleId = availableRoles[availIdx % availableRoles.length] || categoryRoles[0].id;
        availIdx++;
        return { studentId: st.id, roleId: assignedRoleId, activityCategory: activeCategory, locked: false };
      });

      // Preserve assignments of OTHER categories!
      const otherCategoryAssignments = assignments.filter((a) => a.activityCategory && a.activityCategory !== activeCategory);
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
      if (existing && existing.locked) {
        return { studentId: st.id, roleId: existing.roleId, activityCategory: activeCategory, locked: true };
      }
      if (!existing) {
        return { studentId: st.id, roleId: roleIds[0], activityCategory: activeCategory };
      }

      const currIdx = roleIds.indexOf(existing.roleId);
      const nextRoleId = roleIds[(currIdx + 1) % roleIds.length];
      return { studentId: st.id, roleId: nextRoleId, activityCategory: activeCategory, locked: false };
    });

    const otherCategoryAssignments = assignments.filter((a) => a.activityCategory && a.activityCategory !== activeCategory);
    onUpdateAssignments([...otherCategoryAssignments, ...newCategoryAssignments]);
    soundFx.playSuccess();
  };

  // Manual Assign
  const handleManualAssign = (studentId: string, roleId: string) => {
    soundFx.playClick();
    const otherCategoryAssignments = assignments.filter(
      (a) => a.studentId !== studentId || (a.activityCategory && a.activityCategory !== activeCategory)
    );
    const updated: Assignment = { studentId, roleId, activityCategory: activeCategory };
    onUpdateAssignments([...otherCategoryAssignments, updated]);
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
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-700/60 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Shuffle className="w-5 h-5" />
              </span>
              <h2 className="text-2xl font-extrabold text-white">
                🎲 [{categoryConfig.name}] 역할 배정 & 셔플 Engine
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              선택된 범주의 역할({categoryRoles.length}종)에 맞추어 랜덤 셔플 및 순환 배정을 진행합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRandomShuffle}
              disabled={isShuffling || categoryRoles.length === 0}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 ${
                isShuffling ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Shuffle className={`w-5 h-5 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>{isShuffling ? '역할 섞는 중...' : '🎲 랜덤 자동 배정'}</span>
            </button>

            <button
              onClick={handleRotation}
              disabled={categoryRoles.length === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition"
            >
              <RotateCw className="w-4 h-4 text-emerald-400" />
              <span>🔄 1칸 순환 배정</span>
            </button>

            <button
              onClick={handleClearCategoryAssignments}
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
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
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              학생 명단 ({students.length}명)
            </h3>
            <span className="text-xs text-slate-400">클릭하여 수동 배정</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {students.map((student) => {
              const current = assignmentMap.get(student.id);
              const assignedRole = current ? categoryRoles.find((r) => r.id === current.roleId) : null;
              const isSelected = selectedStudentId === student.id;

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentId(isSelected ? null : student.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                      : current
                      ? 'bg-slate-800/50 border-slate-800 hover:border-slate-700'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 w-6">{student.number}번</span>
                    <span className="font-bold text-slate-100">{student.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {assignedRole ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 text-xs font-bold text-indigo-300 border border-slate-700">
                        <RoleIcon name={assignedRole.icon} className="w-3.5 h-3.5" />
                        <span>{assignedRole.title}</span>
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
                            : 'text-slate-500 hover:text-slate-300'
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
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              [{categoryConfig.name}] 역할별 배정 현황
            </h3>
            {selectedStudentId && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-600 text-white animate-pulse">
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
                        ? 'bg-slate-900 border-indigo-500/40 hover:border-indigo-500 hover:scale-[1.01] cursor-pointer'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                    onClick={() => {
                      if (selectedStudentId) {
                        handleManualAssign(selectedStudentId, role.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <RoleIcon name={role.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{role.title}</h4>
                          <span className="text-xs text-slate-400">필요 인원: {role.count}명</span>
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

                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{role.description}</p>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                      {assignedStudents.length > 0 ? (
                        assignedStudents.map((st) => {
                          const isLocked = assignmentMap.get(st.id)?.locked;
                          return (
                            <span
                              key={st.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                                isLocked
                                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                                  : 'bg-slate-800 text-slate-200 border-slate-700'
                              }`}
                            >
                              <span>{st.name}</span>
                              {isLocked && <Pin className="w-3 h-3 fill-amber-400" />}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic">배정된 학생 없음</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-slate-800 text-slate-400 text-sm">
              이 범주({categoryConfig.name})에 등록된 역할이 없습니다. [교사 설정] -&gt; [역할 목록]에서 새 역할을 추가해 주세요.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
