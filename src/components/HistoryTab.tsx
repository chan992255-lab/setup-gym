import { useMemo, useState } from 'react';
import { Calculator, Flame, History, TrendingUp, Trash2, Dumbbell } from 'lucide-react';
import { PART_META, clamp, fmt, fmtWeight } from '../lib/data';
import { computeStreak, formatRecordDate, startOfWeek, toISODate, todayISO } from '../lib/dates';
import type { WorkoutRecord } from '../lib/types';

interface HistoryTabProps {
  records: WorkoutRecord[];
  onDelete: (id: string) => void;
}

/** Epley 공식: 1RM = 무게 × (1 + 횟수 / 30) */
export const estimateOneRepMax = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

/** 0.5kg 단위로 반올림한 추정 중량 */
const roundLoad = (kg: number): number => Math.round(kg * 2) / 2;

export default function HistoryTab({ records, onDelete }: HistoryTabProps) {
  const [weight, setWeight] = useState('60');
  const [reps, setReps] = useState('5');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const week = useMemo(() => {
    const start = toISODate(startOfWeek(new Date()));
    const today = todayISO();
    const inWeek = records.filter((record) => record.date >= start && record.date <= today);
    return {
      count: inWeek.length,
      volume: inWeek.reduce((acc, record) => acc + record.volume, 0),
      sets: inWeek.reduce((acc, record) => acc + record.setsDone, 0),
    };
  }, [records]);

  const streak = useMemo(() => computeStreak(records.map((record) => record.date)), [records]);

  const numericWeight = clamp(Number.parseFloat(weight) || 0, 0, 600);
  const numericReps = Math.round(clamp(Number.parseFloat(reps) || 0, 0, 30));
  const oneRepMax = estimateOneRepMax(numericWeight, numericReps);

  const percentages = [
    { label: '90%', ratio: 0.9 },
    { label: '80%', ratio: 0.8 },
    { label: '70%', ratio: 0.7 },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="px-1">
        <h2 className="text-[21px] font-extrabold leading-tight tracking-tight">
          기록 & 1RM<span className="text-emerald-300">.</span>
        </h2>
        <p className="mt-1 text-[12px] font-medium text-white/40">이번 주 운동과 추정 1RM을 한눈에 확인하세요.</p>
      </div>

      <section className="grid grid-cols-3 gap-2">
        <div className="card px-2.5 py-3 text-center">
          <p className="label">이번 주 운동</p>
          <p className="num mt-1.5 text-[20px] font-extrabold text-white">
            {week.count}
            <span className="ml-0.5 text-[12px] font-bold text-white/35">회</span>
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-white/30">총 {week.sets}세트</p>
        </div>
        <div className="card px-2.5 py-3 text-center">
          <p className="label">이번 주 볼륨</p>
          <p className="num mt-1.5 text-[20px] font-extrabold text-emerald-300">
            {week.volume >= 10000 ? `${(week.volume / 1000).toFixed(1)}` : fmt(week.volume)}
            <span className="ml-0.5 text-[12px] font-bold text-emerald-300/50">
              {week.volume >= 10000 ? 't' : 'kg'}
            </span>
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-white/30">완료 세트 합계</p>
        </div>
        <div className="card px-2.5 py-3 text-center">
          <p className="label">연속 운동</p>
          <p className="num mt-1.5 text-[20px] font-extrabold text-lime-300">
            {streak}
            <span className="ml-0.5 text-[12px] font-bold text-lime-300/50">일</span>
          </p>
          <p className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] font-semibold text-white/30">
            <Flame size={9} className="text-orange-300" /> 스트릭
          </p>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={15} className="text-emerald-300" />
            <h3 className="text-[13px] font-extrabold tracking-tight text-white/80">1RM 계산기</h3>
          </div>
          <span className="text-[10px] font-semibold text-white/30">Epley 공식</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">무게 (kg)</span>
            <input
              className="field mt-1 py-2 text-center text-[17px]"
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value.slice(0, 6))}
              aria-label="1RM 계산 무게(kg)"
              placeholder="60"
            />
          </label>
          <label className="block">
            <span className="label">횟수 (회)</span>
            <input
              className="field mt-1 py-2 text-center text-[17px]"
              inputMode="numeric"
              value={reps}
              onChange={(event) => setReps(event.target.value.slice(0, 2))}
              aria-label="1RM 계산 횟수(회)"
              placeholder="5"
            />
          </label>
        </div>

        <div className="mt-3 flex items-end justify-between rounded-xl border border-emerald-400/25 bg-gradient-to-r from-emerald-400/[0.12] to-lime-300/[0.06] px-3.5 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-200/70">추정 1RM</p>
            <p className="num mt-0.5 text-[30px] font-extrabold leading-none text-white">
              {oneRepMax > 0 ? fmtWeight(oneRepMax) : '—'}
              <span className="ml-1 text-[14px] font-bold text-white/40">kg</span>
            </p>
          </div>
          <p className="pb-0.5 text-right text-[11px] font-semibold leading-relaxed text-white/40">
            {numericWeight > 0 && numericReps > 0
              ? `${fmtWeight(numericWeight)}kg × ${numericReps}회 기준`
              : '무게와 횟수를 입력하세요'}
          </p>
        </div>

        <div className="mt-2.5 overflow-hidden rounded-xl border border-white/[0.07]">
          <div className="grid grid-cols-3 divide-x divide-white/[0.06] bg-white/[0.03] text-center">
            {percentages.map((item) => (
              <div key={item.label} className="px-2 py-2.5">
                <p className="text-[11px] font-extrabold text-emerald-300/80">{item.label}</p>
                <p className="num mt-0.5 text-[15px] font-extrabold text-white">
                  {oneRepMax > 0 ? fmtWeight(roundLoad(oneRepMax * item.ratio)) : '—'}
                  <span className="ml-0.5 text-[10px] font-bold text-white/30">kg</span>
                </p>
                <p className="mt-0.5 text-[9.5px] font-semibold text-white/25">
                  {oneRepMax > 0 ? `약 ${Math.max(1, Math.round(30 * (1 / item.ratio - 1)))}회` : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-white/30">
          1회 최대 중량을 추정한 값이에요. 실제 최대 중량은 보조자와 함께 확인하세요.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[13px] font-extrabold text-white/80">최근 운동 기록</h3>
          <span className="text-[11px] font-semibold text-white/35">총 {records.length}개</span>
        </div>

        {records.length === 0 ? (
          <div className="card mt-2 flex flex-col items-center gap-2 px-4 py-9 text-center">
            <History size={24} className="text-white/25" />
            <p className="text-[13px] font-bold text-white/55">아직 운동 기록이 없어요</p>
            <p className="text-[11.5px] leading-relaxed text-white/35">
              오늘 운동 탭에서 루틴을 시작하고<br />세트를 완료한 뒤 저장해 보세요.
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {records.map((record) => {
              const meta = PART_META[record.part];
              return (
                <li key={record.id} className="card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11.5px] font-extrabold text-emerald-300/90">
                          {formatRecordDate(record.date)}
                        </span>
                        <span className={`badge ${meta.badge} px-2 py-0.5`}>{meta.label}</span>
                      </div>
                      <p className="mt-1 truncate text-[14.5px] font-extrabold text-white">{record.routineName}</p>
                      <p className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-white/40">
                        <span className="flex items-center gap-1">
                          <Dumbbell size={10} /> {record.setsDone}/{record.totalSets}세트
                        </span>
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <span className="flex items-center gap-1">
                          <TrendingUp size={10} /> {fmt(record.volume)} kg
                        </span>
                      </p>
                    </div>

                    {confirmDelete === record.id ? (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(record.id);
                            setConfirmDelete(null);
                          }}
                          className="rounded-lg bg-red-500/85 px-2.5 py-1.5 text-[11px] font-extrabold text-white"
                        >
                          삭제
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white/60"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(record.id)}
                        aria-label={`${record.routineName} 기록 삭제`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-white/35 active:scale-95"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {record.exercises.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {record.exercises.slice(0, 4).map((exercise) => (
                        <span
                          key={exercise.name}
                          className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-white/45"
                        >
                          {exercise.name} {exercise.sets.length}세트
                        </span>
                      ))}
                      {record.exercises.length > 4 && (
                        <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-white/45">
                          +{record.exercises.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
