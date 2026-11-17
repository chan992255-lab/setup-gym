import type { BodyPart, Exercise, Unit } from './types';

export const uid = (prefix = 'id'): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** 입력 문자열에서 숫자만 읽는다 (빈 값은 0) */
export const num = (value: string): number => {
  const parsed = Number.parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const volumeFormatter = new Intl.NumberFormat('ko-KR');

/** 1234 -> "1,234" */
export const fmt = (value: number): string => volumeFormatter.format(Math.round(value));

/** 1234 -> "1.2 t" (1,000kg 이상은 톤으로도 표기) */
export const fmtVolume = (kg: number): string => (kg >= 10000 ? `${(kg / 1000).toFixed(1)}t` : `${fmt(kg)} kg`);

/** 62.5 -> "62.5", 60 -> "60" */
export const fmtWeight = (kg: number): string => {
  if (!Number.isFinite(kg)) return '0';
  const rounded = Math.round(kg * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const makeExercise = (
  name: string,
  sets: number,
  reps: number,
  weight: number,
  unit: Unit = 'rep',
): Exercise => ({ id: uid('ex'), name, sets, reps, weight, unit });

export interface PartMeta {
  label: string;
  tagline: string;
  badge: string;
  dot: string;
  ring: string;
}

export const PART_META: Record<BodyPart, PartMeta> = {
  upper: {
    label: '상체',
    tagline: '가슴 · 등 · 어깨 · 팔',
    badge: 'border border-emerald-400/30 bg-emerald-400/15 text-emerald-300',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-400/60',
  },
  lower: {
    label: '하체',
    tagline: '스쿼트 · 힙 · 종아리',
    badge: 'border border-lime-300/30 bg-lime-300/15 text-lime-300',
    dot: 'bg-lime-300',
    ring: 'ring-lime-300/60',
  },
  full: {
    label: '전신',
    tagline: '복합 관절 · 코어',
    badge: 'border border-cyan-400/30 bg-cyan-400/15 text-cyan-300',
    dot: 'bg-cyan-400',
    ring: 'ring-cyan-400/60',
  },
  cardio: {
    label: '유산소',
    tagline: '심폐 지구력 · 인터벌',
    badge: 'border border-orange-400/30 bg-orange-400/15 text-orange-300',
    dot: 'bg-orange-400',
    ring: 'ring-orange-400/60',
  },
};

export const PART_ORDER: BodyPart[] = ['upper', 'lower', 'full', 'cardio'];

/** 횟수 단위 표기: 회 · 분 · 초 */
export const unitLabel = (unit: Unit): string => (unit === 'rep' ? '회' : unit === 'min' ? '분' : '초');

/** 부위별 추천 루틴 (탭 1 카드) */
export interface RecommendedRoutine {
  key: string;
  name: string;
  focus: string;
  minutes: number;
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    weight: number;
    unit?: Unit;
  }>;
}

export const RECOMMENDED: Record<BodyPart, RecommendedRoutine[]> = {
  upper: [
    {
      key: 'upper-a',
      name: '상체 밀기 · 당기기 A',
      focus: '가슴과 등 균형 — 벤치 + 랫풀 조합',
      minutes: 55,
      exercises: [
        { name: '벤치프레스', sets: 4, reps: 8, weight: 60 },
        { name: '시티드 로우', sets: 4, reps: 10, weight: 50 },
        { name: '인클라인 덤벨프레스', sets: 3, reps: 10, weight: 20 },
        { name: '랫풀다운', sets: 3, reps: 12, weight: 45 },
        { name: '사이드 레터럴 레이즈', sets: 3, reps: 15, weight: 8 },
      ],
    },
    {
      key: 'upper-b',
      name: '어깨 · 팔 집중 B',
      focus: '프레스와 컬로 어깨·팔 볼륨 채우기',
      minutes: 45,
      exercises: [
        { name: '오버헤드 프레스', sets: 4, reps: 8, weight: 35 },
        { name: '바벨 로우', sets: 4, reps: 10, weight: 45 },
        { name: '딥스', sets: 3, reps: 10, weight: 0 },
        { name: '페이스 풀', sets: 3, reps: 15, weight: 20 },
        { name: '바벨 컬', sets: 3, reps: 12, weight: 25 },
      ],
    },
  ],
  lower: [
    {
      key: 'lower-a',
      name: '하체 스쿼트 중심 A',
      focus: '대퇴사두근과 둔근 — 스쿼트 메인',
      minutes: 60,
      exercises: [
        { name: '백 스쿼트', sets: 4, reps: 8, weight: 80 },
        { name: '루마니안 데드리프트', sets: 3, reps: 10, weight: 60 },
        { name: '레그프레스', sets: 3, reps: 12, weight: 120 },
        { name: '레그컬', sets: 3, reps: 15, weight: 40 },
        { name: '스탠딩 카프 레이즈', sets: 4, reps: 20, weight: 40 },
      ],
    },
    {
      key: 'lower-b',
      name: '힙 · 햄스트링 B',
      focus: '힙 쓰러스트와 스플릿 스쿼트',
      minutes: 50,
      exercises: [
        { name: '힙 쓰러스트', sets: 4, reps: 12, weight: 70 },
        { name: '불가리안 스플릿 스쿼트', sets: 3, reps: 10, weight: 16 },
        { name: '레그 익스텐션', sets: 3, reps: 15, weight: 35 },
        { name: '시티드 레그컬', sets: 3, reps: 15, weight: 35 },
        { name: '행잉 레그 레이즈', sets: 3, reps: 12, weight: 0 },
      ],
    },
  ],
  full: [
    {
      key: 'full-a',
      name: '전신 5대 운동 A',
      focus: '데드·풀업·런지로 전신 자극',
      minutes: 55,
      exercises: [
        { name: '데드리프트', sets: 4, reps: 5, weight: 90 },
        { name: '풀업', sets: 3, reps: 8, weight: 0 },
        { name: '덤벨 런지', sets: 3, reps: 12, weight: 16 },
        { name: '케틀벨 스윙', sets: 3, reps: 15, weight: 16 },
        { name: '플랭크', sets: 3, reps: 60, weight: 0, unit: 'sec' },
      ],
    },
    {
      key: 'full-b',
      name: '전신 서킷 B',
      focus: '짧은 휴식으로 심폐까지 — 40분 서킷',
      minutes: 40,
      exercises: [
        { name: '고블릿 스쿼트', sets: 4, reps: 12, weight: 24 },
        { name: '덤벨 벤치프레스', sets: 3, reps: 12, weight: 20 },
        { name: '원암 덤벨 로우', sets: 3, reps: 12, weight: 22 },
        { name: '케이블 크런치', sets: 3, reps: 15, weight: 25 },
        { name: '버피', sets: 3, reps: 45, weight: 0, unit: 'sec' },
      ],
    },
  ],
  cardio: [
    {
      key: 'cardio-a',
      name: '러닝 인터벌 30분',
      focus: '빠르게 1분 · 천천히 2분 반복',
      minutes: 30,
      exercises: [
        { name: '워밍업 걷기', sets: 1, reps: 5, weight: 0, unit: 'min' },
        { name: '러닝머신 인터벌', sets: 8, reps: 3, weight: 0, unit: 'min' },
        { name: '쿨다운 걷기', sets: 1, reps: 5, weight: 0, unit: 'min' },
      ],
    },
    {
      key: 'cardio-b',
      name: '사이클 · 로잉 40분',
      focus: '관절 부담 적은 유산소 + 코어',
      minutes: 40,
      exercises: [
        { name: '실내 사이클', sets: 2, reps: 15, weight: 0, unit: 'min' },
        { name: '로잉머신', sets: 2, reps: 10, weight: 0, unit: 'min' },
        { name: '케이블 우드찹', sets: 3, reps: 15, weight: 15 },
      ],
    },
  ],
};
