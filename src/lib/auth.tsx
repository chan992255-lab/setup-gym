import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { authErrorMessage, hasCloud, supabase } from './supabase';
import type { Profile } from './types';

interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  role: 'member' | 'trainer';
  trainerCode?: string;
}

interface AuthContextValue {
  ready: boolean;
  cloud: boolean;
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (input: SignUpInput) => Promise<{ ok: boolean; error?: string; needsConfirm?: boolean }>;
  signOut: () => Promise<void>;
  linkTrainer: (code: string) => Promise<{ ok: boolean; error?: string; trainerName?: string }>;
  unlinkTrainer: () => Promise<{ ok: boolean; error?: string }>;
  updateDisplayName: (name: string) => Promise<{ ok: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  role: string | null;
  trainer_id: string | null;
  trainer_name: string | null;
  trainer_code: string | null;
};

const mapProfile = (row: ProfileRow): Profile => ({
  userId: row.user_id,
  displayName: row.display_name ?? '회원',
  role: row.role === 'trainer' ? 'trainer' : 'member',
  trainerId: row.trainer_id,
  trainerName: row.trainer_name,
  trainerCode: row.trainer_code,
});

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!hasCloud);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!supabase) return null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data, error } = await supabase
        .from('setup_profiles')
        .select('user_id, display_name, role, trainer_id, trainer_name, trainer_code')
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && data) return mapProfile(data as ProfileRow);
      await sleep(250);
    }
    return null;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setProfile(null);
      return () => {
        active = false;
      };
    }
    loadProfile(user.id).then((next) => {
      if (active) setProfile(next);
    });
    return () => {
      active = false;
    };
  }, [user, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { ok: false, error: '지금은 체험 모드로만 사용할 수 있어요.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: authErrorMessage(error.message) };
    if (data.user) {
      const next = await loadProfile(data.user.id);
      setProfile(next);
    }
    return { ok: true };
  }, [loadProfile]);

  const signUp = useCallback(
    async (input: SignUpInput) => {
      if (!supabase) return { ok: false, error: '지금은 체험 모드로만 사용할 수 있어요.' };
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: { data: { display_name: input.displayName.trim(), role: input.role } },
      });
      if (error) return { ok: false, error: authErrorMessage(error.message) };
      if (!data.session || !data.user) return { ok: true, needsConfirm: true };

      const next = await loadProfile(data.user.id);
      setProfile(next);

      if (input.role === 'member' && input.trainerCode?.trim()) {
        const { error: linkError } = await supabase.rpc('setup_link_trainer', {
          p_code: input.trainerCode.trim(),
        });
        if (!linkError) {
          const refreshed = await loadProfile(data.user.id);
          setProfile(refreshed);
        } else {
          return { ok: true, error: authErrorMessage(linkError.message) };
        }
      }
      return { ok: true };
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const linkTrainer = useCallback(
    async (code: string) => {
      if (!supabase || !user) return { ok: false, error: '로그인이 필요해요.' };
      const { data, error } = await supabase.rpc('setup_link_trainer', { p_code: code.trim() });
      if (error) return { ok: false, error: authErrorMessage(error.message) };
      const refreshed = await loadProfile(user.id);
      setProfile(refreshed);
      const trainerName = (data as { trainer_name?: string } | null)?.trainer_name ?? refreshed?.trainerName ?? '';
      return { ok: true, trainerName };
    },
    [loadProfile, user],
  );

  const unlinkTrainer = useCallback(async () => {
    if (!supabase || !user) return { ok: false, error: '로그인이 필요해요.' };
    const { error } = await supabase.rpc('setup_unlink_trainer');
    if (error) return { ok: false, error: authErrorMessage(error.message) };
    setProfile(await loadProfile(user.id));
    return { ok: true };
  }, [loadProfile, user]);

  const updateDisplayName = useCallback(
    async (name: string) => {
      if (!supabase || !user) return { ok: false, error: '로그인이 필요해요.' };
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: '이름을 입력해 주세요.' };
      const { error } = await supabase.from('setup_profiles').update({ display_name: trimmed }).eq('user_id', user.id);
      if (error) return { ok: false, error: authErrorMessage(error.message) };
      setProfile((prev) => (prev ? { ...prev, displayName: trimmed } : prev));
      return { ok: true };
    },
    [user],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setProfile(await loadProfile(user.id));
  }, [loadProfile, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      cloud: hasCloud,
      user,
      profile,
      signIn,
      signUp,
      signOut,
      linkTrainer,
      unlinkTrainer,
      updateDisplayName,
      refreshProfile,
    }),
    [ready, user, profile, signIn, signUp, signOut, linkTrainer, unlinkTrainer, updateDisplayName, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
