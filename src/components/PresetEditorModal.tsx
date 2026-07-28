import React, { useState } from 'react';
import { RolePreset, Role, ActivityCategory, ActivityCategoryConfig } from '../types';
import { RoleIcon, AVAILABLE_ICONS } from './RoleIcon';
import { soundFx } from '../utils/sound';
import { X, Plus, Trash2, Layers } from 'lucide-react';

interface PresetEditorModalProps {
  preset: RolePreset | null; // null if creating new
  currentRoles: Role[];
  categories: ActivityCategoryConfig[];
  defaultCategory: ActivityCategory;
  onSavePreset: (newPreset: RolePreset) => void;
  onClose: () => void;
}

export const PresetEditorModal: React.FC<PresetEditorModalProps> = ({
  preset,
  currentRoles,
  categories,
  defaultCategory,
  onSavePreset,
  onClose,
}) => {
  const initialCategory =
    preset?.activityCategory && categories.some((c) => c.id === preset.activityCategory)
      ? preset.activityCategory
      : defaultCategory;

  const [name, setName] = useState(preset?.name || '');
  const [description, setDescription] = useState(preset?.description || '');
  const [targetCount, setTargetCount] = useState(preset?.targetCount || '20명 학급용');
  const [activityCategory, setActivityCategory] = useState<ActivityCategory>(initialCategory);
  const [rolesList, setRolesList] = useState<Omit<Role, 'id'>[]>(
    // 새 템플릿은 '현재 선택된 범주'의 역할만 초안으로 가져온다.
    preset
      ? preset.roles.map((r) => ({ ...r }))
      : currentRoles
          .filter((r) => (r.activityCategory || defaultCategory) === defaultCategory)
          .map(({ id: _id, ...rest }) => rest)
  );

  const handleAddRoleItem = () => {
    soundFx.playClick();
    setRolesList([
      ...rolesList,
      {
        title: '새 역할',
        category: 'service',
        activityCategory,
        icon: 'Sparkles',
        color: 'indigo',
        description: '역할에 대한 짧은 설명',
        count: 1,
        sopSteps: ['1단계 지침'],
      },
    ]);
  };

  const handleUpdateRoleItem = (index: number, updated: Omit<Role, 'id'>) => {
    const next = [...rolesList];
    next[index] = updated;
    setRolesList(next);
  };

  const handleDeleteRoleItem = (index: number) => {
    soundFx.playClick();
    setRolesList(rolesList.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    soundFx.playSuccess();
    const newPresetObj: RolePreset = {
      id: preset?.id || `preset_custom_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      targetCount: targetCount.trim(),
      activityCategory,
      // 템플릿 안의 역할들도 템플릿이 지정한 범주를 따르게 맞춰 둔다.
      roles: rolesList.map((r) => ({ ...r, activityCategory })),
      isCustom: true,
      createdAt: preset?.createdAt || new Date().toISOString(),
    };

    onSavePreset(newPresetObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-pop">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">
                {preset ? '나만의 템플릿 수정' : '🎨 나만의 역할 템플릿 생성'}
              </h3>
              <p className="text-xs text-slate-400">자신만의 학급/과목/모둠 맞춤형 템플릿 세트를 저장하세요.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">템플릿 이름</label>
              <input
                type="text"
                required
                placeholder="예: 4학년 1반 2학기 1인 1역 세트"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">활동 범주 (Category)</label>
              <select
                value={activityCategory}
                onChange={(e) => setActivityCategory(e.target.value as ActivityCategory)}
                className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">추천 대상 (설명 태그)</label>
              <input
                type="text"
                placeholder="예: 20명 학급 추천, 수학 탐구용"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">템플릿 상세 설명</label>
              <input
                type="text"
                placeholder="템플릿의 목적이나 특이사항을 적어주세요."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700"
              />
            </div>
          </div>

          {/* Roles inside Preset */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">포함할 역할 목록 ({rolesList.length}개)</h4>
              <button
                type="button"
                onClick={handleAddRoleItem}
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30"
              >
                <Plus className="w-3.5 h-3.5" /> 역할 항목 추가
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {rolesList.map((roleItem, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      placeholder="역할명"
                      value={roleItem.title}
                      onChange={(e) => handleUpdateRoleItem(idx, { ...roleItem, title: e.target.value })}
                      className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 flex-1"
                    />

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">인원:</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={roleItem.count}
                        onChange={(e) => handleUpdateRoleItem(idx, { ...roleItem, count: parseInt(e.target.value) || 1 })}
                        className="w-14 bg-slate-800 text-white text-xs px-2 py-1 rounded-lg border border-slate-700 text-center"
                      />

                      {/* Icon selector */}
                      <select
                        value={roleItem.icon}
                        onChange={(e) => handleUpdateRoleItem(idx, { ...roleItem, icon: e.target.value })}
                        className="bg-slate-800 text-white text-xs px-2 py-1 rounded-lg border border-slate-700"
                      >
                        {AVAILABLE_ICONS.slice(0, 10).map((iconName) => (
                          <option key={iconName} value={iconName}>{iconName}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteRoleItem(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="역할 설명"
                    value={roleItem.description}
                    onChange={(e) => handleUpdateRoleItem(idx, { ...roleItem, description: e.target.value })}
                    className="w-full bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30"
            >
              템플릿 저장하기
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
