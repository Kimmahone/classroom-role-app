import React from 'react';
import { Student, Role, Assignment, DailyCheck } from '../types';
import { RoleIcon } from './RoleIcon';
import { soundFx } from '../utils/sound';
import confetti from 'canvas-confetti';
import { CheckCircle2, ArrowLeft, Maximize2, Minimize2, Trophy } from 'lucide-react';

interface TvModeViewProps {
  students: Student[];
  roles: Role[];
  assignments: Assignment[];
  dailyStatus: DailyCheck;
  onToggleStatus: (studentId: string) => void;
  onExitTvMode: () => void;
}

export const TvModeView: React.FC<TvModeViewProps> = ({
  students,
  roles,
  assignments,
  dailyStatus,
  onToggleStatus,
  onExitTvMode,
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const roleMap = new Map<string, Role>();
  roles.forEach((r) => roleMap.set(r.id, r));

  const totalCount = students.length;
  const completedCount = students.filter((s) => dailyStatus[s.id]).length;
  const ratio = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = (studentId: string, isDone: boolean) => {
    if (!isDone) {
      soundFx.playSuccess();
      if (completedCount + 1 === totalCount && totalCount > 0) {
        soundFx.playFanfare();
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 }
        });
      }
    } else {
      soundFx.playClick();
    }
    onToggleStatus(studentId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white overflow-y-auto p-6 sm:p-10 flex flex-col justify-between">
      
      {/* Top Banner */}
      <div>
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={onExitTvMode}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base border border-slate-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>일반 모드로 돌아가기</span>
            </button>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-indigo-300">
              📺 교실 TV 역할 현황판
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="전체 화면 토글"
            >
              {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Big Progress Thermometer */}
        <div className="mb-10 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400" />
              <span className="text-2xl font-black text-white">오늘 우리 반 역할 완수율</span>
            </div>
            <div className="text-3xl font-black">
              <span className="text-emerald-400">{completedCount}</span> / {totalCount}명 ({ratio}%)
            </div>
          </div>
          <div className="w-full h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700 p-1">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                ratio === 100 ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${ratio}%` }}
            ></div>
          </div>
        </div>

        {/* Large Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {students.map((student) => {
            const assign = assignments.find((a) => a.studentId === student.id);
            const role = assign ? roleMap.get(assign.roleId) || null : null;
            const isDone = !!dailyStatus[student.id];

            return (
              <div
                key={student.id}
                onClick={() => handleToggle(student.id, isDone)}
                className={`p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 select-none flex flex-col justify-between ${
                  isDone
                    ? 'bg-emerald-900/60 border-emerald-400 shadow-xl shadow-emerald-950/60 scale-[1.02]'
                    : 'bg-slate-900/80 border-slate-800 hover:border-indigo-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-400">{student.number}번</span>
                    {isDone ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border-2 border-slate-600"></span>
                    )}
                  </div>

                  <h3 className="text-3xl font-black text-white mb-2">{student.name}</h3>

                  {role ? (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm ${
                      isDone ? 'bg-emerald-500/20 text-emerald-200' : 'bg-indigo-500/20 text-indigo-300'
                    }`}>
                      <RoleIcon name={role.icon} className="w-4 h-4" />
                      <span>{role.title}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">미배정</span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-4 line-clamp-2">
                  {role ? role.description : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-center text-slate-500 text-sm mt-8">
        학생 이름을 터치하거나 클릭하면 완료 상태가 전환됩니다.
      </div>
    </div>
  );
};
