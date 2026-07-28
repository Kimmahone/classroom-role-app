import React, { useState } from 'react';
import { Student, Role, RolePreset, FirebaseConfig, ActivityCategory, ACTIVITY_CATEGORIES } from '../types';
import { BUILTIN_ROLE_PRESETS, exportDataToJson, importDataFromJson } from '../utils/storage';
import { RoleIcon, AVAILABLE_ICONS } from './RoleIcon';
import { soundFx } from '../utils/sound';
import { 
  Users, Briefcase, Download, Upload, Plus, Trash2, Edit, Sparkles, BookOpen, Layers, Cloud, X 
} from 'lucide-react';

interface SettingsViewProps {
  students: Student[];
  roles: Role[];
  customPresets: RolePreset[];
  firebaseConfig: FirebaseConfig;
  activeCategory: ActivityCategory;
  onUpdateStudents: (students: Student[]) => void;
  onUpdateRoles: (roles: Role[]) => void;
  onUpdateCustomPresets: (presets: RolePreset[]) => void;
  onOpenFirebaseModal: () => void;
  onOpenPresetModal: (preset: RolePreset | null) => void;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  students,
  roles,
  customPresets,
  firebaseConfig,
  activeCategory,
  onUpdateStudents,
  onUpdateRoles,
  onUpdateCustomPresets,
  onOpenFirebaseModal,
  onOpenPresetModal,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'roles' | 'presets' | 'cloud' | 'backup'>('students');

  // Student Bulk Add
  const [bulkText, setBulkText] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  // Role Editing State
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

  // Combine built-in & custom presets
  const allPresets = [...customPresets, ...BUILTIN_ROLE_PRESETS];

  // Student CRUD
  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    soundFx.playClick();
    const nextNumber = students.length > 0 ? Math.max(...students.map((s) => s.number)) + 1 : 1;
    const newStudent: Student = {
      id: `s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      number: nextNumber,
      name: newStudentName.trim(),
    };
    onUpdateStudents([...students, newStudent]);
    setNewStudentName('');
  };

  const handleBulkAddStudents = () => {
    if (!bulkText.trim()) return;
    soundFx.playClick();
    const lines = bulkText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    let currentMaxNumber = students.length > 0 ? Math.max(...students.map((s) => s.number)) : 0;

    const newStudents: Student[] = lines.map((name) => {
      currentMaxNumber++;
      return {
        id: `s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        number: currentMaxNumber,
        name,
      };
    });

    onUpdateStudents([...students, ...newStudents]);
    setBulkText('');
    setShowBulkInput(false);
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('해당 학생을 삭제하시겠습니까?')) {
      soundFx.playClick();
      onUpdateStudents(students.filter((s) => s.id !== id));
    }
  };

  // Role CRUD
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editingRole.title) return;
    soundFx.playClick();

    const categoryForRole = editingRole.activityCategory || activeCategory || 'daily';

    if (editingRole.id) {
      onUpdateRoles(roles.map((r) => (r.id === editingRole.id ? ({ ...editingRole, activityCategory: categoryForRole } as Role) : r)));
    } else {
      const newRoleObj: Role = {
        id: `r_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: editingRole.title || '새 역할',
        category: editingRole.category || 'service',
        activityCategory: categoryForRole,
        subjectName: editingRole.subjectName || '',
        icon: editingRole.icon || 'Sparkles',
        color: editingRole.color || 'indigo',
        description: editingRole.description || '',
        count: editingRole.count || 1,
        sopSteps: editingRole.sopSteps || [],
      };
      onUpdateRoles([...roles, newRoleObj]);
    }
    setEditingRole(null);
  };

  const handleDeleteRole = (id: string) => {
    if (confirm('이 역할을 삭제하시겠습니까?')) {
      soundFx.playClick();
      onUpdateRoles(roles.filter((r) => r.id !== id));
    }
  };

  const handleLoadPreset = (preset: RolePreset) => {
    if (confirm(`'${preset.name}' 템플릿을 적용하시겠습니까? 기존 역할 목록에 병합/교체됩니다.`)) {
      soundFx.playSuccess();
      const loadedRoles: Role[] = preset.roles.map((r, idx) => ({
        ...r,
        id: `r_preset_${idx}_${Date.now()}`,
        activityCategory: preset.activityCategory || 'daily',
      }));

      const otherRoles = roles.filter((r) => r.activityCategory !== (preset.activityCategory || 'daily'));
      onUpdateRoles([...otherRoles, ...loadedRoles]);
    }
  };

  const handleDeleteCustomPreset = (id: string) => {
    if (confirm('이 템플릿을 삭제하시겠습니까?')) {
      soundFx.playClick();
      onUpdateCustomPresets(customPresets.filter((p) => p.id !== id));
    }
  };

  // Export / Import
  const handleExport = () => {
    soundFx.playClick();
    const jsonStr = exportDataToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `학급_역할관리_통합백업_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content && importDataFromJson(content)) {
        soundFx.playSuccess();
        alert('데이터 복원이 성공적으로 완료되었습니다!');
        onRefreshData();
      } else {
        alert('올바르지 않은 JSON 백업 파일 형식입니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-pop">
      
      {/* Header */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-700/60 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white">⚙️ 교사 통합 설정 & 데이터 관리</h2>
            <p className="text-sm text-slate-400">학생 명단, 역할 목록, Firebase 클라우드, 나만의 템플릿 및 JSON 관리를 수행합니다.</p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'students' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" /> 학생 명단 ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'roles' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" /> 역할 관리 ({roles.length})
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'presets' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" /> 템플릿 생성기
            </button>
            <button
              onClick={() => setActiveTab('cloud')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'cloud' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Cloud className="w-4 h-4 text-emerald-400" /> 클라우드 Sync
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'backup' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-4 h-4 text-cyan-400" /> JSON 백업
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: Students Management */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">학생 개별 추가</h3>
              <form onSubmit={handleAddSingleStudent} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">학생 이름</label>
                  <input
                    type="text"
                    placeholder="예: 김민수"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full bg-slate-800 text-white text-sm px-4 py-2.5 rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition"
                >
                  <Plus className="w-4 h-4" /> 학생 1명 추가
                </button>
              </form>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">명단 1초 일괄 등록</h3>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-xs text-slate-400 mb-4">
                줄바꿈으로 구분된 전체 학급 명단을 한 번에 붙여넣어 자동 번호 생성으로 추가합니다.
              </p>

              {!showBulkInput ? (
                <button
                  onClick={() => setShowBulkInput(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-sm border border-slate-700 transition"
                >
                  전체 명단 붙여넣기 창 열기
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={6}
                    placeholder={`강도윤\n김민수\n박서준\n이지원...`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="w-full bg-slate-800 text-white text-xs p-3 rounded-xl border border-slate-700 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkAddStudents}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
                    >
                      일괄 추가 실행
                    </button>
                    <button
                      onClick={() => setShowBulkInput(false)}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">등록된 학생 목록 ({students.length}명)</h3>
              {students.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('전체 학생 명단을 삭제하시겠습니까?')) {
                      onUpdateStudents([]);
                    }
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                >
                  전체 명단 삭제
                </button>
              )}
            </div>

            {students.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">{student.number}번</span>
                      <span className="font-bold text-slate-100 text-sm">{student.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                등록된 학생이 없습니다. 좌측에서 학생을 추가해 주세요.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Roles Management */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">학급 및 과목별 역할 목록 ({roles.length}종)</h3>
              <p className="text-xs text-slate-400">활동 범주(1인 1역, 아침활동, 과목별 역할, 프로젝트 학습 등)를 지정하여 역할을 작성합니다.</p>
            </div>
            <button
              onClick={() =>
                setEditingRole({
                  title: '',
                  category: 'cleaning',
                  activityCategory: activeCategory || 'daily',
                  icon: 'Sparkles',
                  color: 'indigo',
                  description: '',
                  count: 1,
                  sopSteps: ['1단계 지침'],
                })
              }
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" /> 새 역할 추가
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const catConfig = ACTIVITY_CATEGORIES.find((c) => c.id === role.activityCategory);
              return (
                <div key={role.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                        {catConfig?.name || '1인 1역'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingRole(role)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <RoleIcon name={role.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-lg">{role.title}</h4>
                        <span className="text-xs text-slate-400">필요 인원: {role.count}명</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">{role.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Role Modal */}
          {editingRole && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-pop">
              <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <h3 className="text-xl font-bold text-white">
                    {editingRole.id ? '역할 수정' : '새 역할 작성'}
                  </h3>
                  <button onClick={() => setEditingRole(null)} className="p-2 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveRole} className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 mb-1 block">활동 범주 (Category)</label>
                      <select
                        value={editingRole.activityCategory || 'daily'}
                        onChange={(e) => setEditingRole({ ...editingRole, activityCategory: e.target.value as ActivityCategory })}
                        className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700"
                      >
                        {ACTIVITY_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 mb-1 block">과목명 (선택: 과목별 역할 시)</label>
                      <input
                        type="text"
                        placeholder="예: 수학, 과학, 국어"
                        value={editingRole.subjectName || ''}
                        onChange={(e) => setEditingRole({ ...editingRole, subjectName: e.target.value })}
                        className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 mb-1 block">역할 이름</label>
                      <input
                        type="text"
                        required
                        placeholder="예: 칠판 도우미"
                        value={editingRole.title || ''}
                        onChange={(e) => setEditingRole({ ...editingRole, title: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm px-4 py-2 rounded-xl border border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 mb-1 block">필요 인원 (명)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={editingRole.count || 1}
                        onChange={(e) => setEditingRole({ ...editingRole, count: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-800 text-white text-sm px-4 py-2 rounded-xl border border-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">아이콘 선택</label>
                    <div className="grid grid-cols-7 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-800/50 rounded-2xl border border-slate-800">
                      {AVAILABLE_ICONS.map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setEditingRole({ ...editingRole, icon: iconName })}
                          className={`p-2.5 rounded-xl flex items-center justify-center transition ${
                            editingRole.icon === iconName
                              ? 'bg-indigo-600 text-white shadow ring-2 ring-indigo-400'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <RoleIcon name={iconName} className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">역할 설명</label>
                    <textarea
                      rows={2}
                      placeholder="역할의 임무를 설명하세요."
                      value={editingRole.description || ''}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                      className="w-full bg-slate-800 text-white text-sm p-3 rounded-xl border border-slate-700"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingRole(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                    >
                      저장하기
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Custom Presets & Builtin Templates */}
      {activeTab === 'presets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">학급 & 과목별 역할 템플릿 보관함</h3>
              <p className="text-xs text-slate-400">직접 제작한 나만의 템플릿과 추천 기본 세트를 1-Click 적용합니다.</p>
            </div>
            
            <button
              onClick={() => onOpenPresetModal(null)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition shrink-0"
            >
              <Plus className="w-4 h-4" /> 🎨 나만의 새 템플릿 만들기
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allPresets.map((preset) => (
              <div key={preset.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 relative">
                {preset.isCustom && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    사용자 제작 템플릿
                  </span>
                )}

                <div className="flex items-start justify-between gap-4 pr-16">
                  <div>
                    <h4 className="text-xl font-bold text-white">{preset.name}</h4>
                    <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      {preset.targetCount}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300">{preset.description}</p>

                <div className="pt-3 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block mb-2">포함 역할 ({preset.roles.length}종):</span>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {preset.roles.map((r, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                        {r.title}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    {preset.isCustom && (
                      <button
                        onClick={() => handleDeleteCustomPreset(preset.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        템플릿 삭제
                      </button>
                    )}

                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
                    >
                      <BookOpen className="w-4 h-4" /> 이 템플릿 적용하기
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Firebase Cloud Sync */}
      {activeTab === 'cloud' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Cloud className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">🔥 Firebase 클라우드 대시보드</h3>
                <p className="text-xs text-slate-400">실시간 다중 디바이스 동기화 및 클라우드 연동 상태</p>
              </div>
            </div>

            <button
              onClick={onOpenFirebaseModal}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
            >
              Firebase 연결 정보 설정하기
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400">현재 연동 상태:</span>
              <span className={`font-bold px-2.5 py-1 rounded-full ${
                firebaseConfig.enabled && firebaseConfig.apiKey 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {firebaseConfig.enabled && firebaseConfig.apiKey ? '⚡️ 연결됨 (Cloud Sync ON)' : '💾 미연동 (Local Storage ON)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400">학급 고유 ID (Classroom ID):</span>
              <span className="font-mono text-indigo-300">{firebaseConfig.classroomId || '미지정'}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Backup & JSON */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">통합 JSON 데이터 백업 다운로드</h4>
                <p className="text-xs text-slate-400">학생 명단, 역할 목록, 커스텀 템플릿, 활동별 체크 이력을 JSON 파일로 보관합니다.</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition"
            >
              <Download className="w-4 h-4" /> 백업 파일 다운로드 (.json)
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">JSON 백업 파일 복원</h4>
                <p className="text-xs text-slate-400">이전에 저장한 JSON 파일에서 학급 데이터 전체를 완벽 복원합니다.</p>
              </div>
            </div>

            <label className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold text-sm border border-slate-700 cursor-pointer transition">
              <Upload className="w-4 h-4" /> 백업 파일 선택 및 데이터 복원
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>
      )}

    </div>
  );
};
