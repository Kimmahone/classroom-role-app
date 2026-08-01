import React, { useMemo, useState } from 'react';
import {
  Student, Role, RolePreset, FirebaseConfig, ActivityCategory, ActivityCategoryConfig,
  SyncState, UserProfile, Classroom, CATEGORY_PALETTES, paletteOf
} from '../types';
import { BUILTIN_ROLE_PRESETS, exportDataToJson, importDataFromJson, getTodayKey } from '../utils/storage';
import { getPeriodInfo, PERIOD_BADGE_CLASS, makeCategoryId } from '../utils/category';
import { RoleIcon, AVAILABLE_ICONS } from './RoleIcon';
import { ClassManagerPanel } from './ClassManagerPanel';
import { soundFx } from '../utils/sound';
import {
  Users, Briefcase, Download, Upload, Plus, Trash2, Edit, Sparkles, BookOpen, Layers, Cloud, X,
  ShieldAlert, LogIn, ShieldCheck, Search, CalendarClock, ArrowUp, ArrowDown, Copy, CheckSquare, Square,
  Tag, Wand2, School, SlidersHorizontal
} from 'lucide-react';

interface SettingsViewProps {
  students: Student[];
  roles: Role[];
  customPresets: RolePreset[];
  firebaseConfig: FirebaseConfig;
  categories: ActivityCategoryConfig[];
  activeCategory: ActivityCategory;
  classrooms: Classroom[];
  activeClassId: string;
  syncState: SyncState;
  syncError: string | null;
  userProfile: UserProfile | null;
  onLoginGoogle: () => void;
  onSwitchClass: (classId: string) => void;
  onCreateClass: (draft: Omit<Classroom, 'id' | 'createdAt'>, copyFromClassId?: string) => void;
  onUpdateClass: (updated: Classroom) => void;
  onDeleteClass: (classId: string) => void;
  onUpdateStudents: (students: Student[]) => void;
  onUpdateRoles: (roles: Role[]) => void;
  onUpdateCategories: (categories: ActivityCategoryConfig[]) => void;
  onUpdateCustomPresets: (presets: RolePreset[]) => void;
  onOpenFirebaseModal: () => void;
  onOpenPresetModal: (preset: RolePreset | null) => void;
  onOpenTweaks: () => void;
  onRefreshData: () => void;
}

type SettingsTab = 'classes' | 'students' | 'categories' | 'roles' | 'presets' | 'cloud' | 'backup';

export const SettingsView: React.FC<SettingsViewProps> = ({
  students,
  roles,
  customPresets,
  firebaseConfig,
  categories,
  activeCategory,
  classrooms,
  activeClassId,
  syncState,
  syncError,
  userProfile,
  onLoginGoogle,
  onSwitchClass,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
  onUpdateStudents,
  onUpdateRoles,
  onUpdateCategories,
  onUpdateCustomPresets,
  onOpenFirebaseModal,
  onOpenPresetModal,
  onOpenTweaks,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('classes');

  const activeClassroom = classrooms.find((c) => c.id === activeClassId);

  // Student Bulk Add
  const [bulkText, setBulkText] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  // Role Editing State
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

  // Role list filters & multi-select
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<string>('all');
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkCount, setBulkCount] = useState<string>('');
  const [bulkIcon, setBulkIcon] = useState<string>('');

  // Category editing
  const [editingCategory, setEditingCategory] = useState<ActivityCategoryConfig | null>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);

  const fallbackCategoryId = categories[0]?.id ?? 'daily';
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || '미분류';

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
    const target = students.find((s) => s.id === id);
    if (confirm(`${target?.name || '해당 학생'} 학생을 삭제합니다.\n이 학생의 역할 배정, 완수 체크, 역할 이력도 함께 삭제됩니다.`)) {
      soundFx.playClick();
      onUpdateStudents(students.filter((s) => s.id !== id));
    }
  };

  // --- 활동 범주 CRUD -------------------------------------------------------
  const rolesInCategory = (catId: string) =>
    roles.filter((r) => (r.activityCategory || fallbackCategoryId) === catId).length;

  const handleOpenNewCategory = () => {
    soundFx.playClick();
    setIsNewCategory(true);
    setEditingCategory({
      id: makeCategoryId(),
      name: '',
      icon: 'Sparkles',
      color: 'indigo',
      description: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    if (editingCategory.startDate && editingCategory.endDate && editingCategory.startDate > editingCategory.endDate) {
      alert('종료일이 시작일보다 빠릅니다. 기간을 다시 확인해 주세요.');
      return;
    }

    soundFx.playSuccess();
    const cleaned: ActivityCategoryConfig = { ...editingCategory, name: editingCategory.name.trim() };
    const exists = categories.some((c) => c.id === cleaned.id);
    onUpdateCategories(exists ? categories.map((c) => (c.id === cleaned.id ? cleaned : c)) : [...categories, cleaned]);
    setEditingCategory(null);
    setIsNewCategory(false);
  };

  const handleDeleteCategory = (cat: ActivityCategoryConfig) => {
    if (categories.length <= 1) {
      alert('활동 범주는 최소 1개가 필요합니다. 새 범주를 먼저 추가한 뒤 삭제해 주세요.');
      return;
    }
    const roleCount = rolesInCategory(cat.id);
    const lines = [
      `'${cat.name}' 활동 범주를 삭제합니다.`,
      '',
      roleCount > 0
        ? `· 이 범주에 속한 역할 ${roleCount}종과 해당 배정이 함께 삭제됩니다.`
        : '· 이 범주에 속한 역할은 없습니다.',
      '· 통계에 쌓인 과거 이력은 그대로 보존됩니다.',
      '',
      '계속하시겠습니까?',
    ];
    if (!confirm(lines.join('\n'))) return;
    soundFx.playClick();
    onUpdateCategories(categories.filter((c) => c.id !== cat.id));
  };

  const handleMoveCategory = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    soundFx.playClick();
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    onUpdateCategories(next);
  };

  // --- 역할 CRUD ------------------------------------------------------------
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editingRole.title) return;
    soundFx.playClick();

    const categoryForRole = editingRole.activityCategory || activeCategory || fallbackCategoryId;

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
    const target = roles.find((r) => r.id === id);
    if (confirm(`'${target?.title || '이 역할'}'을 삭제하시겠습니까?\n이 역할에 대한 현재 배정도 함께 해제됩니다.`)) {
      soundFx.playClick();
      onUpdateRoles(roles.filter((r) => r.id !== id));
      setSelectedRoleIds((prev) => prev.filter((rid) => rid !== id));
    }
  };

  // 필터 + 검색이 적용된 역할 목록
  const visibleRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    return roles.filter((r) => {
      const catId = r.activityCategory || fallbackCategoryId;
      if (roleCategoryFilter !== 'all' && catId !== roleCategoryFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.subjectName || '').toLowerCase().includes(q)
      );
    });
  }, [roles, roleCategoryFilter, roleSearch, fallbackCategoryId]);

  const visibleIds = visibleRoles.map((r) => r.id);
  const selectedVisible = selectedRoleIds.filter((id) => visibleIds.includes(id));
  const allVisibleSelected = visibleRoles.length > 0 && selectedVisible.length === visibleRoles.length;

  const toggleSelectRole = (id: string) => {
    setSelectedRoleIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    soundFx.playClick();
    setSelectedRoleIds(allVisibleSelected ? selectedRoleIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedRoleIds, ...visibleIds])));
  };

  /** 선택한 역할들에 지정한 항목만 일괄 적용한다. */
  const handleBulkApply = () => {
    if (selectedVisible.length === 0) return;

    const patch: Partial<Role> = {};
    if (bulkCategory) patch.activityCategory = bulkCategory;
    if (bulkCount) {
      const n = parseInt(bulkCount, 10);
      if (!Number.isNaN(n) && n >= 1) patch.count = n;
    }
    if (bulkIcon) patch.icon = bulkIcon;

    if (Object.keys(patch).length === 0) {
      alert('일괄 적용할 항목(활동 범주 · 필요 인원 · 아이콘)을 하나 이상 선택해 주세요.');
      return;
    }

    const summary = [
      patch.activityCategory ? `· 활동 범주 → ${categoryName(patch.activityCategory)}` : null,
      patch.count ? `· 필요 인원 → ${patch.count}명` : null,
      patch.icon ? `· 아이콘 → ${patch.icon}` : null,
    ].filter(Boolean);

    if (!confirm(`선택한 역할 ${selectedVisible.length}종에 아래 내용을 일괄 적용합니다.\n\n${summary.join('\n')}\n\n계속하시겠습니까?`)) return;

    soundFx.playSuccess();
    const selected = new Set(selectedVisible);
    onUpdateRoles(roles.map((r) => (selected.has(r.id) ? { ...r, ...patch } : r)));
    setBulkCategory('');
    setBulkCount('');
    setBulkIcon('');
  };

  const handleBulkDelete = () => {
    if (selectedVisible.length === 0) return;
    if (!confirm(`선택한 역할 ${selectedVisible.length}종을 삭제합니다.\n해당 역할의 현재 배정도 함께 해제됩니다.\n\n계속하시겠습니까?`)) return;
    soundFx.playClick();
    const selected = new Set(selectedVisible);
    onUpdateRoles(roles.filter((r) => !selected.has(r.id)));
    setSelectedRoleIds([]);
  };

  // --- 템플릿 ---------------------------------------------------------------
  const handleLoadPreset = (preset: RolePreset) => {
    const targetCategory: ActivityCategory = preset.activityCategory || fallbackCategoryId;
    const targetName = categoryName(targetCategory);

    if (!categories.some((c) => c.id === targetCategory)) {
      alert(`이 템플릿이 지정한 활동 범주가 존재하지 않습니다.\n템플릿을 수정해 현재 사용 중인 범주를 지정해 주세요.`);
      return;
    }

    const existingInCategory = roles.filter((r) => (r.activityCategory || fallbackCategoryId) === targetCategory);
    // 이름이 같은 역할은 기존 ID 를 재사용해서, 이미 배정된 학생들이 '미배정'으로 떨어지지 않게 한다.
    const idByTitle = new Map(existingInCategory.map((r) => [r.title.trim(), r.id]));
    const reusableCount = preset.roles.filter((r) => idByTitle.has(r.title.trim())).length;

    const lines = [
      `'${preset.name}' 템플릿을 [${targetName}] 범주에 적용합니다.`,
      '',
      `· 기존 역할 ${existingInCategory.length}종 → 템플릿 ${preset.roles.length}종으로 교체`,
      reusableCount > 0
        ? `· 이름이 같은 역할 ${reusableCount}종은 기존 배정이 그대로 유지됩니다.`
        : '· 이름이 겹치는 역할이 없어 이 범주의 기존 배정은 해제됩니다.',
      '',
      '계속하시겠습니까?',
    ];

    if (!confirm(lines.join('\n'))) return;

    soundFx.playSuccess();
    const usedIds = new Set<string>();
    const loadedRoles: Role[] = preset.roles.map((r, idx) => {
      const reuseId = idByTitle.get(r.title.trim());
      const id = reuseId && !usedIds.has(reuseId) ? reuseId : `r_${preset.id}_${idx}_${Date.now()}`;
      usedIds.add(id);
      return { ...r, id, activityCategory: targetCategory };
    });

    const otherRoles = roles.filter((r) => (r.activityCategory || fallbackCategoryId) !== targetCategory);
    onUpdateRoles([...otherRoles, ...loadedRoles]);
  };

  const handleDeleteCustomPreset = (preset: RolePreset) => {
    if (confirm(`'${preset.name}' 템플릿을 삭제하시겠습니까?\n이미 적용된 역할 목록은 그대로 남습니다.`)) {
      soundFx.playClick();
      onUpdateCustomPresets(customPresets.filter((p) => p.id !== preset.id));
    }
  };

  /** 기본 제공 템플릿을 내 템플릿으로 복제해서 자유롭게 수정하도록 한다. */
  const handleDuplicatePreset = (preset: RolePreset) => {
    soundFx.playClick();
    onOpenPresetModal({
      ...preset,
      id: `preset_custom_${Date.now()}`,
      name: `${preset.name} (복사본)`,
      isCustom: true,
      createdAt: new Date().toISOString(),
      roles: preset.roles.map((r) => ({ ...r })),
    });
  };

  // Export / Import
  const handleExport = () => {
    soundFx.playClick();
    const jsonStr = exportDataToJson(activeClassId, activeClassroom);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (activeClassroom?.name || '학급').replace(/[\\/:*?"<>|]/g, '_');
    a.href = url;
    a.download = `${safeName}_역할관리백업_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(
      `백업 파일의 내용으로 [${activeClassroom?.name || '현재 학급'}]의 학생 명단·역할·기록을 덮어씁니다.\n` +
      '다른 학급의 데이터는 영향을 받지 않습니다.\n\n계속하시겠습니까?'
    )) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const result = content
        ? importDataFromJson(content, activeClassId)
        : { success: false, message: '파일을 읽을 수 없습니다.', imported: [] };

      if (result.success) {
        soundFx.playSuccess();
        onRefreshData();
      }
      alert(result.message);
      e.target.value = '';
    };
    reader.onerror = () => {
      alert('파일을 읽는 중 오류가 발생했습니다.');
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const tabButton = (id: SettingsTab, label: string, Icon: typeof Users, iconClass = '') => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
        activeTab === id ? 'bg-accent text-white' : 'bg-elevated text-muted hover:text-ink'
      }`}
    >
      <Icon className={`w-4 h-4 ${activeTab === id ? '' : iconClass}`} /> {label}
    </button>
  );

  return (
    <div className="space-y-8 animate-pop">

      {/* Header */}
      <div className="p-6 rounded-3xl glass-panel border border-line-strong/60 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-ink">⚙️ 교사 통합 설정 &amp; 데이터 관리</h2>
            <p className="text-sm text-muted">학급, 학생 명단, 활동 범주와 기간, 역할 목록, 클라우드, 템플릿 및 JSON 관리를 수행합니다.</p>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-accent-soft/15 text-accent-text border border-accent-soft/30">
                <School className="w-3.5 h-3.5" />
                지금 편집 중: {activeClassroom?.emoji} {activeClassroom?.name || '학급 없음'}
              </span>
              <button
                onClick={onOpenTweaks}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-elevated text-muted border border-line hover:text-ink transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> 화면 설정 (라이트/다크)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {tabButton('classes', `학급 (${classrooms.length})`, School, 'text-accent-text')}
            {tabButton('students', `학생 명단 (${students.length})`, Users)}
            {tabButton('categories', `활동 범주 (${categories.length})`, Tag, 'text-rose-400')}
            {tabButton('roles', `역할 관리 (${roles.length})`, Briefcase)}
            {tabButton('presets', '템플릿 생성기', Layers, 'text-amber-400')}
            {tabButton('cloud', '클라우드 Sync', Cloud, 'text-emerald-400')}
            {tabButton('backup', 'JSON 백업', Download, 'text-cyan-400')}
          </div>
        </div>
      </div>

      {/* ══ TAB 0: 학급 관리 ═══════════════════════════════════════════ */}
      {activeTab === 'classes' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-ink">학급 관리 ({classrooms.length}개)</h3>
            <p className="text-xs text-muted">
              반마다 학생 명단·활동 범주·역할·배정·완수 기록이 완전히 따로 저장됩니다.
              전담·동아리·방과후처럼 구성원이 다른 집단도 각각 학급으로 만들어 관리하세요.
            </p>
          </div>

          <ClassManagerPanel
            classrooms={classrooms}
            activeClassId={activeClassId}
            onSwitchClass={onSwitchClass}
            onCreateClass={onCreateClass}
            onUpdateClass={onUpdateClass}
            onDeleteClass={onDeleteClass}
          />

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-100/90 space-y-1">
              <p className="font-bold text-emerald-300">클라우드에서도 학급별로 분리 저장됩니다</p>
              <p className="text-emerald-100/70 leading-relaxed">
                Google 로그인 상태라면 학급 하나가 <span className="font-mono">users/{'{내 계정}'}/classrooms/{'{학급 ID}'}</span> 문서
                하나에 대응합니다. 학급을 삭제하면 그 문서도 함께 삭제되며, 다른 학급 데이터는 그대로 남습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB 1: 학생 명단 ══════════════════════════════════════════ */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-surface border border-line shadow-xl">
              <h3 className="text-lg font-bold text-ink mb-4">학생 개별 추가</h3>
              <form onSubmit={handleAddSingleStudent} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted mb-1 block">학생 이름</label>
                  <input
                    type="text"
                    placeholder="예: 김민수"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full bg-elevated text-ink text-sm px-4 py-2.5 rounded-xl border border-line-strong focus:ring-2 focus:ring-accent"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-white text-sm font-bold shadow-lg shadow-accent/30 transition"
                >
                  <Plus className="w-4 h-4" /> 학생 1명 추가
                </button>
              </form>
            </div>

            <div className="p-6 rounded-3xl bg-surface border border-line shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-ink">명단 1초 일괄 등록</h3>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-xs text-muted mb-4">
                줄바꿈으로 구분된 전체 학급 명단을 한 번에 붙여넣어 자동 번호 생성으로 추가합니다.
              </p>

              {!showBulkInput ? (
                <button
                  onClick={() => setShowBulkInput(true)}
                  className="w-full py-2.5 rounded-xl bg-elevated hover:bg-hover text-accent-text font-bold text-sm border border-line-strong transition"
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
                    className="w-full bg-elevated text-ink text-xs p-3 rounded-xl border border-line-strong font-mono"
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
                      className="px-3 py-2 rounded-xl bg-elevated text-muted font-bold text-xs"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 p-6 rounded-3xl bg-surface border border-line shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
              <h3 className="text-lg font-bold text-ink">등록된 학생 목록 ({students.length}명)</h3>
              {students.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`학생 ${students.length}명 전체를 삭제합니다.\n모든 역할 배정, 완수 체크, 역할 이력이 함께 삭제되며 되돌릴 수 없습니다.\n\n계속하시겠습니까?`)) {
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
                    className="flex items-center justify-between p-3 rounded-2xl bg-elevated/60 border border-line hover:border-line-strong transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-faint">{student.number}번</span>
                      <span className="font-bold text-ink text-sm">{student.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="p-1 rounded-lg text-faint hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-faint text-sm">
                등록된 학생이 없습니다. 좌측에서 학생을 추가해 주세요.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB 2: 활동 범주 설정 ═══════════════════════════════════ */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-ink">활동 범주 &amp; 운영 기간 설정 ({categories.length}종)</h3>
              <p className="text-xs text-muted">
                범주를 직접 추가·수정·삭제하고, 활동마다 시작일과 종료일을 지정할 수 있습니다. 기간은 현황판과 헤더에 함께 표시됩니다.
              </p>
            </div>
            <button
              onClick={handleOpenNewCategory}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition shrink-0"
            >
              <Plus className="w-4 h-4" /> 새 활동 범주 추가
            </button>
          </div>

          <div className="space-y-3">
            {categories.map((cat, index) => {
              const palette = paletteOf(cat.color);
              const period = getPeriodInfo(cat, getTodayKey());
              return (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`p-2.5 rounded-xl border shrink-0 ${palette.badge}`}>
                      <RoleIcon name={cat.icon} className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-ink truncate">{cat.name}</h4>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-elevated text-muted border border-line-strong">
                          역할 {rolesInCategory(cat.id)}종
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${PERIOD_BADGE_CLASS[period.status]}`}>
                          <CalendarClock className="w-3 h-3" />
                          {period.rangeLabel ? `${period.rangeLabel} · ${period.label}` : '상시 운영'}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1 line-clamp-1">{cat.description || '설명 없음'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveCategory(index, -1)}
                      disabled={index === 0}
                      title="위로 이동"
                      className="p-2 rounded-lg text-muted hover:text-ink hover:bg-elevated disabled:opacity-30 disabled:hover:bg-transparent transition"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveCategory(index, 1)}
                      disabled={index === categories.length - 1}
                      title="아래로 이동"
                      className="p-2 rounded-lg text-muted hover:text-ink hover:bg-elevated disabled:opacity-30 disabled:hover:bg-transparent transition"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        setIsNewCategory(false);
                        setEditingCategory({ ...cat });
                      }}
                      title="범주 수정"
                      className="p-2 rounded-lg text-muted hover:text-ink hover:bg-elevated transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      title="범주 삭제"
                      className="p-2 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 범주 편집 모달 */}
          {editingCategory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/70 backdrop-blur-md animate-pop">
              <div className="w-full max-w-xl bg-surface border border-line-strong rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-line">
                  <h3 className="text-xl font-bold text-ink">
                    {isNewCategory ? '새 활동 범주 만들기' : '활동 범주 수정'}
                  </h3>
                  <button
                    onClick={() => { setEditingCategory(null); setIsNewCategory(false); }}
                    className="p-2 text-muted hover:text-ink"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-muted mb-1 block">범주 이름</label>
                    <input
                      type="text"
                      required
                      placeholder="예: 2학기 학급 동아리"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      className="w-full bg-elevated text-ink text-sm px-4 py-2.5 rounded-xl border border-line-strong focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted mb-1 block">범주 설명</label>
                    <textarea
                      rows={2}
                      placeholder="이 활동이 무엇인지 짧게 설명해 주세요."
                      value={editingCategory.description}
                      onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                      className="w-full bg-elevated text-ink text-sm p-3 rounded-xl border border-line-strong"
                    />
                  </div>

                  {/* 활동 기간 */}
                  <div className="p-4 rounded-2xl bg-elevated/50 border border-line space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-ink">활동 운영 기간</span>
                      <span className="text-[11px] text-faint">비워 두면 상시 운영으로 표시됩니다.</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-muted mb-1 block">시작일</label>
                        <input
                          type="date"
                          value={editingCategory.startDate || ''}
                          onChange={(e) => setEditingCategory({ ...editingCategory, startDate: e.target.value })}
                          className="w-full bg-elevated text-ink text-xs px-3 py-2 rounded-xl border border-line-strong"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-muted mb-1 block">종료일</label>
                        <input
                          type="date"
                          value={editingCategory.endDate || ''}
                          onChange={(e) => setEditingCategory({ ...editingCategory, endDate: e.target.value })}
                          className="w-full bg-elevated text-ink text-xs px-3 py-2 rounded-xl border border-line-strong"
                        />
                      </div>
                    </div>
                    {(editingCategory.startDate || editingCategory.endDate) && (
                      <button
                        type="button"
                        onClick={() => setEditingCategory({ ...editingCategory, startDate: '', endDate: '' })}
                        className="text-[11px] font-bold text-muted hover:text-ink"
                      >
                        기간 지우고 상시 운영으로 되돌리기
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted mb-2 block">색상</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(CATEGORY_PALETTES).map(([key, p]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setEditingCategory({ ...editingCategory, color: key })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                            editingCategory.color === key
                              ? 'bg-hover text-ink border-line-strong ring-2 ring-accent'
                              : 'bg-elevated text-muted border-line-strong hover:text-ink'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${p.dot}`} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted mb-2 block">아이콘</label>
                    <div className="grid grid-cols-7 gap-2 max-h-36 overflow-y-auto p-2 bg-elevated/50 rounded-2xl border border-line">
                      {AVAILABLE_ICONS.map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setEditingCategory({ ...editingCategory, icon: iconName })}
                          className={`p-2.5 rounded-xl flex items-center justify-center transition ${
                            editingCategory.icon === iconName
                              ? 'bg-accent text-white shadow ring-2 ring-indigo-400'
                              : 'bg-elevated text-muted hover:text-ink'
                          }`}
                        >
                          <RoleIcon name={iconName} className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => { setEditingCategory(null); setIsNewCategory(false); }}
                      className="px-4 py-2 rounded-xl bg-elevated text-muted text-xs font-bold"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-xl bg-accent hover:bg-accent-soft text-white text-xs font-bold shadow-lg shadow-accent/30"
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

      {/* ══ TAB 3: 역할 관리 ═══════════════════════════════════════ */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-ink">역할 관리 ({roles.length}종)</h3>
              <p className="text-xs text-muted">활동 범주로 걸러 보고, 개별 수정·삭제하거나 여러 개를 선택해 한 번에 바꿀 수 있습니다.</p>
            </div>
            <button
              onClick={() =>
                setEditingRole({
                  title: '',
                  category: 'cleaning',
                  activityCategory: roleCategoryFilter !== 'all' ? roleCategoryFilter : (activeCategory || fallbackCategoryId),
                  icon: 'Sparkles',
                  color: 'indigo',
                  description: '',
                  count: 1,
                  sopSteps: ['1단계 지침'],
                })
              }
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-white font-bold text-sm shadow-lg shadow-accent/30 transition shrink-0"
            >
              <Plus className="w-4 h-4" /> 새 역할 추가
            </button>
          </div>

          {/* 필터 바 */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-3 rounded-2xl bg-elevated/40 border border-line">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <button
                onClick={() => setRoleCategoryFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition ${
                  roleCategoryFilter === 'all' ? 'bg-accent text-white shadow' : 'bg-elevated text-muted hover:text-ink'
                }`}
              >
                전체 ({roles.length})
              </button>
              {categories.map((cat) => {
                const count = rolesInCategory(cat.id);
                const palette = paletteOf(cat.color);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setRoleCategoryFilter(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap border transition ${
                      roleCategoryFilter === cat.id ? palette.activeChip : palette.chip
                    }`}
                  >
                    <RoleIcon name={cat.icon} className="w-3.5 h-3.5" />
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative flex-1 min-w-[180px] lg:ml-auto">
              <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-muted" />
              <input
                type="text"
                placeholder="역할 이름 · 설명 · 과목 검색..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="w-full bg-elevated text-ink text-xs pl-8 pr-3 py-1.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-accent placeholder-faint"
              />
            </div>
          </div>

          {/* 선택 & 일괄 수정 바 */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-3 p-3 rounded-2xl bg-surface border border-line">
            <button
              onClick={toggleSelectAllVisible}
              disabled={visibleRoles.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-elevated text-muted hover:text-ink border border-line-strong disabled:opacity-40 transition shrink-0"
            >
              {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-accent-text" /> : <Square className="w-4 h-4" />}
              {allVisibleSelected ? '전체 선택 해제' : `보이는 ${visibleRoles.length}종 전체 선택`}
            </button>

            <span className="text-xs font-bold text-muted shrink-0">
              선택됨 <span className="text-accent-text">{selectedVisible.length}</span>종
            </span>

            {selectedVisible.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="bg-elevated text-ink text-xs font-bold px-2.5 py-1.5 rounded-lg border border-line-strong max-w-[180px]"
                >
                  <option value="">활동 범주 변경 안 함</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>→ {c.name}</option>
                  ))}
                </select>

                <input
                  type="number"
                  min={1}
                  max={40}
                  placeholder="인원"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(e.target.value)}
                  className="w-20 bg-elevated text-ink text-xs px-2.5 py-1.5 rounded-lg border border-line-strong"
                  title="선택한 역할의 필요 인원을 일괄 설정"
                />

                <select
                  value={bulkIcon}
                  onChange={(e) => setBulkIcon(e.target.value)}
                  className="bg-elevated text-ink text-xs font-bold px-2.5 py-1.5 rounded-lg border border-line-strong"
                >
                  <option value="">아이콘 변경 안 함</option>
                  {AVAILABLE_ICONS.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>

                <button
                  onClick={handleBulkApply}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition"
                >
                  <Wand2 className="w-3.5 h-3.5" /> 선택 항목 일괄 적용
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 text-xs font-bold border border-rose-500/40 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 선택 삭제
                </button>

                <button
                  onClick={() => setSelectedRoleIds([])}
                  className="px-2 py-1.5 text-xs font-bold text-muted hover:text-ink"
                >
                  선택 해제
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-faint xl:ml-auto">
                역할을 선택하면 활동 범주 · 필요 인원 · 아이콘을 한 번에 바꿀 수 있습니다.
              </span>
            )}
          </div>

          {/* 역할 목록 */}
          {visibleRoles.length > 0 ? (
            <div className="space-y-2">
              {visibleRoles.map((role) => {
                const catId = role.activityCategory || fallbackCategoryId;
                const cat = categories.find((c) => c.id === catId);
                const palette = paletteOf(cat?.color);
                const isSelected = selectedRoleIds.includes(role.id);
                return (
                  <div
                    key={role.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition ${
                      isSelected ? 'bg-accent-soft/10 border-accent-soft/50' : 'bg-surface border-line hover:border-line-strong'
                    }`}
                  >
                    <button
                      onClick={() => toggleSelectRole(role.id)}
                      aria-pressed={isSelected}
                      className="p-1 shrink-0 text-faint hover:text-accent-text transition"
                      title="이 역할 선택"
                    >
                      {isSelected ? <CheckSquare className="w-5 h-5 text-accent-text" /> : <Square className="w-5 h-5" />}
                    </button>

                    <span className="p-2 rounded-xl bg-accent-soft/10 text-accent-text border border-accent-soft/20 shrink-0">
                      <RoleIcon name={role.icon} className="w-4 h-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-ink text-sm truncate">{role.title}</h4>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${palette.badge}`}>
                          {cat?.name || '미분류 범주'}
                        </span>
                        {role.subjectName && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-elevated text-muted border border-line-strong">
                            {role.subjectName}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-faint">{role.count}명</span>
                      </div>
                      <p className="text-xs text-muted truncate mt-0.5">{role.description || '설명 없음'}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingRole(role)}
                        title="개별 수정"
                        className="p-2 rounded-lg text-muted hover:text-ink hover:bg-elevated transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        title="개별 삭제"
                        className="p-2 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-surface/60 rounded-3xl border border-line text-muted text-sm">
              {roles.length === 0
                ? '등록된 역할이 없습니다. [새 역할 추가] 또는 [템플릿 생성기]에서 시작해 보세요.'
                : '조건에 맞는 역할이 없습니다. 필터나 검색어를 확인해 주세요.'}
            </div>
          )}

          {/* Edit Role Modal */}
          {editingRole && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/70 backdrop-blur-md animate-pop">
              <div className="w-full max-w-xl bg-surface border border-line-strong rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-line">
                  <h3 className="text-xl font-bold text-ink">
                    {editingRole.id ? '역할 수정' : '새 역할 작성'}
                  </h3>
                  <button onClick={() => setEditingRole(null)} className="p-2 text-muted hover:text-ink">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveRole} className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-muted mb-1 block">활동 범주 (Category)</label>
                      <select
                        value={editingRole.activityCategory || fallbackCategoryId}
                        onChange={(e) => setEditingRole({ ...editingRole, activityCategory: e.target.value })}
                        className="w-full bg-elevated text-ink text-xs px-3.5 py-2.5 rounded-xl border border-line-strong"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted mb-1 block">과목명 (선택: 과목별 역할 시)</label>
                      <input
                        type="text"
                        placeholder="예: 수학, 과학, 국어"
                        value={editingRole.subjectName || ''}
                        onChange={(e) => setEditingRole({ ...editingRole, subjectName: e.target.value })}
                        className="w-full bg-elevated text-ink text-xs px-3.5 py-2.5 rounded-xl border border-line-strong"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-muted mb-1 block">역할 이름</label>
                      <input
                        type="text"
                        required
                        placeholder="예: 칠판 도우미"
                        value={editingRole.title || ''}
                        onChange={(e) => setEditingRole({ ...editingRole, title: e.target.value })}
                        className="w-full bg-elevated text-ink text-sm px-4 py-2 rounded-xl border border-line-strong"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted mb-1 block">필요 인원 (명)</label>
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={editingRole.count || 1}
                        onChange={(e) => setEditingRole({ ...editingRole, count: parseInt(e.target.value) || 1 })}
                        className="w-full bg-elevated text-ink text-sm px-4 py-2 rounded-xl border border-line-strong"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted mb-2 block">아이콘 선택</label>
                    <div className="grid grid-cols-7 gap-2 max-h-36 overflow-y-auto p-2 bg-elevated/50 rounded-2xl border border-line">
                      {AVAILABLE_ICONS.map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setEditingRole({ ...editingRole, icon: iconName })}
                          className={`p-2.5 rounded-xl flex items-center justify-center transition ${
                            editingRole.icon === iconName
                              ? 'bg-accent text-white shadow ring-2 ring-indigo-400'
                              : 'bg-elevated text-muted hover:text-ink'
                          }`}
                        >
                          <RoleIcon name={iconName} className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted mb-1 block">역할 설명</label>
                    <textarea
                      rows={2}
                      placeholder="역할의 임무를 설명하세요."
                      value={editingRole.description || ''}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                      className="w-full bg-elevated text-ink text-sm p-3 rounded-xl border border-line-strong"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted mb-1 block">
                      역할 수행 지침 (SOP) — 한 줄에 한 단계씩
                    </label>
                    <textarea
                      rows={3}
                      placeholder={`쉬는 시간 종이 울리면 칠판을 지웁니다.\n분필 가루를 텁니다.`}
                      value={(editingRole.sopSteps || []).join('\n')}
                      onChange={(e) =>
                        setEditingRole({
                          ...editingRole,
                          sopSteps: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className="w-full bg-elevated text-ink text-xs p-3 rounded-xl border border-line-strong"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setEditingRole(null)}
                      className="px-4 py-2 rounded-xl bg-elevated text-muted text-xs font-bold"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-xl bg-accent hover:bg-accent-soft text-white text-xs font-bold shadow-lg shadow-accent/30"
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

      {/* ══ TAB 4: 템플릿 보관함 ═══════════════════════════════════ */}
      {activeTab === 'presets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-ink">학급 &amp; 과목별 역할 템플릿 보관함</h3>
              <p className="text-xs text-muted">
                내가 만든 템플릿은 언제든 수정·삭제할 수 있고, 기본 제공 템플릿은 복제해서 내 템플릿으로 고칠 수 있습니다.
              </p>
            </div>

            <button
              onClick={() => onOpenPresetModal(null)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition shrink-0"
            >
              <Plus className="w-4 h-4" /> 🎨 나만의 새 템플릿 만들기
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allPresets.map((preset) => {
              const targetCat = categories.find((c) => c.id === preset.activityCategory);
              return (
                <div key={preset.id} className="p-6 rounded-3xl bg-surface border border-line shadow-xl space-y-4 relative">
                  <span className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    preset.isCustom
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-elevated text-muted border-line-strong'
                  }`}>
                    {preset.isCustom ? '내 템플릿' : '기본 제공'}
                  </span>

                  <div className="pr-24">
                    <h4 className="text-xl font-bold text-ink">{preset.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-soft/20 text-accent-text">
                        {preset.targetCount}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        targetCat
                          ? 'bg-elevated text-muted border-line-strong'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                      }`}>
                        {targetCat ? `적용 대상: ${targetCat.name}` : '⚠ 없는 활동 범주'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted">{preset.description}</p>

                  <div className="pt-3 border-t border-line">
                    <span className="text-xs font-bold text-muted block mb-2">포함 역할 ({preset.roles.length}종):</span>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {preset.roles.map((r, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-elevated text-muted border border-line-strong">
                          {r.title}
                          {r.count > 1 && <b className="text-faint"> ×{r.count}</b>}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {preset.isCustom ? (
                        <>
                          <button
                            onClick={() => {
                              soundFx.playClick();
                              onOpenPresetModal(preset);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-hover text-ink font-bold text-xs border border-line-strong transition"
                          >
                            <Edit className="w-3.5 h-3.5" /> 템플릿 수정
                          </button>
                          <button
                            onClick={() => handleDuplicatePreset(preset)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-hover text-muted font-bold text-xs border border-line-strong transition"
                          >
                            <Copy className="w-3.5 h-3.5" /> 복제
                          </button>
                          <button
                            onClick={() => handleDeleteCustomPreset(preset)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 text-rose-300 font-bold text-xs border border-rose-500/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> 삭제
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDuplicatePreset(preset)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-hover text-ink font-bold text-xs border border-line-strong transition"
                          title="기본 템플릿은 직접 수정할 수 없으므로 복제본을 만들어 편집합니다."
                        >
                          <Copy className="w-3.5 h-3.5" /> 복제해서 수정
                        </button>
                      )}

                      <button
                        onClick={() => handleLoadPreset(preset)}
                        className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-soft text-white font-bold text-xs shadow-lg shadow-accent/30 transition"
                      >
                        <BookOpen className="w-4 h-4" /> 적용하기
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TAB 5: 클라우드 Sync ═══════════════════════════════════ */}
      {activeTab === 'cloud' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line shadow-xl space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-accent-soft/10 text-accent-text border border-accent-soft/20">
                <Cloud className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-ink">🔥 Firebase 클라우드 대시보드</h3>
                <p className="text-xs text-muted">실시간 다중 디바이스 동기화 및 클라우드 연동 상태</p>
              </div>
            </div>

            <button
              onClick={onOpenFirebaseModal}
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-white font-bold text-xs shadow-lg shadow-accent/30 transition"
            >
              Firebase 연결 정보 설정하기
            </button>
          </div>

          {/* 개인정보 보호 안내 */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-100/90 space-y-1">
              <p className="font-bold text-emerald-300">학급 데이터는 선생님 계정에만 저장됩니다</p>
              <p className="text-emerald-100/70 leading-relaxed">
                학생 이름이 포함된 데이터는 Google 로그인 후 <span className="font-mono">users/{'{내 계정}'}/classrooms/</span> 경로에만
                기록되며, 다른 사용자는 접근할 수 없습니다. 로그인하지 않으면 이 기기에만 저장됩니다.
              </p>
            </div>
          </div>

          {/* 로그인 필요 경고 */}
          {syncState === 'needs-login' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-100/90 flex-1">
                클라우드 동기화가 켜져 있지만 <b>로그인하지 않아 저장되지 않고 있습니다.</b> Google 로그인을 해주세요.
              </p>
              <button
                onClick={onLoginGoogle}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" /> 구글 로그인
              </button>
            </div>
          )}

          {syncState === 'error' && syncError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-200">
              <b className="text-rose-300">동기화 오류:</b> {syncError}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-elevated/60 border border-line space-y-3">
            <div className="flex items-center justify-between text-xs gap-3">
              <span className="font-bold text-muted">현재 연동 상태:</span>
              <span className={`font-bold px-2.5 py-1 rounded-full text-right ${
                syncState === 'idle' || syncState === 'saving'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : syncState === 'needs-login' || syncState === 'error'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-elevated text-muted'
              }`}>
                {syncState === 'off' && '💾 로컬 전용 (이 기기에만 저장)'}
                {syncState === 'needs-login' && '🔒 로그인 필요 — 저장되지 않음'}
                {syncState === 'saving' && '⏫ 클라우드 저장 중...'}
                {syncState === 'idle' && '⚡️ 실시간 동기화 중'}
                {syncState === 'error' && '⚠️ 동기화 오류'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs gap-3">
              <span className="font-bold text-muted">로그인 계정:</span>
              <span className="font-mono text-accent-text truncate">
                {userProfile?.email || userProfile?.displayName || '로그인하지 않음'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs gap-3">
              <span className="font-bold text-muted">학급 고유 ID (Classroom ID):</span>
              <span className="font-mono text-accent-text">{firebaseConfig.classroomId || '미지정'}</span>
            </div>

            <div className="flex items-center justify-between text-xs gap-3">
              <span className="font-bold text-muted">Firebase 프로젝트:</span>
              <span className="font-mono text-accent-text truncate">{firebaseConfig.projectId || '미지정'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB 6: 백업 ═══════════════════════════════════════════ */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-surface border border-line shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-ink">통합 JSON 데이터 백업 다운로드</h4>
                <p className="text-xs text-muted">
                  학생 명단, 활동 범주와 기간, 역할 목록, 커스텀 템플릿, 활동별 체크 이력, 역할 배정 이력을 JSON 파일로 보관합니다.
                  <span className="block mt-1 text-faint">보안을 위해 Firebase 접속 정보는 백업에 포함되지 않습니다.</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition"
            >
              <Download className="w-4 h-4" /> 백업 파일 다운로드 (.json)
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-line shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-accent-soft/10 text-accent-text border border-accent-soft/20">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-ink">JSON 백업 파일 복원</h4>
                <p className="text-xs text-muted">이전에 저장한 JSON 파일에서 학급 데이터 전체를 완벽 복원합니다.</p>
              </div>
            </div>

            <label className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-elevated hover:bg-hover text-accent-text font-bold text-sm border border-line-strong cursor-pointer transition">
              <Upload className="w-4 h-4" /> 백업 파일 선택 및 데이터 복원
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>
      )}

    </div>
  );
};
