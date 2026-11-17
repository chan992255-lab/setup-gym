import { useCallback, useEffect, useState } from 'react';
import {
  createRecord as cloudCreateRecord,
  createRoutine as cloudCreateRoutine,
  deleteRecordRow,
  deleteRoutineRow,
  fetchRecords,
  fetchRoutines,
  updateRoutineRow,
} from './cloud';
import { readStore, writeStore } from './storage';
import { SEED_ROUTINES } from './session';
import { uid } from './data';
import type { BodyPart, Exercise, Routine, WorkoutRecord } from './types';

export interface GuestSnapshot {
  routines: Routine[];
  records: WorkoutRecord[];
}

const IMPORT_FLAG = 'imported';

export function readGuestSnapshot(): GuestSnapshot {
  const routines = readStore<Routine[]>('routines', SEED_ROUTINES);
  const records = readStore<WorkoutRecord[]>('records', []);
  return { routines, records };
}

export function hasImportedGuestData(): boolean {
  return readStore<boolean>(IMPORT_FLAG, false);
}

export function clearGuestSnapshot(): void {
  writeStore('routines', []);
  writeStore('records', []);
  writeStore(IMPORT_FLAG, true);
}

/** 체험 기록 가져오기를 건너뛰기로 한 경우 (기록은 지우지 않는다) */
export function markGuestImportSkipped(): void {
  writeStore(IMPORT_FLAG, true);
}

export interface RoutineInput {
  name: string;
  part: BodyPart;
  focus: string;
  minutes: number;
  exercises: Exercise[];
}

export interface DataStore {
  cloud: boolean;
  loading: boolean;
  routines: Routine[];
  records: WorkoutRecord[];
  addRoutine: (input: RoutineInput) => Promise<Routine>;
  updateRoutine: (id: string, patch: { name?: string; exercises?: Exercise[] }) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  addRecord: (record: WorkoutRecord) => Promise<WorkoutRecord>;
  deleteRecord: (id: string) => Promise<void>;
  importGuestData: () => Promise<{ routines: number; records: number }>;
}

export function useDataStore(userId: string | null): DataStore {
  const cloud = Boolean(userId);
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [records, setRecords] = useState<WorkoutRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      if (!userId) {
        const guest = readGuestSnapshot();
        if (cancelled) return;
        setRoutines(guest.routines);
        setRecords(guest.records);
        setLoading(false);
        return;
      }

      try {
        const [cloudRoutines, cloudRecords] = await Promise.all([fetchRoutines(), fetchRecords()]);
        let nextRoutines = cloudRoutines;

        // 새 계정에는 샘플 루틴 3개를 한 번 넣어준다.
        if (cloudRoutines.length === 0) {
          for (const seed of SEED_ROUTINES) {
            await cloudCreateRoutine({
              name: seed.name,
              part: seed.part,
              focus: seed.focus,
              minutes: seed.minutes,
              exercises: seed.exercises,
            });
          }
          nextRoutines = await fetchRoutines();
        }

        if (cancelled) return;
        setRoutines(nextRoutines);
        setRecords(cloudRecords);
      } catch {
        if (cancelled) return;
        setRoutines([]);
        setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 체험 모드는 이 기기의 localStorage 에 저장한다.
  useEffect(() => {
    if (cloud || loading) return;
    writeStore('routines', routines);
  }, [routines, cloud, loading]);

  useEffect(() => {
    if (cloud || loading) return;
    writeStore('records', records);
  }, [records, cloud, loading]);

  const addRoutine = useCallback(
    async (input: RoutineInput): Promise<Routine> => {
      if (userId) {
        const created = await cloudCreateRoutine(input);
        setRoutines((prev) => [created, ...prev]);
        return created;
      }
      const local: Routine = { id: uid('routine'), createdAt: new Date().toISOString(), ...input };
      setRoutines((prev) => [local, ...prev]);
      return local;
    },
    [userId],
  );

  const updateRoutine = useCallback(
    async (id: string, patch: { name?: string; exercises?: Exercise[] }) => {
      if (userId) {
        await updateRoutineRow(id, patch);
      }
      setRoutines((prev) => prev.map((routine) => (routine.id === id ? { ...routine, ...patch } : routine)));
    },
    [userId],
  );

  const deleteRoutine = useCallback(
    async (id: string) => {
      if (userId) {
        await deleteRoutineRow(id);
      }
      setRoutines((prev) => prev.filter((routine) => routine.id !== id));
    },
    [userId],
  );

  const addRecord = useCallback(
    async (record: WorkoutRecord): Promise<WorkoutRecord> => {
      if (userId) {
        const saved = await cloudCreateRecord(record);
        setRecords((prev) => [saved, ...prev]);
        return saved;
      }
      setRecords((prev) => [record, ...prev]);
      return record;
    },
    [userId],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      if (userId) {
        await deleteRecordRow(id);
      }
      setRecords((prev) => prev.filter((record) => record.id !== id));
    },
    [userId],
  );

  const importGuestData = useCallback(async () => {
    if (!userId) return { routines: 0, records: 0 };
    const guest = readGuestSnapshot();
    let routineCount = 0;
    let recordCount = 0;

    const importedRoutines: Routine[] = [];
    for (const routine of guest.routines) {
      if (routine.id.startsWith('seed-')) continue;
      const created = await cloudCreateRoutine({
        name: routine.name,
        part: routine.part,
        focus: routine.focus,
        minutes: routine.minutes,
        exercises: routine.exercises,
      });
      importedRoutines.push(created);
      routineCount += 1;
    }

    const importedRecords: WorkoutRecord[] = [];
    for (const record of guest.records) {
      const saved = await cloudCreateRecord({ ...record, id: uid('rec') });
      importedRecords.push(saved);
      recordCount += 1;
    }

    setRoutines((prev) => [...importedRoutines, ...prev]);
    setRecords((prev) => [...importedRecords, ...prev].sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1)));
    clearGuestSnapshot();

    return { routines: routineCount, records: recordCount };
  }, [userId]);

  return {
    cloud,
    loading,
    routines,
    records,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    addRecord,
    deleteRecord,
    importGuestData,
  };
}
