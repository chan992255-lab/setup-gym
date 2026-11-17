import { useEffect, useState } from 'react';

const PREFIX = 'setup-gym:v1';

/** localStorage 읽기 — 값이 없거나 깨졌으면 fallback */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(`${PREFIX}:${key}`);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** localStorage 쓰기 (사생활 보호 모드 등 실패는 무시) */
export function writeStore<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    /* 저장 공간이 없거나 차단된 경우에도 앱은 계속 동작한다 */
  }
}

/** localStorage 에 자동 저장되는 상태 */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStore<T>(key, initial));

  useEffect(() => {
    writeStore(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
