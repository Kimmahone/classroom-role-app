import React, { useState } from 'react';
import { FirebaseConfig, UserProfile } from '../types';
import { testFirebaseConnection } from '../services/firebase';
import { soundFx } from '../utils/sound';
import { Cloud, X, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react';

interface FirebaseConfigModalProps {
  config: FirebaseConfig;
  userProfile: UserProfile | null;
  onSave: (config: FirebaseConfig) => void;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ config, userProfile, onSave, onClose }) => {
  const [formData, setFormData] = useState<FirebaseConfig>({ ...config });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleTestConnection = async () => {
    soundFx.playClick();
    setTesting(true);
    setTestResult(null);
    const result = await testFirebaseConnection(formData);
    setTesting(false);
    setTestResult(result);
    if (result.success) soundFx.playSuccess();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playSuccess();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-pop">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">🔥 Firebase 클라우드 연동 설정</h3>
              <p className="text-xs text-slate-400">교실 TV, 교사 PC, 태블릿 간 데이터 실시간 동기화</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Guide */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-300 flex items-center gap-1">
              💡 Firebase 무상 등록 및 사용 가이드
            </span>
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
            >
              Console 열기 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-slate-400">
            구글 계정으로 Firebase 콘솔에 무료 프로젝트를 생성하고, Firestore Database를 시작한 후 아래 정보를 입력해 주세요. (미입력 시 `localStorage`로 정상 동작)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 저장 위치 안내 */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              학생 이름이 담긴 데이터는 <b className="text-emerald-300">Google 로그인한 선생님 본인 계정</b>
              (<span className="font-mono">users/{'{uid}'}/classrooms/</span>) 아래에만 저장되며 다른 사용자는 열람할 수 없습니다.
              로그인하지 않으면 클라우드에 아무것도 전송되지 않고 이 기기에만 저장됩니다.
            </p>
          </div>

          {/* Cloud Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div>
              <span className="text-sm font-bold text-white block">클라우드 자동 동기화 사용</span>
              <span className="text-xs text-slate-400">다른 디바이스와 실시간 데이터 연동 (Google 로그인 필요)</span>
            </div>
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
            />
          </div>

          {formData.enabled && !userProfile && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>저장 후 헤더의 <b>[구글 로그인]</b>을 눌러야 실제 동기화가 시작됩니다.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">학급 고유 ID (Classroom ID)</label>
              <input
                type="text"
                required
                placeholder="예: my_class_2026"
                value={formData.classroomId}
                onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Project ID</label>
              <input
                type="text"
                placeholder="예: my-school-app"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">API Key</label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Auth Domain (선택)</label>
              <input
                type="text"
                placeholder="my-app.firebaseapp.com"
                value={formData.authDomain}
                onChange={(e) => setFormData({ ...formData, authDomain: e.target.value })}
                className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">App ID (선택)</label>
              <input
                type="text"
                placeholder="1:123456789:web:abcdef"
                value={formData.appId}
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700"
              />
            </div>
          </div>

          {/* Connection Test Result */}
          {testResult && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              testResult.success 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !formData.apiKey || !formData.projectId}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs border border-slate-700 disabled:opacity-50 transition"
            >
              {testing ? '연결 테스트 중...' : '🔌 연결 테스트'}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
              >
                설정 저장
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
