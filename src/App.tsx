import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Dumbbell, LogIn, UserRound } from 'lucide-react';
import TodayTab from './components/TodayTab';
import RoutinesTab from './components/RoutinesTab';
import HistoryTab from './components/HistoryTab';
import TrainerTab from './components/TrainerTab';
import TabBar, { type TabKey } from './components/TabBar';
import AuthSheet from './components/AuthSheet';
import AccountSheet from './components/AccountSheet';
import Sheet from './components/Sheet';
import { useLocalState } from './lib/storage';
import { useAuth } from './lib/auth';
import {
  hasImportedGuestData,
  markGuestImportSkipped,
  readGuestSnapshot,
  useDataStore,
} from './lib/useDataStore';
import { sessionFromRoutine } from './lib/session';
import type { Prefs, Session, Routine, WorkoutRecord } from './lib/types';

const TITLES: Record<TabKey, string> = {
  today: '세트업 SetUp — 오늘의 헬스 루틴·세트 기록',
  routines: '루틴 보관함 — 세트업 SetUp',
  history: '기록 & 1RM 계산기 — 세트업 SetUp',
  trainer: '트레이너 관리 — 세트업 SetUp',
};

const tabFromHash = (): TabKey => {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return hash === 'routines' || hash === 'history' || hash === 'trainer' ? hash : 'today';
};

export default function App() {
  const { ready, user, profile, cloud } = useAuth();
  const store = useDataStore(user?.id ?? null);
  const [tab, setTab] = useState<TabKey>(tabFromHash);
  const [session, setSession] = useLocalState<Session | null>('session', null);
  const [prefs, setPrefs] = useLocalState<Prefs>('prefs', { restSec: 60 });
  const [toast, setToast] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [accountOpen, setAccountOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importTick, setImportTick] = useState(0);

  const trainerMode = profile?.role === 'trainer';
  const assignedRoutines = useMemo(
    () => store.routines.filter((routine) => Boolean(routine.assignedBy)),
    [store.routines],
  );

  const guestCounts = useMemo(() => {
    const snapshot = readGuestSnapshot();
    return {
      routines: snapshot.routines.filter((routine) => !routine.id.startsWith('seed-')).length,
      records: snapshot.records.length,
    };
  }, [user, importTick, cloud]);

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!user || hasImportedGuestData()) return;
    const snapshot = readGuestSnapshot();
    const customRoutines = snapshot.routines.filter((routine) => !routine.id.startsWith('seed-'));
    if (snapshot.records.length > 0 || customRoutines.length > 0) {
      setImportOpen(true);
    }
  }, [user]);

  useEffect(() => {
    if (!ready || tab !== 'trainer') return;
    if (user && !profile) return; // 프로필을 불러오는 동안은 그대로 둔다
    if (profile?.role !== 'trainer') {
      setTab('today');
      if (window.location.hash.includes('trainer')) window.location.hash = '#/today';
    }
  }, [ready, tab, user, profile]);

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

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAccountOpen(false);
    setAuthOpen(true);
  };

  const startRoutine = (routine: Routine) => {
    setSession(sessionFromRoutine(routine));
    go('today');
    notify(`${routine.name} 시작! 첫 세트 화이팅 🔥`);
  };

  const startRoutineFromLibrary = (routine: Routine) => {
    if (session) {
      notify('진행 중인 운동이 있어요. 먼저 저장하거나 그만두기를 눌러 주세요.');
      go('today');
      return;
    }
    startRoutine(routine);
  };

  const handleSaved = async (record: WorkoutRecord) => {
    await store.addRecord(record);
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

          {user ? (
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="flex max-w-[52%] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2.5"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-lime-300 text-[12px] font-extrabold text-ink-950">
                {(profile?.displayName ?? '회').slice(0, 1)}
              </span>
              <span className="min-w-0 truncate text-[12px] font-extrabold text-white/80">
                {profile?.displayName ?? '회원'}
              </span>
              <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${
                  trainerMode ? 'bg-lime-300/20 text-lime-300' : 'bg-emerald-400/20 text-emerald-300'
                }`}
              >
                {trainerMode ? '트레이너' : '회원'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuth('signin')}
              className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-extrabold text-emerald-200"
            >
              <LogIn size={13} strokeWidth={2.8} /> 로그인
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-28 pt-4">
        {!ready || store.loading ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-300 text-ink-950">
              <Dumbbell size={22} strokeWidth={2.8} />
            </span>
            <p className="text-[12.5px] font-bold text-white/40">세트업을 불러오는 중…</p>
          </div>
        ) : (
          <>
            {tab === 'today' && (
              <TodayTab
                session={session}
                setSession={setSession}
                records={store.records}
                prefs={prefs}
                setPrefs={setPrefs}
                onSaved={handleSaved}
                notify={notify}
                onGoRoutines={() => go('routines')}
                assignedRoutines={assignedRoutines}
                guest={!user}
                onLogin={() => openAuth('signup')}
              />
            )}
            {tab === 'routines' && (
              <RoutinesTab
                routines={store.routines}
                addRoutine={store.addRoutine}
                updateRoutine={store.updateRoutine}
                deleteRoutine={store.deleteRoutine}
                onStart={startRoutineFromLibrary}
                notify={notify}
                cloud={store.cloud}
              />
            )}
            {tab === 'history' && (
              <HistoryTab
                records={store.records}
                onDelete={async (id) => {
                  try {
                    await store.deleteRecord(id);
                    notify('기록을 삭제했어요.');
                  } catch {
                    notify('기록을 삭제하지 못했어요.');
                  }
                }}
              />
            )}
            {tab === 'trainer' && trainerMode && <TrainerTab notify={notify} />}
          </>
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

      <TabBar active={tab} onChange={go} trainerMode={trainerMode} />

      <AuthSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onDone={notify}
        initialMode={authMode}
      />

      <AccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onToast={notify}
        onOpenAuth={openAuth}
        guestCounts={guestCounts}
        onImportGuest={async () => {
          const result = await store.importGuestData();
          setImportTick((prev) => prev + 1);
          return result;
        }}
        cloud={cloud}
      />

      <Sheet
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          markGuestImportSkipped();
        }}
        title="체험 기록을 가져올까요?"
        subtitle={`이 기기에 저장된 운동 기록 ${guestCounts.records}개와 루틴 ${guestCounts.routines}개가 있어요.`}
      >
        <div className="space-y-2.5">
          <div className="card-soft flex items-start gap-2.5 p-3.5">
            <UserRound size={15} className="mt-0.5 shrink-0 text-emerald-300" />
            <p className="text-[11.5px] leading-relaxed text-white/45">
              가져오면 계정에 저장돼 폰을 바꿔도 남아요. 체험 모드 기록은 계정으로 옮긴 뒤 정리됩니다.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary w-full py-3 text-[14px]"
            onClick={async () => {
              try {
                const result = await store.importGuestData();
                setImportTick((prev) => prev + 1);
                setImportOpen(false);
                notify(`기록 ${result.records}개 · 루틴 ${result.routines}개를 가져왔어요.`);
              } catch {
                notify('기록을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.');
              }
            }}
          >
            계정으로 가져오기
          </button>
          <button
            type="button"
            className="btn-ghost w-full py-3 text-[13px]"
            onClick={() => {
              setImportOpen(false);
              markGuestImportSkipped();
            }}
          >
            그냥 새로 시작할게요
          </button>
        </div>
      </Sheet>
    </div>
  );
}
