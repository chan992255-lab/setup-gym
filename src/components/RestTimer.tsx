import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import { clamp } from '../lib/data';

export interface RestState {
  total: number;
  remaining: number;
  running: boolean;
  finished: boolean;
}

interface RestTimerProps {
  state: RestState | null;
  preset: number;
  onStart: (seconds: number) => void;
  onToggle: () => void;
  onReset: () => void;
  onDismiss: () => void;
  onPresetChange: (seconds: number) => void;
}

const clock = (seconds: number): string => {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

export default function RestTimer({
  state,
  preset,
  onStart,
  onToggle,
  onReset,
  onDismiss,
  onPresetChange,
}: RestTimerProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('120');

  // "직접" 입력을 열면 프리셋 input 에 포커스
  useEffect(() => {
    if (!customOpen) setCustomValue((prev) => (preset === 60 || preset === 90 ? prev : String(preset)));
  }, [customOpen, preset]);

  const total = state?.total ?? preset;
  const remaining = state?.remaining ?? preset;
  const progress = total > 0 ? clamp(remaining / total, 0, 1) : 1;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  const applyCustom = () => {
    const seconds = clamp(Math.round(Number(customValue) || 0), 10, 600);
    onPresetChange(seconds);
    onStart(seconds);
    setCustomOpen(false);
  };

  const statusLabel = !state
    ? '대기 중'
    : state.finished
      ? '휴식 완료'
      : state.running
        ? '휴식 중'
        : '일시정지';

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer size={15} className="text-emerald-300" />
          <h3 className="text-[13px] font-extrabold tracking-tight text-white/80">휴식 타이머</h3>
        </div>
        <span className="text-[11px] font-semibold text-white/35">세트 완료 시 자동 시작</span>
      </div>

      <div className="mt-3 flex gap-1.5">
        {[60, 90].map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => {
              onPresetChange(seconds);
              onStart(seconds);
              setCustomOpen(false);
            }}
            className={`flex-1 rounded-xl border px-3 py-2 text-[13px] font-bold transition ${
              preset === seconds && !customOpen
                ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200'
                : 'border-white/10 bg-white/[0.03] text-white/55'
            }`}
          >
            {seconds}초
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((prev) => !prev)}
          className={`flex-1 rounded-xl border px-3 py-2 text-[13px] font-bold transition ${
            customOpen
              ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200'
              : 'border-white/10 bg-white/[0.03] text-white/55'
          }`}
        >
          직접 입력
        </button>
      </div>

      {customOpen && (
        <div className="mt-2 flex gap-1.5 animate-fade-in">
          <input
            type="number"
            inputMode="numeric"
            min={10}
            max={600}
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            aria-label="휴식 시간 직접 입력(초)"
            className="field py-1.5 text-center"
            placeholder="초"
          />
          <button type="button" onClick={applyCustom} className="btn-ghost shrink-0 px-4 py-1.5">
            적용
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4">
        <div className="relative grid h-[136px] w-[136px] shrink-0 place-items-center">
          <svg viewBox="0 0 136 136" className="absolute inset-0 -rotate-90">
            <circle cx="68" cy="68" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
            <circle
              cx="68"
              cy="68"
              r={radius}
              fill="none"
              stroke="url(#restGradient)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 900ms linear' }}
            />
            <defs>
              <linearGradient id="restGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#a3e635" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-center">
            <p className="num text-[26px] font-extrabold leading-none text-white">{clock(remaining)}</p>
            <p className={`mt-1 text-[11px] font-bold ${state?.finished ? 'text-lime-300' : 'text-white/40'}`}>
              {statusLabel}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => (state ? onToggle() : onStart(preset))}
            className="btn-primary w-full py-2.5 text-[14px]"
          >
            {!state ? (
              <>
                <Play size={15} strokeWidth={3} /> 휴식 시작
              </>
            ) : state.running ? (
              <>
                <Pause size={15} strokeWidth={3} /> 일시정지
              </>
            ) : (
              <>
                <Play size={15} strokeWidth={3} /> {state.finished ? '다시 시작' : '재개'}
              </>
            )}
          </button>
          <button type="button" onClick={onReset} className="btn-ghost w-full py-2.5">
            <RotateCcw size={14} strokeWidth={3} /> 리셋
          </button>
        </div>
      </div>

      {state?.finished && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-lime-300/30 bg-lime-300/10 px-3 py-2.5 animate-slide-up">
          <p className="text-[13px] font-extrabold text-lime-200">휴식 끝! 다음 세트 가자 💪</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="휴식 완료 알림 닫기"
            className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white/70"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>
      )}
    </section>
  );
}
