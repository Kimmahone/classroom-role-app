import React from 'react';
import { Classroom } from '../types';
import { ClassManagerPanel, ClassManagerHandlers } from './ClassManagerPanel';
import { X, School } from 'lucide-react';

interface ClassManagerModalProps extends ClassManagerHandlers {
  classrooms: Classroom[];
  activeClassId: string;
  onClose: () => void;
}

export const ClassManagerModal: React.FC<ClassManagerModalProps> = ({
  classrooms,
  activeClassId,
  onClose,
  ...handlers
}) => (
  <div
    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-scrim/70 backdrop-blur-md animate-pop"
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full sm:max-w-3xl bg-canvas border border-line-strong rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl"
    >
      <div className="flex items-center justify-between pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-accent-soft/15 text-accent-text border border-accent-soft/30">
            <School className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-ink">학급 관리</h3>
            <p className="text-xs text-muted">
              학급마다 학생 명단·활동 범주·역할·완수 기록이 완전히 분리되어 저장됩니다.
            </p>
          </div>
        </div>
        <button onClick={onClose} aria-label="닫기" className="p-2 rounded-xl text-muted hover:text-ink hover:bg-elevated transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      <ClassManagerPanel
        classrooms={classrooms}
        activeClassId={activeClassId}
        onAfterSwitch={onClose}
        {...handlers}
      />
    </div>
  </div>
);
