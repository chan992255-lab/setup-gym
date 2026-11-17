import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Copy,
  Dumbbell,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  assignRoutineToMember,
  deleteRoutineRow,
  fetchAssignedRoutines,
  fetchTrainerMembers,
  updateAssignedRoutine,
} from '../lib/cloud';
import type { TrainerMember } from '../lib/cloud';
import { PART_META, PART_ORDER, fmt, makeExercise, uid } from '../lib/data';
import { formatRecordDate } from '../lib/dates';
import type { BodyPart, Exercise, Routine } from '../lib/types';

interface TrainerTabProps {
  notify: (message: string) => void;
}

interface DraftExercise {
  key: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

const emptyDraft = (): DraftExercise => ({ key: uid('draft'), name: '', sets: '4', reps: '10', weight: '20' });

export default function TrainerTab({ notify }: TrainerTabProps) {
  const { profile } = useAuth();
  const [members, setMembers] = useState<TrainerMember[]>([]);
  const [assigned, setAssigned] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMember, setOpenMember] = useState<string | null>(null);
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftPart, setDraftPart] = useState<BodyPart>('upper');
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([emptyDraft()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRoutine, setConfirmRoutine] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [memberList, routineList] = await Promise.all([
        fetchTrainerMembers(profile.userId),
        fetchAssignedRoutines(profile.userId),
      ]);
      setMembers(memberList);
      setAssigned(routineList);
      setError(null);
    } catch {
      setError('회원 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const copyCode = async () => {
    if (!profile?.trainerCode) return;
    try {
      await navigator.clipboard.writeText(profile.trainerCode);
      notify('초대 코드를 복사했어요.');
    } catch {
      notify(`초대 코드: ${profile.trainerCode}`);
    }
  };

  const resetAssignForm = () => {
    setDraftName('');
    setDraftPart('upper');
    setDraftExercises([emptyDraft()]);
    setEditingId(null);
    setError(null);
  };

  const startEdit = (member: TrainerMember, routine: Routine) => {
    setAssigningTo(member.userId);
    setEditingId(routine.id);
    setDraftName(routine.name);
    setDraftPart(routine.part);
    setDraftExercises(
      routine.exercises.length > 0
        ? routine.exercises.map((item) => ({
            key: item.id,
            name: item.name,
            sets: String(item.sets),
            reps: String(item.reps),
            weight: String(item.weight),
          }))
        : [emptyDraft()],
    );
    setError(null);
  };

  const submitAssign = async (member: TrainerMember) => {
    if (!profile) return;
    const name = draftName.trim();
    if (!name) {
      setError('루틴 이름을 입력해 주세요.');
      return;
    }
    const exercises: Exercise[] = draftExercises
      .filter((item) => item.name.trim())
      .map((item) =>
        makeExercise(
          item.name.trim(),
          Math.min(12, Math.max(1, Math.round(Number(item.sets) || 1))),
          Math.min(300, Math.max(1, Math.round(Number(item.reps) || 1))),
          Math.max(0, Number(item.weight) || 0),
        ),
      );
    if (exercises.length === 0) {
      setError('종목을 하나 이상 추가해 주세요.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await updateAssignedRoutine(editingId, {
          name,
          part: draftPart,
          exercises,
          minutes: Math.max(20, exercises.length * 8),
        });
        notify(`"${name}" 배정 루틴을 수정했어요.`);
      } else {
        await assignRoutineToMember({
          memberId: member.userId,
          trainerId: profile.userId,
          trainerName: profile.displayName,
          name,
          part: draftPart,
          focus: `${profile.displayName} 트레이너 배정`,
          minutes: Math.max(20, exercises.length * 8),
          exercises,
        });
        notify(`${member.displayName}님에게 "${name}" 루틴을 배정했어요.`);
      }
      resetAssignForm();
      setAssigningTo(null);
      await refresh();
    } catch {
      setError(editingId ? '루틴을 수정하지 못했어요. 잠시 후 다시 시도해 주세요.' : '루틴을 배정하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const removeAssigned = async (routine: Routine) => {
    try {
      await deleteRoutineRow(routine.id);
      setConfirmRoutine(null);
      await refresh();
      notify('배정한 루틴을 삭제했어요.');
    } catch {
      notify('루틴을 삭제하지 못했어요.');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-[21px] font-extrabold leading-tight tracking-tight">
            트레이너 관리<span className="text-emerald-300">.</span>
          </h2>
          <p className="mt-1 text-[12px] font-medium text-white/40">담당 회원의 운동 현황을 확인하고 루틴을 배정하세요.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          aria-label="회원 목록 새로고침"
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/50 active:scale-95"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <section className="card relative overflow-hidden p-4">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-lime-300/10 blur-2xl" />
        <p className="label">회원 초대 코드</p>
        <div className="mt-2 flex items-center gap-2">
          <p className="num flex-1 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-3 text-center text-[22px] font-extrabold tracking-[0.36em] text-emerald-200">
            {profile?.trainerCode ?? '······'}
          </p>
          <button
            type="button"
            onClick={copyCode}
            aria-label="초대 코드 복사"
            className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 text-white/60"
          >
            <Copy size={16} />
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-white/35">
          회원이 가입할 때 또는 ‘내 계정 → 트레이너 연결’에 이 코드를 넣으면 담당 회원으로 등록됩니다.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <div className="card px-2.5 py-3 text-center">
          <p className="label">담당 회원</p>
          <p className="num mt-1.5 text-[20px] font-extrabold text-white">
            {members.length}
            <span className="ml-0.5 text-[12px] font-bold text-white/35">명</span>
          </p>
        </div>
        <div className="card px-2.5 py-3 text-center">
          <p className="label">배정 루틴</p>
          <p className="num mt-1.5 text-[20px] font-extrabold text-emerald-300">{assigned.length}</p>
        </div>
        <div className="card px-2.5 py-3 text-center">
          <p className="label">이번 주 기록</p>
          <p className="num mt-1.5 text-[20px] font-extrabold text-lime-300">
            {members.reduce(
              (acc, member) =>
                acc +
                member.workouts.filter((workout) => {
                  const now = new Date();
                  const day = (now.getDay() + 6) % 7;
                  const start = new Date(now);
                  start.setDate(now.getDate() - day);
                  start.setHours(0, 0, 0, 0);
                  return workout.date >= start.toISOString().slice(0, 10);
                }).length,
              0,
            )}
          </p>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11.5px] font-semibold text-red-200">
          {error}
        </p>
      )}

      {!loading && members.length === 0 && (
        <div className="card flex flex-col items-center gap-2 px-4 py-9 text-center">
          <Users size={24} className="text-white/25" />
          <p className="text-[13px] font-bold text-white/55">아직 연결된 회원이 없어요</p>
          <p className="text-[11.5px] leading-relaxed text-white/35">
            위 초대 코드를 회원에게 알려 주세요.<br />회원이 코드를 입력하면 이곳에 나타납니다.
          </p>
        </div>
      )}

      {members.map((member) => {
        const open = openMember === member.userId;
        const memberRoutines = assigned.filter((routine) => routine.ownerId === member.userId);
        return (
          <article key={member.userId} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenMember(open ? null : member.userId)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 p-3.5 text-left"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400/80 to-lime-300/80 text-[14px] font-extrabold text-ink-950">
                {member.displayName.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-extrabold text-white">{member.displayName}</span>
                <span className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-white/40">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={10} /> {member.lastWorkoutDate ? formatRecordDate(member.lastWorkoutDate) : '기록 없음'}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span>총 {member.workoutCount}회</span>
                </span>
              </span>
              <ChevronDown size={18} className={`shrink-0 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="border-t border-white/[0.06] px-3.5 pb-3.5 pt-3 animate-fade-in">
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-xl border border-white/[0.06] bg-ink-950/50 px-2 py-2 text-center">
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-white/35">총 운동</p>
                    <p className="num mt-0.5 text-[14px] font-extrabold text-white">{member.workoutCount}회</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-ink-950/50 px-2 py-2 text-center">
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-white/35">총 볼륨</p>
                    <p className="num mt-0.5 text-[14px] font-extrabold text-emerald-300">{fmt(member.totalVolume)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-ink-950/50 px-2 py-2 text-center">
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-white/35">최근</p>
                    <p className="mt-0.5 text-[12.5px] font-extrabold text-white">
                      {member.lastWorkoutDate ? formatRecordDate(member.lastWorkoutDate) : '—'}
                    </p>
                  </div>
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-extrabold text-white/65">
                  <TrendingUp size={12} className="text-emerald-300" /> 최근 운동 기록
                </p>
                {member.workouts.length === 0 ? (
                  <p className="mt-1.5 rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-[11.5px] font-semibold text-white/35">
                    아직 운동 기록이 없어요.
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-1.5">
                    {member.workouts.slice(0, 3).map((workout) => (
                      <li key={workout.id} className="rounded-xl border border-white/[0.05] bg-ink-950/50 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12.5px] font-extrabold text-white/85">{workout.routineName}</p>
                          <p className="shrink-0 text-[10.5px] font-bold text-emerald-300/80">{formatRecordDate(workout.date)}</p>
                        </div>
                        <p className="mt-0.5 flex items-center gap-2 text-[10.5px] font-semibold text-white/35">
                          <span>{PART_META[workout.part].label}</span>
                          <span>{workout.setsDone}/{workout.totalSets}세트</span>
                          <span>{fmt(workout.volume)} kg</span>
                        </p>
                        {workout.exercises.length > 0 && (
                          <p className="mt-1 truncate text-[10px] font-medium text-white/25">
                            {workout.exercises.map((item) => `${item.name} ${item.sets.length}세트`).join(' · ')}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-white/65">
                    <Dumbbell size={12} className="text-lime-300" /> 배정한 루틴 {memberRoutines.length}개
                  </p>
                </div>
                {memberRoutines.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {memberRoutines.map((routine) => (
                      <li
                        key={routine.id}
                        className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-white/70">
                          {routine.name}
                        </span>
                        <span className="shrink-0 text-[10px] font-semibold text-white/30">
                          {routine.exercises.length}종목
                        </span>
                        {confirmRoutine === routine.id ? (
                          <button
                            type="button"
                            onClick={() => removeAssigned(routine)}
                            className="rounded-md bg-red-500/85 px-2 py-1 text-[10px] font-extrabold text-white"
                          >
                            삭제
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(member, routine)}
                              aria-label={`${routine.name} 배정 루틴 수정`}
                              className="grid h-6 w-6 place-items-center rounded-md text-white/30"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRoutine(routine.id)}
                              aria-label={`${routine.name} 배정 루틴 삭제`}
                              className="grid h-6 w-6 place-items-center rounded-md text-white/30"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {assigningTo === member.userId ? (
                  <div className="mt-2.5 space-y-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] p-2.5">
                    {editingId && (
                      <p className="rounded-lg bg-emerald-400/10 px-2 py-1 text-[10.5px] font-extrabold text-emerald-200">
                        배정 루틴 수정 중 · 저장하면 회원에게 바로 반영돼요
                      </p>
                    )}
                    <input
                      className="field py-2"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      placeholder="루틴 이름 (예: 3분할 상체 B)"
                      aria-label="배정할 루틴 이름"
                      maxLength={30}
                    />
                    <div className="grid grid-cols-4 gap-1">
                      {PART_ORDER.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDraftPart(key)}
                          aria-pressed={draftPart === key}
                          className={`rounded-lg border px-1 py-1.5 text-[11.5px] font-bold ${
                            draftPart === key
                              ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200'
                              : 'border-white/10 bg-white/[0.02] text-white/45'
                          }`}
                        >
                          {PART_META[key].label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      {draftExercises.map((item, index) => (
                        <div key={item.key} className="space-y-1 rounded-lg border border-white/[0.06] bg-ink-950/40 p-1.5">
                          <div className="flex gap-1">
                            <input
                              className="field py-1.5 text-[12.5px]"
                              value={item.name}
                              onChange={(event) =>
                                setDraftExercises((prev) =>
                                  prev.map((row) => (row.key === item.key ? { ...row, name: event.target.value } : row)),
                                )
                              }
                              placeholder={`종목 ${index + 1} (예: 벤치프레스)`}
                              aria-label={`배정 종목 ${index + 1} 이름`}
                            />
                            <button
                              type="button"
                              onClick={() => setDraftExercises((prev) => prev.filter((row) => row.key !== item.key))}
                              aria-label={`배정 종목 ${index + 1} 삭제`}
                              className="grid w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-white/35"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {(
                              [
                                { field: 'sets' as const, label: '세트' },
                                { field: 'reps' as const, label: '회' },
                                { field: 'weight' as const, label: 'kg' },
                              ]
                            ).map((meta) => (
                              <label key={meta.field} className="relative block">
                                <input
                                  className="field py-1.5 pr-8 text-center text-[12.5px]"
                                  inputMode="decimal"
                                  value={item[meta.field]}
                                  onChange={(event) =>
                                    setDraftExercises((prev) =>
                                      prev.map((row) =>
                                        row.key === item.key ? { ...row, [meta.field]: event.target.value } : row,
                                      ),
                                    )
                                  }
                                  aria-label={`배정 종목 ${index + 1} ${meta.label}`}
                                />
                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9.5px] font-bold text-white/30">
                                  {meta.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDraftExercises((prev) => [...prev, emptyDraft()])}
                      className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 py-1.5 text-[11.5px] font-bold text-white/45"
                    >
                      <Plus size={12} strokeWidth={3} /> 종목 추가
                    </button>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => submitAssign(member)}
                        disabled={busy}
                        className="btn-primary flex-1 py-2.5 text-[13px]"
                      >
                        {busy ? '처리 중…' : editingId ? '수정 저장' : '루틴 배정하기'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningTo(null);
                          resetAssignForm();
                        }}
                        className="btn-ghost px-3 py-2.5 text-[13px]"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAssigningTo(member.userId);
                      resetAssignForm();
                    }}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2.5 text-[12.5px] font-extrabold text-emerald-200"
                  >
                    <Plus size={13} strokeWidth={3} /> 맞춤 루틴 배정
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}

      {loading && (
        <p className="flex items-center justify-center gap-2 py-6 text-[12px] font-semibold text-white/35">
          <RefreshCw size={13} className="animate-spin" /> 회원 정보를 불러오는 중…
        </p>
      )}

      <p className="flex items-center justify-center gap-1.5 px-2 pb-2 text-[10.5px] text-white/25">
        <UserRound size={11} /> 회원이 로그인하면 배정한 루틴이 ‘트레이너 배정 루틴’으로 표시됩니다.
      </p>
    </div>
  );
}
