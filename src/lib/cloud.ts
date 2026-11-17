import { supabase } from './supabase';
import type { BodyPart, Exercise, Routine, WorkoutRecord } from './types';

type RoutineRow = {
  id: string;
  owner_id: string;
  created_by: string;
  assigned_by: string | null;
  assigned_by_name: string | null;
  name: string;
  part: string;
  focus: string | null;
  minutes: number | null;
  exercises: unknown;
  created_at: string;
};

type WorkoutRow = {
  id: string;
  user_id: string;
  date: string;
  part: string;
  routine_name: string;
  sets_done: number;
  total_sets: number;
  volume: number | string;
  exercises: unknown;
  finished_at: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  created_at: string;
};

const asExercises = (value: unknown): Exercise[] => (Array.isArray(value) ? (value as Exercise[]) : []);

export const mapRoutine = (row: RoutineRow): Routine => ({
  id: row.id,
  name: row.name,
  part: (['upper', 'lower', 'full', 'cardio'].includes(row.part) ? row.part : 'upper') as BodyPart,
  focus: row.focus ?? '',
  minutes: row.minutes ?? 45,
  exercises: asExercises(row.exercises),
  createdAt: row.created_at,
  assignedBy: row.assigned_by,
  assignedByName: row.assigned_by_name,
  ownerId: row.owner_id,
});

export const mapRecord = (row: WorkoutRow): WorkoutRecord => ({
  id: row.id,
  date: row.date,
  finishedAt: row.finished_at,
  part: (['upper', 'lower', 'full', 'cardio'].includes(row.part) ? row.part : 'upper') as BodyPart,
  routineName: row.routine_name,
  setsDone: row.sets_done,
  totalSets: row.total_sets,
  volume: Number(row.volume) || 0,
  exercises: Array.isArray(row.exercises)
    ? (row.exercises as WorkoutRecord['exercises'])
    : [],
});

const client = () => {
  if (!supabase) throw new Error('cloud_unavailable');
  return supabase;
};

const currentUserId = async (): Promise<string> => {
  const { data } = await client().auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error('not_signed_in');
  return id;
};

export async function fetchRoutines(): Promise<Routine[]> {
  const userId = await currentUserId();
  const { data, error } = await client()
    .from('setup_routines')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as RoutineRow[]).map(mapRoutine);
}

export async function createRoutine(input: {
  name: string;
  part: BodyPart;
  focus: string;
  minutes: number;
  exercises: Exercise[];
}): Promise<Routine> {
  const { data: auth } = await client().auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('not_signed_in');

  const { data, error } = await client()
    .from('setup_routines')
    .insert({
      owner_id: userId,
      created_by: userId,
      name: input.name,
      part: input.part,
      focus: input.focus,
      minutes: input.minutes,
      exercises: input.exercises,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRoutine(data as RoutineRow);
}

export async function updateRoutineRow(
  id: string,
  patch: { name?: string; exercises?: Exercise[]; minutes?: number; focus?: string },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.exercises !== undefined) payload.exercises = patch.exercises;
  if (patch.minutes !== undefined) payload.minutes = patch.minutes;
  if (patch.focus !== undefined) payload.focus = patch.focus;
  if (Object.keys(payload).length === 0) return;
  const { error } = await client().from('setup_routines').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteRoutineRow(id: string): Promise<void> {
  const { error } = await client().from('setup_routines').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchRecords(): Promise<WorkoutRecord[]> {
  const userId = await currentUserId();
  const { data, error } = await client()
    .from('setup_workouts')
    .select('*')
    .eq('user_id', userId)
    .order('finished_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as WorkoutRow[]).map(mapRecord);
}

export async function createRecord(record: WorkoutRecord): Promise<WorkoutRecord> {
  const { data: auth } = await client().auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('not_signed_in');

  const { data, error } = await client()
    .from('setup_workouts')
    .insert({
      user_id: userId,
      date: record.date,
      part: record.part,
      routine_name: record.routineName,
      sets_done: record.setsDone,
      total_sets: record.totalSets,
      volume: record.volume,
      exercises: record.exercises,
      finished_at: record.finishedAt,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRecord(data as WorkoutRow);
}

export async function deleteRecordRow(id: string): Promise<void> {
  const { error } = await client().from('setup_workouts').delete().eq('id', id);
  if (error) throw error;
}

/* ───────────────── 트레이너 ───────────────── */

export interface TrainerMember {
  userId: string;
  displayName: string;
  joinedAt: string;
  workouts: WorkoutRecord[];
  workoutCount: number;
  totalVolume: number;
  lastWorkoutDate: string | null;
}

export async function fetchTrainerMembers(trainerId: string): Promise<TrainerMember[]> {
  const { data: profiles, error: profileError } = await client()
    .from('setup_profiles')
    .select('user_id, display_name, created_at')
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: true });
  if (profileError) throw profileError;

  const rows = (profiles ?? []) as ProfileRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.user_id);
  const { data: workouts, error: workoutError } = await client()
    .from('setup_workouts')
    .select('*')
    .in('user_id', ids)
    .order('finished_at', { ascending: false })
    .limit(300);
  if (workoutError) throw workoutError;

  const byUser = new Map<string, WorkoutRecord[]>();
  for (const row of (workouts ?? []) as WorkoutRow[]) {
    const mapped = mapRecord(row);
    const list = byUser.get(row.user_id) ?? [];
    list.push(mapped);
    byUser.set(row.user_id, list);
  }

  return rows.map((row) => {
    const list = byUser.get(row.user_id) ?? [];
    return {
      userId: row.user_id,
      displayName: row.display_name ?? '회원',
      joinedAt: row.created_at,
      workouts: list,
      workoutCount: list.length,
      totalVolume: list.reduce((acc, item) => acc + item.volume, 0),
      lastWorkoutDate: list[0]?.date ?? null,
    };
  });
}

export async function fetchAssignedRoutines(trainerId: string): Promise<Routine[]> {
  const { data, error } = await client()
    .from('setup_routines')
    .select('*')
    .eq('assigned_by', trainerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as RoutineRow[]).map(mapRoutine);
}

export async function assignRoutineToMember(input: {
  memberId: string;
  trainerId: string;
  trainerName: string;
  name: string;
  part: BodyPart;
  focus: string;
  minutes: number;
  exercises: Exercise[];
}): Promise<Routine> {
  const { data, error } = await client()
    .from('setup_routines')
    .insert({
      owner_id: input.memberId,
      created_by: input.trainerId,
      assigned_by: input.trainerId,
      assigned_by_name: input.trainerName,
      name: input.name,
      part: input.part,
      focus: input.focus,
      minutes: input.minutes,
      exercises: input.exercises,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRoutine(data as RoutineRow);
}

/** 트레이너가 이미 배정한 루틴의 이름·부위·종목을 수정 */
export async function updateAssignedRoutine(
  id: string,
  patch: { name: string; part: BodyPart; exercises: Exercise[]; minutes?: number },
): Promise<Routine> {
  const { data, error } = await client()
    .from('setup_routines')
    .update({
      name: patch.name,
      part: patch.part,
      exercises: patch.exercises,
      ...(patch.minutes ? { minutes: patch.minutes } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return mapRoutine(data as RoutineRow);
}
