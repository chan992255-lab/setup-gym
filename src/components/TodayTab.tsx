import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Layers,
  ListChecks,
  Play,
  Sparkles,
  Trash2,
  Weight,
} from 'lucide-react';
import RestTimer, { type RestState } from './RestTimer';
import { PART_META, PART_ORDER, RECOMMENDED, clamp, fmt, num, unitLabel } from '../lib/data';
import { formatClock, formatKoreanDate, todayISO } from '../lib/dates';
import { recordFromSession, routineFromRecommended, sessionFromRoutine, sessionTotals } from '../lib/session';
import type { BodyPart, Prefs, Routine, Session, WorkoutRecord } from '../lib/types';

interface TodayTabProps {
  session: Session | null;
  setSession: Dispatch<SetStateAction<Session | null>>;
  records: WorkoutRecord[];
  prefs: Prefs;
  setPrefs: Dispatch<SetStateAction<Prefs>>;
  onSaved: (record: WorkoutRecord) => void;
  notify: (message: string) => void;
  onGoRoutines: () => void;
}

const playChime = () => {
  try {
    const AudioCtor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtor();
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = index === 0 ? 880 : 1180;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.24);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    /* 소리 재생이 막힌 환경(무음 모드 등)에서는 화면 알림만 사용한다 */
  }
  if (typeof navigator.vibrate === 'function') navigator.vibrate(80);
};

export default function TodayTab({
  session,
  setSession,
  records,
  prefs,
  setPrefs,
  onSaved,
  notify,
  onGoRoutines,
}: TodayTabProps) {
  const [part, setPart] = useState<BodyPart>('upper');
  const [rest, setRest] = useState<RestState | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const todayDone = records.filter((record) => record.date === todayISO()).length;

  useEffect(() => {
    if (!rest || !rest.running || rest.remaining <= 0) return;
    const id = window.setInterval(() => {
      setRest((prev) => {
        if (!prev || !prev.running) return prev;
        const remaining = Math.max(0, prev.remaining - 1);
        if (remaining === 0) {
          playChime();
          return { ...prev, remaining: 0, running: false, finished: true };
        }
        return { ...prev, remaining };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [rest?.running, rest === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRest = (seconds: number) => {
    const total = clamp(Math.round(seconds), 10, 600);
    setRest({ total, remaining: total, running: true, finished: false });
  };

  const startRoutine = (routine: Routine) => {
    setSession(sessionFromRoutine(routine));
    setRest(null);
    setConfirmDiscard(false);
    notify(`${routine.name} 시작! 첫 세트 화이팅 🔥`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSet = (exerciseId: string, setId: string) => {
    if (!session) return;
    const target = session.exercises.find((item) => item.id === exerciseId)?.sets.find((set) => set.id === setId);
    const willComplete = !target?.done;

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((item) =>
          item.id !== exerciseId
            ? item
            : { ...item, sets: item.sets.map((set) => (set.id === setId ? { ...set, done: !set.done } : set)) },
        ),
      };
    });

    if (willComplete) startRest(prefs.restSec);
  };

  const updateSet = (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((item) =>
          item.id !== exerciseId
            ? item
            : {
                ...item,
                sets: item.sets.map((set) => (set.id === setId ? { ...set, [field]: value.slice(0, 5) } : set)),
              },
        ),
      };
    });
  };

  const saveSession = () => {
    if (!session) return;
    const record = recordFromSession(session);
    if (!record) {
      notify('완료 체크한 세트가 없어요. 세트를 먼저 완료해 주세요.');
      return;
    }
    onSaved(record);
    setSession(null);
    setRest(null);
    setConfirmDiscard(false);
    notify('운동 기록을 저장했어요 💪');
  };

  /* ─────────────── 운동 진행 화면 ─────────────── */
  if (session) {
    const meta = PART_META[session.part];
    const totals = sessionTotals(session);
    const allDone = totals.setsDone === totals.totalSets && totals.totalSets > 0;

    return (
      <div className="space-y-4 animate-fade-in">
        <section className="card overflow-hidden">
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <span className={`badge ${meta.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
              <h2 className="mt-2 truncate text-[19px] font-extrabold leading-tight">{session.routineName}</h2>
              <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-white/40">
                <Clock3 size={12} /> {formatClock(session.startedAt)} 시작 · {session.exercises.length}종목
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/45"
            >
              그만두기
            </button>
          </div>

          {confirmDiscard && (
            <div className="mx-4 mb-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 animate-fade-in">
              <p className="text-[12px] font-bold text-red-200">진행 중인 기록을 버릴까요?</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSession(null);
                    setRest(null);
                    setConfirmDiscard(false);
                    notify('운동을 종료했어요.');
                  }}
                  className="flex-1 rounded-lg bg-red-500/80 px-3 py-2 text-[12px] font-extrabold text-white"
                >
                  버리기
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-[12px] font-bold text-white/70"
                >
                  계속하기
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06]">
            <div className="px-3 py-3 text-center">
              <p className="label">완료 세트</p>
              <p className="num mt-1 text-[17px] font-extrabold text-white">
                {totals.setsDone}
                <span className="text-[13px] font-bold text-white/35">/{totals.totalSets}</span>
              </p>
            </div>
            <div className="px-3 py-3 text-center">
              <p className="label">총 볼륨</p>
              <p className="num mt-1 text-[17px] font-extrabold text-emerald-300">{fmt(totals.volume)}</p>
            </div>
            <div className="px-3 py-3 text-center">
              <p className="label">진행률</p>
              <p className="num mt-1 text-[17px] font-extrabold text-lime-300">
                {totals.totalSets > 0 ? Math.round((totals.setsDone / totals.totalSets) * 100) : 0}%
              </p>
            </div>
          </div>
        </section>

        <RestTimer
          state={rest}
          preset={prefs.restSec}
          onStart={startRest}
          onToggle={() =>
            setRest((prev) => (prev ? { ...prev, running: !prev.running, finished: false } : prev))
          }
          onReset={() => setRest((prev) => (prev ? { ...prev, remaining: prev.total, running: false, finished: false } : prev))}
          onDismiss={() => setRest(null)}
          onPresetChange={(seconds) => setPrefs((prev) => ({ ...prev, restSec: seconds }))}
        />

        <div className="space-y-3">
          {session.exercises.map((item) => (
            <section key={item.id} className="card p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[15px] font-extrabold text-white">{item.name}</h3>
                <span className="shrink-0 text-[11px] font-bold text-white/35">
                  {item.sets.length}세트 · {unitLabel(item.unit)}
                </span>
              </div>

              <div className="mt-2.5 space-y-1.5">
                {item.sets.map((set, index) => (
                  <div
                    key={set.id}
                    className={`grid items-center gap-2 rounded-xl border px-2 py-1.5 transition ${
                      item.unit === 'rep' ? 'grid-cols-[24px_1fr_1fr_44px]' : 'grid-cols-[24px_1fr_44px]'
                    } ${set.done ? 'border-emerald-400/30 bg-emerald-400/[0.08]' : 'border-white/[0.06] bg-ink-950/50'}`}
                  >
                    <span className={`text-center text-[12px] font-extrabold ${set.done ? 'text-emerald-300' : 'text-white/30'}`}>
                      {index + 1}
                    </span>

                    {item.unit === 'rep' && (
                      <label className="relative block">
                        <input
                          className="field py-1.5 pr-6 text-center text-[15px]"
                          inputMode="decimal"
                          value={set.weight}
                          onChange={(event) => updateSet(item.id, set.id, 'weight', event.target.value)}
                          aria-label={`${item.name} ${index + 1}세트 무게(kg)`}
                          placeholder="0"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/30">
                          kg
                        </span>
                      </label>
                    )}

                    <label className="relative block">
                      <input
                        className="field py-1.5 pr-6 text-center text-[15px]"
                        inputMode="numeric"
                        value={set.reps}
                        onChange={(event) => updateSet(item.id, set.id, 'reps', event.target.value)}
                        aria-label={`${item.name} ${index + 1}세트 ${unitLabel(item.unit)}`}
                        placeholder="0"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/30">
                        {unitLabel(item.unit)}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => toggleSet(item.id, set.id)}
                      aria-pressed={set.done}
                      aria-label={`${item.name} ${index + 1}세트 완료`}
                      className={`grid h-9 w-11 place-items-center rounded-xl border transition active:scale-95 ${
                        set.done
                          ? 'border-emerald-400 bg-emerald-400 text-ink-950'
                          : 'border-white/15 bg-white/[0.03] text-white/25'
                      }`}
                    >
                      <Check size={18} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/35">
            <Sparkles size={12} className="text-emerald-300" /> 무게·횟수를 고치고 체크하면 휴식 타이머가 자동으로 시작돼요.
          </p>
        </div>

        <button
          type="button"
          onClick={saveSession}
          disabled={totals.setsDone === 0}
          className="btn-primary w-full py-4 text-[16px]"
        >
          <ListChecks size={18} strokeWidth={2.6} /> 운동 완료 저장
        </button>
        {allDone && (
          <p className="text-center text-[12px] font-bold text-lime-300 animate-fade-in">
            모든 세트를 완료했어요. 오늘 운동 끝! 🔥
          </p>
        )}
      </div>
    );
  }

  /* ─────────────── 루틴 선택 화면 ─────────────── */
  const meta = PART_META[part];
  const recommendations = RECOMMENDED[part];

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="card relative overflow-hidden p-4">
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl" />
        <p className="label">{formatKoreanDate(new Date())}</p>
        <h2 className="mt-1.5 text-[24px] font-extrabold leading-tight tracking-tight">
          오늘 운동<span className="text-emerald-300">.</span>
        </h2>
        <p className="mt-1 text-[13px] font-medium text-white/45">부위를 고르면 추천 루틴을 바로 시작할 수 있어요.</p>
        <div className="mt-3 flex gap-2">
          <span className="badge border border-white/10 bg-white/[0.04] text-white/60">
            <Flame size={12} className="text-orange-300" /> 오늘 {todayDone}회 완료
          </span>
          <span className="badge border border-white/10 bg-white/[0.04] text-white/60">
            <Layers size={12} className="text-emerald-300" /> 총 기록 {records.length}개
          </span>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[13px] font-extrabold text-white/80">운동 부위</h3>
          <span className="text-[11px] font-semibold text-white/35">{meta.tagline}</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {PART_ORDER.map((key) => {
            const item = PART_META[key];
            const active = key === part;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPart(key)}
                aria-pressed={active}
                className={`rounded-xl border px-1 py-2.5 text-[13px] font-extrabold transition ${
                  active
                    ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200 shadow-glow'
                    : 'border-white/[0.08] bg-white/[0.02] text-white/50'
                }`}
              >
                <span className={`mx-auto mb-1 block h-1.5 w-1.5 rounded-full ${item.dot}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[13px] font-extrabold text-white/80">{meta.label} 추천 루틴</h3>
          <button type="button" onClick={onGoRoutines} className="flex items-center text-[11px] font-bold text-emerald-300/80">
            내 루틴 <ChevronRight size={12} strokeWidth={3} />
          </button>
        </div>

        {recommendations.map((rec) => {
          const totalSets = rec.exercises.reduce((acc, item) => acc + item.sets, 0);
          return (
            <article key={rec.key} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`badge ${meta.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                  <h4 className="mt-2 text-[17px] font-extrabold leading-snug text-white">{rec.name}</h4>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-white/45">{rec.focus}</p>
                </div>
                <div className="shrink-0 rounded-xl border border-white/10 bg-ink-950/60 px-2.5 py-1.5 text-center">
                  <p className="num text-[15px] font-extrabold text-white">{rec.minutes}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">min</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {rec.exercises.map((item) => (
                  <span
                    key={item.name}
                    className="rounded-lg bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-white/55"
                  >
                    {item.name} {item.sets}×{item.reps}
                    {item.unit && item.unit !== 'rep' ? unitLabel(item.unit) : ''}
                  </span>
                ))}
              </div>

              <div className="mt-3.5 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[11.5px] font-bold text-white/40">
                  <span>{rec.exercises.length}종목</span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span>{totalSets}세트</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const routine = routineFromRecommended(part, rec.key);
                    if (routine) startRoutine(routine);
                  }}
                  className="btn-primary px-4 py-2.5 text-[14px]"
                >
                  <Play size={14} strokeWidth={3} /> 이 루틴 시작
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <button
        type="button"
        onClick={onGoRoutines}
        className="flex w-full items-center justify-between rounded-2xl border border-dashed border-white/[0.12] px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-bold text-white/60">
          <Weight size={15} className="text-emerald-300" /> 내 루틴에서 운동 시작하기
        </span>
        <ChevronRight size={16} className="text-white/30" />
      </button>
    </div>
  );
}
