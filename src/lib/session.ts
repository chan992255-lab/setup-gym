import { RECOMMENDED, makeExercise, num, uid } from './data';
import type { Routine, Session, WorkoutRecord } from './types';
import { todayISO } from './dates';

const exercise = (name: string, sets: number, reps: number, weight: number) =>
  makeExercise(name, sets, reps, weight);

/** 첫 실행 시 루틴 보관함에 들어가는 샘플 루틴 3개 (상체 · 하체 · 전신) */
export const SEED_ROUTINES: Routine[] = [
  {
    id: 'seed-upper',
    name: '상체 밀기 · 당기기 A',
    part: 'upper',
    focus: RECOMMENDED.upper[0].focus,
    minutes: 55,
    createdAt: '2026-01-05T09:00:00.000Z',
    exercises: [
      exercise('벤치프레스', 4, 8, 60),
      exercise('시티드 로우', 4, 10, 50),
      exercise('인클라인 덤벨프레스', 3, 10, 20),
      exercise('랫풀다운', 3, 12, 45),
      exercise('사이드 레터럴 레이즈', 3, 15, 8),
    ],
  },
  {
    id: 'seed-lower',
    name: '하체 스쿼트 중심 A',
    part: 'lower',
    focus: RECOMMENDED.lower[0].focus,
    minutes: 60,
    createdAt: '2026-01-06T09:00:00.000Z',
    exercises: [
      exercise('백 스쿼트', 4, 8, 80),
      exercise('루마니안 데드리프트', 3, 10, 60),
      exercise('레그프레스', 3, 12, 120),
      exercise('레그컬', 3, 15, 40),
      exercise('스탠딩 카프 레이즈', 4, 20, 40),
    ],
  },
  {
    id: 'seed-full',
    name: '전신 5대 운동 A',
    part: 'full',
    focus: RECOMMENDED.full[0].focus,
    minutes: 55,
    createdAt: '2026-01-07T09:00:00.000Z',
    exercises: [
      exercise('데드리프트', 4, 5, 90),
      exercise('풀업', 3, 8, 0),
      exercise('덤벨 런지', 3, 12, 16),
      exercise('케틀벨 스윙', 3, 15, 16),
      makeExercise('플랭크', 3, 60, 0, 'sec'),
    ],
  },
];

/** 루틴을 실제 입력 가능한 세션으로 펼친다 (세트마다 무게·횟수 행) */
export function sessionFromRoutine(routine: Routine, routineName?: string): Session {
  return {
    id: uid('ses'),
    part: routine.part,
    routineName: routineName ?? routine.name,
    startedAt: new Date().toISOString(),
    exercises: routine.exercises.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      sets: Array.from({ length: Math.max(1, Math.round(item.sets)) }, () => ({
        id: uid('set'),
        weight: item.weight > 0 ? String(item.weight) : '',
        reps: String(item.reps),
        done: false,
      })),
    })),
  };
}

export interface SessionTotals {
  setsDone: number;
  totalSets: number;
  volume: number;
}

/** 완료한 세트 수와 총 볼륨(kg) — 유산소·맨몸 종목은 볼륨에서 제외 */
export function sessionTotals(session: Session): SessionTotals {
  let setsDone = 0;
  let totalSets = 0;
  let volume = 0;
  for (const ex of session.exercises) {
    totalSets += ex.sets.length;
    for (const set of ex.sets) {
      if (!set.done) continue;
      setsDone += 1;
      if (ex.unit === 'rep') volume += num(set.weight) * num(set.reps);
    }
  }
  return { setsDone, totalSets, volume: Math.round(volume) };
}

/** 완료한 세트가 하나라도 있으면 저장용 기록을 만든다 */
export function recordFromSession(session: Session): WorkoutRecord | null {
  const exercises = session.exercises
    .map((ex) => ({
      name: ex.name,
      sets: ex.sets
        .filter((set) => set.done)
        .map((set) => ({ weight: num(set.weight), reps: num(set.reps), unit: ex.unit })),
    }))
    .filter((ex) => ex.sets.length > 0);

  const totals = sessionTotals(session);
  if (totals.setsDone === 0) {
    return null;
  }

  return {
    id: uid('rec'),
    date: todayISO(),
    finishedAt: new Date().toISOString(),
    part: session.part,
    routineName: session.routineName,
    setsDone: totals.setsDone,
    totalSets: totals.totalSets,
    volume: totals.volume,
    exercises,
  };
}

/** 추천 루틴 카드를 세션으로 시작할 때 쓰는 임시 루틴 */
export function routineFromRecommended(part: keyof typeof RECOMMENDED, key: string) {
  const found = RECOMMENDED[part].find((item) => item.key === key);
  if (!found) return null;
  const routine: Routine = {
    id: `rec_${key}`,
    name: found.name,
    part,
    focus: found.focus,
    minutes: found.minutes,
    createdAt: new Date().toISOString(),
    exercises: found.exercises.map((item) =>
      makeExercise(item.name, item.sets, item.reps, item.weight, item.unit ?? 'rep'),
    ),
  };
  return routine;
}
