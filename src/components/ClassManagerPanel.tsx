import React, { useState } from 'react';
import { Classroom, CATEGORY_PALETTES, paletteOf } from '../types';
import { CLASSROOM_EMOJIS, classroomSummary } from '../utils/storage';
import { soundFx } from '../utils/sound';
import {
  Plus, Trash2, Edit, Check, X, Users, Briefcase, Tag, ArrowRightLeft, Copy, School
} from 'lucide-react';

export interface ClassManagerHandlers {
  onSwitchClass: (classId: string) => void;
  onCreateClass: (draft: Omit<Classroom, 'id' | 'createdAt'>, copyFromClassId?: string) => void;
  onUpdateClass: (updated: Classroom) => void;
  onDeleteClass: (classId: string) => void;
}

interface ClassManagerPanelProps extends ClassManagerHandlers {
  classrooms: Classroom[];
  activeClassId: string;
  /** 학급을 고르면 패널을 닫아야 하는 경우(모달) */
  onAfterSwitch?: () => void;
}

type Draft = {
  name: string;
  term: string;
  emoji: string;
  color: string;
  copyFrom: string;
};

const emptyDraft = (): Draft => ({
  name: '',
  term: `${new Date().getFullYear()}학년도`,
  emoji: '🏫',
  color: 'indigo',
  copyFrom: '',
});

export const ClassManagerPanel: React.FC<ClassManagerPanelProps> = ({
  classrooms,
  activeClassId,
  onSwitchClass,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
  onAfterSwitch,
}) => {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Classroom | null>(null);

  // 학생/역할 수는 localStorage 를 직접 읽는다. 설정 화면에서 명단을 고치는 즉시
  // 숫자가 따라오도록 캐싱하지 않고 렌더마다 다시 센다(학급 수가 적어 비용이 미미하다).
  const summaries = Object.fromEntries(classrooms.map((c) => [c.id, classroomSummary(c.id)]));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    onCreateClass(
      { name, term: draft.term.trim(), emoji: draft.emoji, color: draft.color },
      draft.copyFrom || undefined
    );
    setDraft(emptyDraft());
    setCreating(false);
    onAfterSwitch?.();
  };

  const startEdit = (c: Classroom) => {
    soundFx.playClick();
    setEditingId(c.id);
    setEditDraft({ ...c });
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft || !editDraft.name.trim()) return;
    onUpdateClass({ ...editDraft, name: editDraft.name.trim(), term: editDraft.term.trim() });
    setEditingId(null);
    setEditDraft(null);
  };

  const colorPicker = (value: string, onPick: (key: string) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(CATEGORY_PALETTES).map(([key, p]) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(key)}
          aria-label={p.label}
          aria-pressed={value === key}
          className={`w-7 h-7 rounded-full transition ${p.dot} ${
            value === key ? 'ring-2 ring-offset-2 ring-offset-surface ring-accent scale-110' : 'opacity-60 hover:opacity-100'
          }`}
        />
      ))}
    </div>
  );

  const emojiPicker = (value: string, onPick: (e: string) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {CLASSROOM_EMOJIS.map((em) => (
        <button
          key={em}
          type="button"
          onClick={() => onPick(em)}
          aria-pressed={value === em}
          className={`w-9 h-9 rounded-xl text-lg transition ${
            value === em ? 'bg-accent text-white ring-2 ring-accent-soft' : 'bg-elevated hover:bg-hover'
          }`}
        >
          {em}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">

      {/* 학급 카드 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {classrooms.map((c) => {
          const palette = paletteOf(c.color);
          const isActive = c.id === activeClassId;
          const s = summaries[c.id] || { studentCount: 0, roleCount: 0, categoryCount: 0 };

          if (editingId === c.id && editDraft) {
            return (
              <form
                key={c.id}
                onSubmit={saveEdit}
                className="p-4 rounded-2xl bg-surface border-2 border-accent-soft space-y-3 md:col-span-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted mb-1 block">학급 이름</label>
                    <input
                      type="text"
                      required
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      className="w-full bg-elevated text-ink text-sm px-3.5 py-2.5 rounded-xl border border-line-strong focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted mb-1 block">학년도 · 메모</label>
                    <input
                      type="text"
                      placeholder="예: 2026학년도 1학기"
                      value={editDraft.term}
                      onChange={(e) => setEditDraft({ ...editDraft, term: e.target.value })}
                      className="w-full bg-elevated text-ink text-sm px-3.5 py-2.5 rounded-xl border border-line-strong focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-muted mb-1.5 block">아이콘</span>
                    {emojiPicker(editDraft.emoji, (em) => setEditDraft({ ...editDraft, emoji: em }))}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-muted mb-1.5 block">색상</span>
                    {colorPicker(editDraft.color, (key) => setEditDraft({ ...editDraft, color: key }))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setEditDraft(null); }}
                    className="px-4 py-2 rounded-xl bg-elevated text-muted text-xs font-bold"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent hover:bg-accent-soft text-white text-xs font-bold"
                  >
                    <Check className="w-3.5 h-3.5" /> 저장
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={c.id}
              className={`p-4 rounded-2xl border transition ${
                isActive
                  ? 'bg-accent-soft/10 border-accent-soft ring-1 ring-accent-soft/40'
                  : 'bg-surface border-line hover:border-line-strong'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-12 h-12 shrink-0 rounded-2xl border flex items-center justify-center text-2xl ${palette.badge}`}>
                  {c.emoji}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-ink truncate">{c.name}</h4>
                    {isActive && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent text-white shrink-0">
                        보는 중
                      </span>
                    )}
                  </div>
                  {c.term && <p className="text-[11px] text-muted mt-0.5">{c.term}</p>}

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-elevated text-muted border border-line">
                      <Users className="w-3 h-3" /> 학생 {s.studentCount}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-elevated text-muted border border-line">
                      <Briefcase className="w-3 h-3" /> 역할 {s.roleCount}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-elevated text-muted border border-line">
                      <Tag className="w-3 h-3" /> 범주 {s.categoryCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-line">
                {!isActive && (
                  <button
                    onClick={() => { onSwitchClass(c.id); onAfterSwitch?.(); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent hover:bg-accent-soft text-white text-xs font-bold transition"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" /> 이 학급으로 전환
                  </button>
                )}
                <button
                  onClick={() => startEdit(c)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-hover text-muted hover:text-ink text-xs font-bold border border-line transition"
                >
                  <Edit className="w-3.5 h-3.5" /> 이름·색상
                </button>
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setDraft({
                      name: `${c.name} 복사본`,
                      term: c.term,
                      emoji: c.emoji,
                      color: c.color,
                      copyFrom: c.id,
                    });
                    setCreating(true);
                  }}
                  title="이 학급의 활동 범주·역할 구성을 그대로 가진 새 학급을 만듭니다 (학생 명단은 복사되지 않습니다)"
                  className="p-2 rounded-xl bg-elevated hover:bg-hover text-muted hover:text-ink border border-line transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteClass(c.id)}
                  disabled={classrooms.length <= 1}
                  title={classrooms.length <= 1 ? '마지막 학급은 삭제할 수 없습니다' : '학급 삭제'}
                  className="ml-auto p-2 rounded-xl text-muted hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 새 학급 만들기 */}
      {!creating ? (
        <button
          onClick={() => { soundFx.playClick(); setDraft(emptyDraft()); setCreating(true); }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-line-strong text-muted hover:text-ink hover:border-accent-soft transition font-bold text-sm"
        >
          <Plus className="w-4 h-4" /> 새 학급 만들기
        </button>
      ) : (
        <form onSubmit={handleCreate} className="p-5 rounded-2xl bg-surface border-2 border-accent-soft space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-bold text-ink">
              <School className="w-4 h-4 text-accent-text" /> 새 학급 만들기
            </h4>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="p-1.5 rounded-lg text-muted hover:text-ink"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-muted mb-1 block">학급 이름 *</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="예: 6학년 3반"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full bg-elevated text-ink text-sm px-3.5 py-2.5 rounded-xl border border-line-strong focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted mb-1 block">학년도 · 메모</label>
              <input
                type="text"
                placeholder="예: 2026학년도 1학기"
                value={draft.term}
                onChange={(e) => setDraft({ ...draft, term: e.target.value })}
                className="w-full bg-elevated text-ink text-sm px-3.5 py-2.5 rounded-xl border border-line-strong focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] font-bold text-muted mb-1.5 block">아이콘</span>
              {emojiPicker(draft.emoji, (em) => setDraft({ ...draft, emoji: em }))}
            </div>
            <div>
              <span className="text-[11px] font-bold text-muted mb-1.5 block">색상</span>
              {colorPicker(draft.color, (key) => setDraft({ ...draft, color: key }))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted mb-1 block">
              활동 범주 · 역할 구성 가져오기 (선택)
            </label>
            <select
              value={draft.copyFrom}
              onChange={(e) => setDraft({ ...draft, copyFrom: e.target.value })}
              className="w-full bg-elevated text-ink text-sm px-3.5 py-2.5 rounded-xl border border-line-strong focus:ring-2 focus:ring-accent"
            >
              <option value="">가져오지 않고 기본 범주로 시작</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name} 의 구성 복사</option>
              ))}
            </select>
            <p className="text-[11px] text-faint mt-1.5">
              학생 명단과 완수 기록은 절대 복사되지 않습니다. 활동 범주와 역할 목록만 그대로 가져옵니다.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="px-4 py-2 rounded-xl bg-elevated text-muted text-xs font-bold"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-white text-xs font-bold shadow-lg shadow-accent/30 transition"
            >
              <Plus className="w-3.5 h-3.5" /> 학급 만들고 전환하기
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
