import React from 'react';
import {
  AppPrefs, ACCENT_OPTIONS, DENSITY_LABEL, Density, ThemeMode, DEFAULT_PREFS
} from '../utils/prefs';
import { soundFx } from '../utils/sound';
import {
  X, Sun, Moon, Monitor, Palette, Type, LayoutGrid, Volume2, Vibrate, PartyPopper,
  Sparkles, Hash, CircleUser, RotateCcw
} from 'lucide-react';

interface TweaksModalProps {
  prefs: AppPrefs;
  onChange: (patch: Partial<AppPrefs>) => void;
  onClose: () => void;
}

const THEME_OPTIONS: { id: ThemeMode; label: string; Icon: typeof Sun; hint: string }[] = [
  { id: 'light', label: '라이트', Icon: Sun, hint: '밝은 교실·프로젝터에 유리' },
  { id: 'dark', label: '다크', Icon: Moon, hint: '어두운 교실·야간 작업에 유리' },
  { id: 'system', label: '기기 설정', Icon: Monitor, hint: '기기 테마를 그대로 따라감' },
];

const DENSITY_OPTIONS: Density[] = ['roomy', 'normal', 'compact'];

/** 라벨 + 설명 + 스위치 한 줄 */
const ToggleRow: React.FC<{
  Icon: typeof Sun;
  label: string;
  hint: string;
  checked: boolean;
  onToggle: () => void;
}> = ({ Icon, label, hint, checked, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    role="switch"
    aria-checked={checked}
    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-elevated border border-line hover:border-line-strong transition text-left"
  >
    <span className={`p-2 rounded-xl border shrink-0 ${
      checked ? 'bg-accent-soft/15 text-accent-text border-accent-soft/30' : 'bg-surface text-faint border-line'
    }`}>
      <Icon className="w-4 h-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-ink">{label}</span>
      <span className="block text-[11px] text-muted">{hint}</span>
    </span>
    <span className={`relative w-11 h-6 rounded-full shrink-0 transition ${checked ? 'bg-accent' : 'bg-line-strong'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </span>
  </button>
);

export const TweaksModal: React.FC<TweaksModalProps> = ({ prefs, onChange, onClose }) => {
  const set = <K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    soundFx.playClick();
    onChange({ [key]: value } as Partial<AppPrefs>);
  };

  const handleReset = () => {
    if (!confirm('화면 설정을 모두 기본값으로 되돌립니다. 계속하시겠습니까?')) return;
    soundFx.playClick();
    onChange({ ...DEFAULT_PREFS });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-scrim/70 backdrop-blur-md animate-pop"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-surface border border-line-strong rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-accent-soft/15 text-accent-text border border-accent-soft/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-ink">화면 &amp; 사용 환경 설정</h3>
              <p className="text-xs text-muted">이 기기에만 적용됩니다. 학급 데이터에는 영향이 없습니다.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="닫기" className="p-2 rounded-xl text-muted hover:text-ink hover:bg-elevated transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 테마 ─────────────────────────────────────────────── */}
        <section className="space-y-2.5">
          <h4 className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wide">
            <Sun className="w-3.5 h-3.5" /> 화면 모드
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ id, label, Icon, hint }) => (
              <button
                key={id}
                onClick={() => set('theme', id)}
                aria-pressed={prefs.theme === id}
                title={hint}
                className={`flex flex-col items-center gap-1.5 px-3 py-4 rounded-2xl border text-xs font-bold transition ${
                  prefs.theme === id
                    ? 'bg-accent text-white border-accent-soft shadow-lg shadow-accent/25'
                    : 'bg-elevated text-muted border-line hover:text-ink hover:border-line-strong'
                }`}
              >
                <Icon className="w-6 h-6" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ── 강조색 ───────────────────────────────────────────── */}
        <section className="space-y-2.5">
          <h4 className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wide">
            <Palette className="w-3.5 h-3.5" /> 강조 색상
          </h4>
          <div className="flex flex-wrap gap-2">
            {ACCENT_OPTIONS.map(({ id, label, swatch }) => (
              <button
                key={id}
                onClick={() => set('accent', id)}
                aria-pressed={prefs.accent === id}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                  prefs.accent === id
                    ? 'bg-elevated text-ink border-line-strong ring-2 ring-accent'
                    : 'bg-elevated text-muted border-line hover:text-ink'
                }`}
              >
                <span className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: swatch }} />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ── 밀도 & 글자 크기 ─────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <h4 className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wide">
              <LayoutGrid className="w-3.5 h-3.5" /> 현황판 카드 밀도
            </h4>
            <div className="flex gap-2">
              {DENSITY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => set('density', d)}
                  aria-pressed={prefs.density === d}
                  className={`flex-1 px-2 py-2.5 rounded-xl text-xs font-bold border transition ${
                    prefs.density === d
                      ? 'bg-accent text-white border-accent-soft'
                      : 'bg-elevated text-muted border-line hover:text-ink'
                  }`}
                >
                  {DENSITY_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wide">
              <Type className="w-3.5 h-3.5" /> 글자 크기
              <span className="ml-auto normal-case text-accent-text">{Math.round(prefs.fontScale * 100)}%</span>
            </h4>
            <input
              type="range"
              min={0.9}
              max={1.3}
              step={0.05}
              value={prefs.fontScale}
              onChange={(e) => onChange({ fontScale: parseFloat(e.target.value) })}
              className="w-full accent-accent"
              aria-label="글자 크기 배율"
            />
            <div className="flex justify-between text-[10px] font-bold text-faint">
              <span>작게</span><span>기본</span><span>크게</span>
            </div>
          </div>
        </section>

        {/* ── 피드백 ───────────────────────────────────────────── */}
        <section className="space-y-2.5">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wide">터치 &amp; 피드백</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ToggleRow
              Icon={Volume2}
              label="효과음"
              hint="체크·완수 시 소리로 알려 줍니다"
              checked={prefs.sound}
              onToggle={() => set('sound', !prefs.sound)}
            />
            <ToggleRow
              Icon={Vibrate}
              label="진동 피드백"
              hint="태블릿·휴대폰에서만 동작합니다"
              checked={prefs.haptics}
              onToggle={() => set('haptics', !prefs.haptics)}
            />
            <ToggleRow
              Icon={PartyPopper}
              label="전원 완수 축하 효과"
              hint="모두 완수하면 색종이가 날립니다"
              checked={prefs.confetti}
              onToggle={() => set('confetti', !prefs.confetti)}
            />
            <ToggleRow
              Icon={Sparkles}
              label="애니메이션"
              hint="끄면 화면 전환이 즉시 이뤄집니다"
              checked={prefs.animations}
              onToggle={() => set('animations', !prefs.animations)}
            />
          </div>
        </section>

        {/* ── 현황판 표시 ──────────────────────────────────────── */}
        <section className="space-y-2.5">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wide">현황판 표시</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ToggleRow
              Icon={Hash}
              label="출석 번호 표시"
              hint="카드에 번호를 함께 보여 줍니다"
              checked={prefs.showNumbers}
              onToggle={() => set('showNumbers', !prefs.showNumbers)}
            />
            <ToggleRow
              Icon={CircleUser}
              label="이름 아바타 표시"
              hint="이름 첫 글자로 만든 색 동그라미"
              checked={prefs.showAvatars}
              onToggle={() => set('showAvatars', !prefs.showAvatars)}
            />
          </div>
        </section>

        <div className="flex items-center justify-between pt-4 border-t border-line">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-muted hover:text-ink hover:bg-elevated transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 기본값으로
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-white text-sm font-bold shadow-lg shadow-accent/30 transition"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
};
