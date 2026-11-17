import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { BookMarked, ChevronDown, Flame, Plus, Play, Trash2, X } from 'lucide-react';
import { PART_META, PART_ORDER, fmt, uid } from '../lib/data';
import type { BodyPart, Routine } from '../lib/types';

interface RoutinesTabProps {
  routines: Routine[];
  setRoutines: Dispatch<SetStateAction<Routine[]>>;
  onStart: (routine: Routine) => void;
  notify: (message: string) => void;
}

const totalSets = (routine: Routine): number => routine.exercises.reduce((acc, item) => acc + item.sets, 0);

const estimateVolume = (routine: Routine): number =>
  routine.exercises.reduce((acc, item) => acc + (item.unit === 'rep' ? item.sets * item.reps * item.weight : 0), 0);

export default function RoutinesTab({ routines, setRoutines, onStart, notify }: RoutinesTabProps) {
  const [expanded, setExpanded] = useState<string | null>(routines[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPart, setDraftPart] = useState<BodyPart>('upper');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [draftExercise, setDraftExercise] = useState({ name: '', sets: '4', reps: '10', weight: '20' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const createRoutine = () => {
    const name = draftName.trim();
    if (!name) {
      notify('루틴 이름을 입력해 주세요.');
      return;
    }
    const routine: Routine = {
      id: uid('routine'),
      name,
      part: draftPart,
      focus: '내가 만든 루틴',
      minutes: 45,
      exercises: [],
      createdAt: new Date().toISOString(),
    };
    setRoutines((prev) => [routine, ...prev]);
    setExpanded(routine.id);
    setCreating(false);
    setDraftName('');
    notify(`"${name}" 루틴을 만들었어요. 종목을 추가해 보세요.`);
  };

  const addExercise = (routineId: string) => {
    const name = draftExercise.name.trim();
    if (!name) {
      notify('종목 이름을 입력해 주세요.');
      return;
    }
    const sets = Math.min(12, Math.max(1, Math.round(Number(draftExercise.sets) || 1)));
    const reps = Math.min(300, Math.max(1, Math.round(Number(draftExercise.reps) || 1)));
    const weight = Math.max(0, Number(draftExercise.weight) || 0);

    setRoutines((prev) =>
      prev.map((routine) =>
        routine.id !== routineId
          ? routine
          : {
              ...routine,
              exercises: [...routine.exercises, { id: uid('ex'), name, sets, reps, weight, unit: 'rep' }],
            },
      ),
    );
    setDraftExercise({ name: '', sets: String(sets), reps: String(reps), weight: String(weight) });
    setAddingTo(null);
    notify(`${name} 종목을 추가했어요.`);
  };

  const removeExercise = (routineId: string, exerciseId: string) => {
    setRoutines((prev) =>
      prev.map((routine) =>
        routine.id !== routineId
          ? routine
          : { ...routine, exercises: routine.exercises.filter((item) => item.id !== exerciseId) },
      ),
    );
  };

  const removeRoutine = (routineId: string) => {
    const target = routines.find((routine) => routine.id === routineId);
    setRoutines((prev) => prev.filter((routine) => routine.id !== routineId));
    setConfirmDelete(null);
    if (expanded === routineId) setExpanded(null);
    notify(`"${target?.name ?? '루틴'}"을 삭제했어요.`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-[21px] font-extrabold leading-tight tracking-tight">
            루틴 보관함<span className="text-emerald-300">.</span>
          </h2>
          <p className="mt-1 text-[12px] font-medium text-white/40">저장한 루틴 {routines.length}개 · 눌러서 펼치기</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((prev) => !prev)}
          className="btn-primary px-3.5 py-2.5 text-[13px]"
        >
          {creating ? <X size={15} strokeWidth={3} /> : <Plus size={15} strokeWidth={3} />}
          {creating ? '닫기' : '새 루틴'}
        </button>
      </div>

      {creating && (
        <section className="card space-y-3 p-4 animate-slide-up">
          <h3 className="text-[14px] font-extrabold text-white/85">새 루틴 만들기</h3>
          <input
            className="field"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="예: 가슴 집중 루틴"
            aria-label="새 루틴 이름"
            maxLength={30}
          />
          <div className="grid grid-cols-4 gap-1.5">
            {PART_ORDER.map((key) => {
              const meta = PART_META[key];
              const active = draftPart === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDraftPart(key)}
                  aria-pressed={active}
                  className={`rounded-lg border px-1 py-2 text-[12px] font-bold transition ${
                    active
                      ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200'
                      : 'border-white/[0.08] bg-white/[0.02] text-white/45'
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={createRoutine} className="btn-primary w-full py-2.5 text-[14px]">
            <Plus size={16} strokeWidth={3} /> 루틴 만들기
          </button>
        </section>
      )}

      {routines.length === 0 && (
        <div className="card flex flex-col items-center gap-2 px-4 py-10 text-center">
          <BookMarked size={26} className="text-white/25" />
          <p className="text-[13px] font-bold text-white/55">아직 루틴이 없어요</p>
          <p className="text-[12px] text-white/35">새 루틴을 만들어 종목을 담아 보세요.</p>
        </div>
      )}

      {routines.map((routine) => {
        const meta = PART_META[routine.part];
        const open = expanded === routine.id;
        return (
          <article key={routine.id} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(open ? null : routine.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 p-3.5 text-left"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${meta.badge}`}>
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-extrabold text-white">{routine.name}</span>
                <span className="mt-0.5 block text-[11.5px] font-semibold text-white/40">
                  {meta.label} · {routine.exercises.length}종목 · {totalSets(routine)}세트
                </span>
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>

            {open && (
              <div className="border-t border-white/[0.06] px-3.5 pb-3.5 pt-3 animate-fade-in">
                {routine.exercises.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-[12px] font-semibold text-white/35">
                    아직 종목이 없어요. 아래에서 추가해 보세요.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {routine.exercises.map((item, index) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-ink-950/50 px-2.5 py-2"
                      >
                        <span className="w-4 text-center text-[11px] font-extrabold text-white/25">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-bold text-white/85">{item.name}</span>
                          <span className="mt-0.5 block text-[11px] font-semibold text-white/35">
                            {item.sets}세트 × {item.reps}
                            {item.unit === 'rep' ? '회' : item.unit === 'min' ? '분' : '초'}
                            {item.unit === 'rep' && item.weight > 0 ? ` · ${item.weight}kg` : ''}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeExercise(routine.id, item.id)}
                          aria-label={`${item.name} 종목 삭제`}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/35 active:scale-95"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {addingTo === routine.id ? (
                  <div className="mt-2.5 space-y-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-2.5 animate-fade-in">
                    <input
                      className="field py-1.5"
                      value={draftExercise.name}
                      onChange={(event) => setDraftExercise((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="종목 이름 (예: 사이드 레터럴 레이즈)"
                      aria-label="추가할 종목 이름"
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      <label className="relative block">
                        <input
                          className="field py-1.5 pr-6 text-center"
                          inputMode="numeric"
                          value={draftExercise.sets}
                          onChange={(event) => setDraftExercise((prev) => ({ ...prev, sets: event.target.value }))}
                          aria-label="세트 수"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/30">
                          세트
                        </span>
                      </label>
                      <label className="relative block">
                        <input
                          className="field py-1.5 pr-6 text-center"
                          inputMode="numeric"
                          value={draftExercise.reps}
                          onChange={(event) => setDraftExercise((prev) => ({ ...prev, reps: event.target.value }))}
                          aria-label="횟수"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/30">
                          회
                        </span>
                      </label>
                      <label className="relative block">
                        <input
                          className="field py-1.5 pr-6 text-center"
                          inputMode="decimal"
                          value={draftExercise.weight}
                          onChange={(event) => setDraftExercise((prev) => ({ ...prev, weight: event.target.value }))}
                          aria-label="무게(kg)"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/30">
                          kg
                        </span>
                      </label>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => addExercise(routine.id)}
                        className="btn-primary flex-1 py-2 text-[13px]"
                      >
                        <Plus size={14} strokeWidth={3} /> 종목 추가
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingTo(null)}
                        className="btn-ghost px-3 py-2 text-[13px]"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTo(routine.id)}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.12] py-2 text-[12px] font-bold text-white/45"
                  >
                    <Plus size={13} strokeWidth={3} /> 종목 추가
                  </button>
                )}

                {estimateVolume(routine) > 0 && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/30">
                    <Flame size={11} className="text-orange-300/70" /> 예상 볼륨 {fmt(estimateVolume(routine))} kg
                  </p>
                )}

                <div className="mt-3 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (routine.exercises.length === 0) {
                        notify('종목을 하나 이상 추가한 뒤 시작할 수 있어요.');
                        return;
                      }
                      onStart(routine);
                    }}
                    className="btn-primary flex-1 py-2.5 text-[13.5px]"
                  >
                    <Play size={14} strokeWidth={3} /> 이 루틴으로 운동 시작
                  </button>
                  {confirmDelete === routine.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => removeRoutine(routine.id)}
                        className="rounded-xl bg-red-500/85 px-3 py-2.5 text-[12px] font-extrabold text-white"
                      >
                        삭제
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-xl border border-white/15 px-3 py-2.5 text-[12px] font-bold text-white/60"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(routine.id)}
                      aria-label={`${routine.name} 루틴 삭제`}
                      className="grid w-11 place-items-center rounded-xl border border-white/10 text-white/35 active:scale-95"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
