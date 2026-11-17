import { Dumbbell, LibraryBig, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TabKey = 'today' | 'routines' | 'history';

const TABS: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: 'today', label: '오늘 운동', icon: Dumbbell },
  { key: 'routines', label: '루틴 보관함', icon: LibraryBig },
  { key: 'history', label: '기록 & 1RM', icon: TrendingUp },
];

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-ink-950/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5"
            >
              <span
                className={`grid h-8 w-14 place-items-center rounded-full transition ${
                  isActive ? 'bg-emerald-400/15 text-emerald-300' : 'text-white/35'
                }`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.6 : 2} />
              </span>
              <span
                className={`text-[10.5px] font-bold tracking-tight transition ${
                  isActive ? 'text-emerald-200' : 'text-white/35'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
