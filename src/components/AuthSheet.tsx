import { useEffect, useState } from 'react';
import { Dumbbell, LogIn, UserPlus, Users } from 'lucide-react';
import Sheet from './Sheet';
import { useAuth } from '../lib/auth';

type Mode = 'signin' | 'signup';

interface AuthSheetProps {
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
  initialMode?: Mode;
}

export default function AuthSheet({ open, onClose, onDone, initialMode = 'signin' }: AuthSheetProps) {
  const { signIn, signUp, cloud } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'member' | 'trainer'>('member');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPassword('');
    setError(null);
  };

  // 시트를 열 때마다 깔끔한 폼으로 시작한다 (이전 계정 정보가 남지 않도록)
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setEmail('');
    setPassword('');
    setCode('');
    setName('');
    setError(null);
    setBusy(false);
  }, [open, initialMode]);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상으로 입력해 주세요.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('이름(닉네임)을 입력해 주세요.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        const result = await signIn(email, password);
        if (!result.ok) {
          setError(result.error ?? '로그인하지 못했어요.');
          return;
        }
        onDone('로그인했어요. 기록이 계정에 저장됩니다.');
        reset();
        onClose();
        return;
      }

      const result = await signUp({
        email,
        password,
        displayName: name,
        role,
        trainerCode: role === 'member' ? code : undefined,
      });
      if (!result.ok) {
        setError(result.error ?? '가입하지 못했어요.');
        return;
      }
      if (result.needsConfirm) {
        setError('가입 확인 메일을 보냈어요. 메일함에서 인증을 완료한 뒤 로그인해 주세요.');
        return;
      }
      if (result.error) {
        onDone(`가입 완료! 다만 ${result.error}`);
      } else {
        onDone(role === 'trainer' ? '트레이너 계정이 만들어졌어요. 회원을 초대해 보세요.' : '가입 완료! 환영합니다 🎉');
      }
      reset();
      setCode('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="세트업 계정"
      subtitle={cloud ? '로그인하면 루틴과 운동 기록이 계정에 저장돼요.' : '지금은 체험 모드로만 사용할 수 있어요.'}
    >
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl border border-white/[0.08] bg-ink-950/60 p-1">
        {(
          [
            { key: 'signin' as Mode, label: '로그인', icon: LogIn },
            { key: 'signup' as Mode, label: '회원가입', icon: UserPlus },
          ]
        ).map((item) => {
          const Icon = item.icon;
          const active = mode === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setMode(item.key);
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-extrabold transition ${
                active ? 'bg-emerald-400/15 text-emerald-200' : 'text-white/40'
              }`}
            >
              <Icon size={14} strokeWidth={2.6} /> {item.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {mode === 'signup' && (
          <>
            <div>
              <p className="label mb-1.5">역할</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setRole('member')}
                  aria-pressed={role === 'member'}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    role === 'member'
                      ? 'border-emerald-400/60 bg-emerald-400/10'
                      : 'border-white/[0.08] bg-white/[0.02]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-white">
                    <Dumbbell size={13} className="text-emerald-300" /> 회원
                  </span>
                  <span className="mt-0.5 block text-[10.5px] font-semibold text-white/40">운동 기록 · 루틴 관리</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('trainer')}
                  aria-pressed={role === 'trainer'}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    role === 'trainer'
                      ? 'border-emerald-400/60 bg-emerald-400/10'
                      : 'border-white/[0.08] bg-white/[0.02]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-white">
                    <Users size={13} className="text-emerald-300" /> 트레이너
                  </span>
                  <span className="mt-0.5 block text-[10.5px] font-semibold text-white/40">회원 관리 · 루틴 배정</span>
                </button>
              </div>
            </div>
            <label className="block">
              <span className="label">이름 (닉네임)</span>
              <input
                className="field mt-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 찬우"
                maxLength={20}
                aria-label="이름 또는 닉네임"
              />
            </label>
          </>
        )}

        <label className="block">
          <span className="label">이메일</span>
          <input
            className="field mt-1"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-label="이메일"
          />
        </label>

        <label className="block">
          <span className="label">비밀번호 (6자 이상)</span>
          <input
            className="field mt-1"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••"
            aria-label="비밀번호"
          />
        </label>

        {mode === 'signup' && role === 'member' && (
          <label className="block">
            <span className="label">트레이너 초대 코드 (선택)</span>
            <input
              className="field mt-1 uppercase tracking-[0.2em]"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="예: A1B2C3"
              maxLength={8}
              aria-label="트레이너 초대 코드"
            />
            <span className="mt-1 block text-[10.5px] text-white/30">트레이너에게 받은 6자리 코드를 넣으면 자동으로 연결돼요.</span>
          </label>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11.5px] font-semibold leading-relaxed text-red-200">
          {error}
        </p>
      )}

      <button type="button" onClick={submit} disabled={busy} className="btn-primary mt-4 w-full py-3.5 text-[15px]">
        {busy ? '처리 중…' : mode === 'signin' ? '로그인' : role === 'trainer' ? '트레이너로 가입하기' : '회원으로 가입하기'}
      </button>
      <p className="mt-2.5 text-center text-[10.5px] leading-relaxed text-white/30">
        체험 모드 기록은 로그인 후 계정으로 가져올 수 있어요.
      </p>
    </Sheet>
  );
}
