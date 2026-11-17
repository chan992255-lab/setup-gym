export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (value: number): string => String(value).padStart(2, '0');

/** 로컬 기준 YYYY-MM-DD */
export const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayISO = (): string => toISODate(new Date());

/** "11월 17일 화요일" */
export const formatKoreanDate = (date: Date): string =>
  `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;

/** 이번 주 월요일 00:00 */
export const startOfWeek = (date: Date): Date => {
  const copy = new Date(date);
  const offset = (copy.getDay() + 6) % 7; // 월=0 … 일=6
  copy.setDate(copy.getDate() - offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const daysBetween = (fromISO: string, toISO: string): number => {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
};

/** 기록 날짜들을 "오늘"·"어제"·"11.16 (월)" 로 표시 */
export const formatRecordDate = (dateISO: string): string => {
  const today = todayISO();
  if (dateISO === today) return '오늘';
  const diff = daysBetween(dateISO, today);
  if (diff === 1) return '어제';
  const date = new Date(`${dateISO}T00:00:00`);
  return `${date.getMonth() + 1}.${date.getDate()} (${WEEKDAYS[date.getDay()]})`;
};

/** 오늘(또는 어제)부터 거꾸로 이어진 연속 운동일 */
export const computeStreak = (dates: string[]): number => {
  const unique = new Set(dates);
  const cursor = new Date();
  if (!unique.has(toISODate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (unique.has(toISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

/** "오후 7:42" 형태의 시각 표기 */
export const formatClock = (iso: string): string => {
  const date = new Date(iso);
  const hours = date.getHours();
  const meridiem = hours < 12 ? '오전' : '오후';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${meridiem} ${hour12}:${pad(date.getMinutes())}`;
};
