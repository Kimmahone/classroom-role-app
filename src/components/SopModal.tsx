import React from 'react';
import { Role } from '../types';
import { RoleIcon } from './RoleIcon';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface SopModalProps {
  role: Role | null;
  onClose: () => void;
}

export const SopModal: React.FC<SopModalProps> = ({ role, onClose }) => {
  if (!role) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/70 backdrop-blur-md animate-pop">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-line-strong bg-surface p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-line">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-accent-soft/10 border border-accent-soft/20 text-accent-text">
              <RoleIcon name={role.icon} className="w-8 h-8" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 mb-1 text-xs font-semibold rounded-full bg-elevated text-muted border border-line-strong">
                {role.category.toUpperCase()}
              </span>
              <h2 className="text-2xl font-bold text-ink">{role.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-ink hover:bg-elevated transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-6 space-y-6">
          {/* Description */}
          <div className="p-4 rounded-2xl bg-elevated/60 border border-line-strong/50">
            <h4 className="text-xs font-bold text-accent-text uppercase tracking-wider mb-1">역할 개요</h4>
            <p className="text-ink text-sm leading-relaxed">{role.description}</p>
          </div>

          {/* SOP Step-by-Step */}
          <div>
            <h4 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              세부 수행 지침 (SOP)
            </h4>

            {role.sopSteps && role.sopSteps.length > 0 ? (
              <div className="space-y-3">
                {role.sopSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-elevated/30 border border-line">
                    <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-accent text-white text-xs font-bold">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-muted pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted italic">등록된 상세 수행 지침이 없습니다.</p>
            )}
          </div>

          {/* Tips / Responsibilities Notice */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold">함께 지키는 약속:</span> 자신이 맡은 역할을 책임감 있게 수행하면 우리 반 모두가 더욱 행복한 교실이 됩니다!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-line flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-white font-medium text-sm transition shadow-lg shadow-accent/30"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};
