import React, { useState } from 'react';
import { Student, Role, Assignment, DailyStatusHistory, ActivityCategory, ACTIVITY_CATEGORIES } from '../types';
import { RoleIcon } from './RoleIcon';
import { BarChart3, Award, Calendar, CheckCircle2, Filter } from 'lucide-react';

interface StatsViewProps {
  students: Student[];
  roles: Role[];
  assignments: Assignment[];
  dailyStatusHistory: DailyStatusHistory;
}

export const StatsView: React.FC<StatsViewProps> = ({
  students,
  roles,
  assignments,
  dailyStatusHistory,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const dates = Object.keys(dailyStatusHistory).sort().reverse();

  const roleMap = new Map<string, Role>();
  roles.forEach((r) => roleMap.set(r.id, r));

  // Calculate student participation stats
  const studentStats = students.map((student) => {
    let totalCategoryChecks = 0;
    let categoryBreakdown: Record<string, number> = {};

    ACTIVITY_CATEGORIES.forEach((cat) => {
      categoryBreakdown[cat.id] = 0;
    });

    dates.forEach((dKey) => {
      const dayRecord = dailyStatusHistory[dKey] || {};
      Object.keys(dayRecord).forEach((catKey) => {
        if (selectedCategoryFilter === 'all' || selectedCategoryFilter === catKey) {
          if (dayRecord[catKey] && dayRecord[catKey][student.id]) {
            totalCategoryChecks++;
            categoryBreakdown[catKey] = (categoryBreakdown[catKey] || 0) + 1;
          }
        }
      });
    });

    // Find current active assignments
    const currentAssignments = assignments.filter((a) => a.studentId === student.id);

    return {
      student,
      totalCategoryChecks,
      categoryBreakdown,
      currentAssignments,
    };
  }).sort((a, b) => b.totalCategoryChecks - a.totalCategoryChecks);

  return (
    <div className="space-y-8 animate-pop">
      
      {/* Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-700/60 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400">
              <BarChart3 className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-2xl font-extrabold text-white">📊 올인원 학급 역할 & 활동 참여 통계</h2>
              <p className="text-sm text-slate-400">1인 1역, 아침활동, 과목별 역할, 프로젝트 학습 성실도를 한눈에 다각도 분석합니다.</p>
            </div>
          </div>

          {/* Filter dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">전체 활동 범주 통합</option>
              {ACTIVITY_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leaderboard & Stats Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Top 5 Contributors */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            성실왕 학생 랭킹 TOP 5
          </h3>

          <div className="space-y-3">
            {studentStats.slice(0, 5).map((st, idx) => (
              <div
                key={st.student.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                    idx === 0 ? 'bg-amber-400 text-slate-950' :
                    idx === 1 ? 'bg-slate-300 text-slate-950' :
                    idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-white text-sm">{st.student.name}</span>
                    <span className="text-xs text-slate-400 block">{st.student.number}번</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{st.totalCategoryChecks}회 완수</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Table */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">전체 학생 성실도 및 이력 분석</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold border-b border-slate-700">
                <tr>
                  <th className="p-3">번호</th>
                  <th className="p-3">이름</th>
                  <th className="p-3">현재 부여된 역할 목록</th>
                  <th className="p-3 text-right">누적 수행 횟수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {studentStats.map((st) => (
                  <tr key={st.student.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-semibold text-slate-500">{st.student.number}번</td>
                    <td className="p-3 font-bold text-white">{st.student.name}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {st.currentAssignments.length > 0 ? (
                          st.currentAssignments.map((a, i) => {
                            const r = roleMap.get(a.roleId);
                            if (!r) return null;
                            return (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]">
                                <RoleIcon name={r.icon} className="w-3 h-3" />
                                <span>{r.title}</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-500">미배정</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-black text-emerald-400 text-sm">
                      {st.totalCategoryChecks}회
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* History Log Dates */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          활동 수행 기록 일자 ({dates.length}일 기록됨)
        </h3>

        {dates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {dates.map((dKey) => (
              <div key={dKey} className="px-4 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-xs">
                <span className="font-bold text-slate-200">{dKey}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">아직 누적된 일일 기록이 없습니다. 현황판에서 완수를 체크하세요.</p>
        )}
      </div>

    </div>
  );
};
