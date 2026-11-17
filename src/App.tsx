import { useEffect, useState } from 'react';
import { CheckCircle2, Dumbbell } from 'lucide-react';
import TodayTab from './components/TodayTab';
import RoutinesTab from './components/RoutinesTab';
import HistoryTab from './components/HistoryTab';
import TabBar, { type TabKey } from './components/TabBar';
import { useLocalState } from './lib/storage';
import { SEED_ROUTINES, sessionFromRoutine } from './lib/session';
import { formatKoreanDate } from './lib/dates';
import type { Prefs, Routine, Session, WorkoutRecord } from './lib/types';

const TITLES: Record<TabKey, string> = {
  today: '세트업 SetUp — 오늘의 헬스 루틴·세트 기록',
  routines: '루틴 보관함 — 세트업 SetUp',
  history: '기록 & 1RM 계산기 — 세트업 SetUp',
};

const tabFromHash = (): TabKey => {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return hash === 'routines' || hash === 'history' ? hash : 'today';
};

export default function App() {
  const [tab, setTab] = useState<TabKey>(tabFromHash);
  const [routines, setRoutines] = useLocalState<Routine[]>('routines', SEED_ROUTINES);
  const [records, setRecords] = useLocalState<WorkoutRecord[]>('records', []);
  const [session, setSession] = useLocalState<Session | null>('session', null);
  const [prefs, setPrefs] = useLocalState<Prefs>('prefs', { restSec: 60 });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.title = TITLES[tab];
  }, [tab]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const go = (next: TabKey) => {
    window.location.hash = `#/${next}`;
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const notify = (message: string) => setToast(message);

  const startRoutineFromLibrary = (routine: Routine) => {
    if (session) {
      notify('진행 중인 운동이 있어요. 먼저 저장하거나 그만두기를 눌러 주세요.');
      go('today');
      return;
    }
    setSession(sessionFromRoutine(routine));
    go('today');
    notify(`${routine.name} 시작! 첫 세트 화이팅 🔥`);
  };

  const saveRecord = (record: WorkoutRecord) => {
    setRecords((prev) => [record, ...prev]);
    go('history');
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
          <button type="button" onClick={() => go('today')} className="flex items-center gap-2.5 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-lime-300 text-ink-950 shadow-glow">
              <Dumbbell size={18} strokeWidth={2.8} />
            </span>
            <span>
              <span className="block text-[16.5px] font-extrabold leading-none tracking-tight text-white">세트업</span>
              <span className="mt-1 block text-[9.5px] font-bold uppercase leading-none tracking-[0.3em] text-emerald-300/70">
                SetUp
              </span>
            </span>
          </button>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-white/40">{formatKoreanDate(new Date())}</p>
            <p className="mt-0.5 text-[11px] font-bold text-white/65">
              {session ? '운동 진행 중 🔥' : '오늘도 한 세트씩'}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-28 pt-4">
        {tab === 'today' && (
          <TodayTab
            session={session}
            setSession={setSession}
            records={records}
            prefs={prefs}
            setPrefs={setPrefs}
            onSaved={saveRecord}
            notify={notify}
            onGoRoutines={() => go('routines')}
          />
        )}
        {tab === 'routines' && (
          <RoutinesTab
            routines={routines}
            setRoutines={setRoutines}
            onStart={startRoutineFromLibrary}
            notify={notify}
          />
        )}
        {tab === 'history' && (
          <HistoryTab
            records={records}
            onDelete={(id) => {
              setRecords((prev) => prev.filter((record) => record.id !== id));
              notify('기록을 삭제했어요.');
            }}
          />
        )}
      </main>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border border-emerald-400/25 bg-ink-850/95 px-3.5 py-2.5 shadow-card backdrop-blur animate-toast-in">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-300" />
            <p className="text-[12.5px] font-bold text-white/85">{toast}</p>
          </div>
        </div>
      )}

      <TabBar active={tab} onChange={go} />
    </div>
  );
}
