import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Supabase 환경변수가 없으면 앱은 체험 모드(로컬 저장)로만 동작한다. */
export const hasCloud = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = hasCloud
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

/** 사용자에게 보여줄 한국어 오류 문구 */
export const authErrorMessage = (message: string): string => {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않아요.';
  if (normalized.includes('user already registered')) return '이미 가입된 이메일이에요. 로그인해 주세요.';
  if (normalized.includes('password should be at least')) return '비밀번호는 6자 이상으로 입력해 주세요.';
  if (normalized.includes('invalid trainer') || normalized.includes('invalid_trainer_code'))
    return '초대 코드가 올바르지 않아요. 트레이너에게 코드를 다시 확인해 주세요.';
  if (normalized.includes('unable to validate email') || normalized.includes('invalid email'))
    return '이메일 형식을 확인해 주세요.';
  if (normalized.includes('email not confirmed')) return '이메일 인증이 필요해요. 메일함을 확인해 주세요.';
  if (normalized.includes('rate limit') || normalized.includes('too many')) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
};
