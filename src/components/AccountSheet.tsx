import { useState } from 'react';
import { Copy, Link2, LogOut, ShieldCheck, Unlink, UserRound } from 'lucide-react';
import Sheet from './Sheet';
import { useAuth } from '../lib/auth';

interface AccountSheetProps {
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  guestCounts: { routines: number; records: number };
  onImportGuest: () => Promise<{ routines: number; records: number }>;
  cloud: boolean;
}

export default function AccountSheet({
  open,
  onClose,
  onToast,
  onOpenAuth,
  guestCounts,
  onImportGuest,
  cloud,
}: AccountSheetProps) {
  const { user, profile, signOut, linkTrainer, unlinkTrainer, updateDisplayName } = useAuth();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyCode = async () => {
    if (!profile?.trainerCode) return;
    try {
      await navigator.clipboard.writeText(profile.trainerCode);
      onToast('초대 코드를 복사했어요.');
    } catch {
      onToast(`초대 코드: ${profile.trainerCode}`);
    }
  };

  const connect = async () => {
    if (!code.trim()) {
      setError('초대 코드를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await linkTrainer(code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? '연결하지 못했어요.');
      return;
    }
    setCode('');
    onToast(`${result.trainerName || '트레이너'}님과 연결됐어요.`);
  };

  const saveName = async () => {
    setBusy(true);
    const result = await updateDisplayName(name);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? '저장하지 못했어요.');
      return;
    }
    setEditing(false);
    onToast('이름을 바꿨어요.');
  };

  return (
    <Sheet open={open} onClose={onClose} title="내 계정" subtitle={cloud ? '기록은 계정에 안전하게 저장됩니다.' : '체험 모드 — 이 기기에만 저장돼요.'}>
      {!user ? (
        <div className="space-y-3">
          <div className="card flex items-start gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-white/50">
              <UserRound size={18} />
            </span>
            <div>
              <p className="text-[13.5px] font-extrabold text-white">지금은 체험 모드예요</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">
                이 기기에만 기록이 저장됩니다. 로그인하면 폰을 바꿔도 기록과 루틴이 그대로 남고,
                트레이너에게 루틴을 배정받을 수 있어요.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => onOpenAuth('signup')} className="btn-primary w-full py-3 text-[14px]">
            회원가입
          </button>
          <button type="button" onClick={() => onOpenAuth('signin')} className="btn-ghost w-full py-3 text-[14px]">
            이미 계정이 있어요 (로그인)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-lime-300 text-[16px] font-extrabold text-ink-950">
                {(profile?.displayName ?? '회').slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-extrabold text-white">{profile?.displayName ?? '회원'}</p>
                <p className="truncate text-[11px] font-semibold text-white/40">{user.email}</p>
              </div>
              <span
                className={`badge ${
                  profile?.role === 'trainer'
                    ? 'border border-lime-300/30 bg-lime-300/15 text-lime-300'
                    : 'border border-emerald-400/30 bg-emerald-400/15 text-emerald-300'
                }`}
              >
                {profile?.role === 'trainer' ? '트레이너' : '회원'}
              </span>
            </div>

            {editing ? (
              <div className="mt-3 flex gap-1.5">
                <input
                  className="field py-2"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={profile?.displayName ?? '이름'}
                  aria-label="새 이름"
                  maxLength={20}
                />
                <button type="button" onClick={saveName} disabled={busy} className="btn-primary shrink-0 px-4 py-2 text-[13px]">
                  저장
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setName(profile?.displayName ?? '');
                  setEditing(true);
                }}
                className="mt-3 text-[11.5px] font-bold text-emerald-300/80"
              >
                이름 바꾸기
              </button>
            )}
          </div>

          {profile?.role === 'trainer' && profile.trainerCode && (
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-300" />
                <p className="text-[12.5px] font-extrabold text-white/80">회원 초대 코드</p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <p className="num flex-1 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-2.5 text-center text-[20px] font-extrabold tracking-[0.32em] text-emerald-200">
                  {profile.trainerCode}
                </p>
                <button
                  type="button"
                  onClick={copyCode}
                  aria-label="초대 코드 복사"
                  className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-white/60"
                >
                  <Copy size={15} />
                </button>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/30">
                회원이 가입하거나 ‘트레이너 연결’에 이 코드를 넣으면 담당 회원으로 연결됩니다.
              </p>
            </div>
          )}

          {profile?.role === 'member' && (
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <Link2 size={14} className="text-emerald-300" />
                <p className="text-[12.5px] font-extrabold text-white/80">담당 트레이너</p>
              </div>
              {profile.trainerId ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                  <div>
                    <p className="text-[13.5px] font-extrabold text-white">{profile.trainerName ?? '트레이너'}</p>
                    <p className="text-[10.5px] font-semibold text-white/35">배정 루틴을 받을 수 있어요</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await unlinkTrainer();
                      onToast(result.ok ? '트레이너 연결을 해제했어요.' : result.error ?? '해제하지 못했어요.');
                    }}
                    className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/50"
                  >
                    <Unlink size={11} /> 해제
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1.5">
                    <input
                      className="field py-2 uppercase tracking-[0.2em]"
                      value={code}
                      onChange={(event) => setCode(event.target.value.toUpperCase())}
                      placeholder="초대 코드"
                      maxLength={8}
                      aria-label="트레이너 초대 코드 입력"
                    />
                    <button type="button" onClick={connect} disabled={busy} className="btn-primary shrink-0 px-4 py-2 text-[13px]">
                      연결
                    </button>
                  </div>
                  <p className="text-[10.5px] text-white/30">트레이너에게 받은 6자리 초대 코드를 입력하세요.</p>
                </div>
              )}
            </div>
          )}

          {(guestCounts.routines > 0 || guestCounts.records > 0) && (
            <button
              type="button"
              onClick={async () => {
                const result = await onImportGuest();
                onToast(`체험 기록 ${result.records}개, 루틴 ${result.routines}개를 가져왔어요.`);
              }}
              className="w-full rounded-xl border border-dashed border-emerald-400/30 px-3 py-3 text-[12.5px] font-bold text-emerald-200/80"
            >
              이 기기의 체험 기록 가져오기 (기록 {guestCounts.records}개 · 루틴 {guestCounts.routines}개)
            </button>
          )}

          {error && (
            <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11.5px] font-semibold text-red-200">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={async () => {
              await signOut();
              onToast('로그아웃했어요.');
              onClose();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-3 text-[13px] font-bold text-white/55"
          >
            <LogOut size={14} /> 로그아웃
          </button>
        </div>
      )}
    </Sheet>
  );
}
