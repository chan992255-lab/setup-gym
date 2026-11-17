# 세트업 (SetUp)

부위별 헬스 루틴으로 운동을 시작하고, 세트마다 무게·횟수를 기록하는 모바일 퍼스트 웹앱입니다.
회원과 트레이너가 함께 쓰는 버전으로, 트레이너가 회원에게 맞춤 루틴을 배정할 수 있습니다.

- 라이브: <https://setup-gym.vercel.app>
- 스택: React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Supabase(Auth · Postgres · RLS) + PWA

## 기능

### 오늘 운동
- 오늘 날짜와 오늘 완료 횟수·총 기록 수
- 부위 선택(상체 · 하체 · 전신 · 유산소)과 부위별 추천 루틴 카드
- **트레이너 배정 루틴**을 최상단에서 바로 시작
- `이 루틴 시작` → 종목별 세트 행(무게 kg · 횟수/시간 · 완료 체크)
- 세트 체크 시 **자동 휴식 타이머**(60초 / 90초 / 직접 입력, 원형 진행률, 일시정지·리셋, 종료 배너)
- 완료 세트 · 총 볼륨(kg) · 진행률 실시간 집계 → `운동 완료 저장`

### 루틴 보관함
- 샘플 루틴 3개 시드(상체 · 하체 · 전신), 펼치기/접기
- 새 루틴 만들기, 종목 추가/삭제, 루틴 삭제 (배정 루틴은 읽기 전용)

### 기록 & 1RM
- 이번 주 운동 횟수 · 총 세트 · 총 볼륨, 연속 운동일(스트릭)
- 1RM 계산기(Epley): 무게·횟수 입력 즉시 추정 1RM과 90% / 80% / 70% 중량표
- 최근 운동 기록 목록과 삭제

### 회원 · 트레이너
- 이메일·비밀번호 가입. 가입 시 **회원 / 트레이너** 역할 선택
- 회원: 6자리 초대 코드로 담당 트레이너 연결, 배정 루틴 수령·실행
- 트레이너: 초대 코드 발급, 담당 회원 목록(최근 운동일·총 횟수·총 볼륨), 회원 기록 상세,
  맞춤 루틴 배정(종목·세트·횟수·중량 직접 입력) 및 배정 삭제
- 비로그인 체험 모드(localStorage) 지원, 로그인 시 **체험 기록 가져오기**

## 데이터

| 테이블 | 설명 |
| --- | --- |
| `setup_profiles` | 프로필(이름·역할·담당 트레이너·초대 코드) |
| `setup_routines` | 루틴(소유자·생성자·배정 트레이너·종목 JSON) |
| `setup_workouts` | 운동 기록(날짜·부위·완료 세트·볼륨·종목 JSON) |

- 전체 RLS 적용: 회원은 자기 데이터만, 트레이너는 담당 회원 데이터만 조회합니다.
- 스키마·정책·트리거·RPC: [`supabase/schema.sql`](supabase/schema.sql) (재실행 안전)
- 가입 트리거가 프로필을 자동 생성하고, 트레이너 코드는 `setup_link_trainer` RPC로만 연결됩니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # Supabase URL / publishable key
npm run dev                  # http://localhost:5173
npm run build                # tsc --noEmit && vite build
```

## 배포

GitHub `main` 브랜치에 푸시하면 Vercel이 자동 배포합니다.
Vercel 프로젝트 환경변수(Production): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
