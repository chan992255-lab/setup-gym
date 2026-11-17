export type BodyPart = 'upper' | 'lower' | 'full' | 'cardio';

/** 'rep' = 횟수(회), 'min'/'sec' = 시간(분·초) — 유산소·정적 종목용 */
export type Unit = 'rep' | 'min' | 'sec';

/** 루틴에 담기는 종목 (세트 수·기본 횟수·기본 중량) */
export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  unit: Unit;
}

/** 루틴 보관함에 저장되는 루틴 */
export interface Routine {
  id: string;
  name: string;
  part: BodyPart;
  focus: string;
  minutes: number;
  exercises: Exercise[];
  createdAt: string;
  /** 트레이너가 배정한 루틴이면 배정한 트레이너 id */
  assignedBy?: string | null;
  assignedByName?: string | null;
  /** 클라우드에서 불러온 경우 루틴 소유자(회원) id */
  ownerId?: string;
}

/** 진행 중인 운동 세션 — 입력 중인 값은 문자열로 보관한다 */
export interface SessionSet {
  id: string;
  weight: string;
  reps: string;
  done: boolean;
}

export interface SessionExercise {
  id: string;
  name: string;
  unit: Unit;
  sets: SessionSet[];
}

export interface Session {
  id: string;
  part: BodyPart;
  routineName: string;
  startedAt: string;
  exercises: SessionExercise[];
}

export interface RecordedSet {
  weight: number;
  reps: number;
  unit: Unit;
}

export interface RecordedExercise {
  name: string;
  sets: RecordedSet[];
}

/** 저장된 운동 기록 */
export interface WorkoutRecord {
  id: string;
  /** 로컬 날짜 YYYY-MM-DD */
  date: string;
  finishedAt: string;
  part: BodyPart;
  routineName: string;
  setsDone: number;
  totalSets: number;
  /** 완료한 세트의 총 볼륨(kg) */
  volume: number;
  exercises: RecordedExercise[];
}

export interface Prefs {
  restSec: number;
}

/** 로그인한 사용자의 프로필 */
export interface Profile {
  userId: string;
  displayName: string;
  role: 'member' | 'trainer';
  trainerId: string | null;
  trainerName: string | null;
  trainerCode: string | null;
}
