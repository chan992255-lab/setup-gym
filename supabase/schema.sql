-- 세트업(SetUp) — 회원·트레이너 모드 스키마
-- 기존 프로젝트(study-pick, ref: cwiftbtyfndnthzuutrx)의 public 스키마를 재사용하므로
-- 모든 객체 이름에 setup_ 접두사를 붙여 다른 앱의 테이블과 분리한다.
-- 재실행 안전(idempotent).

-- ───────────────────────── 프로필 ─────────────────────────
create table if not exists public.setup_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'member' check (role in ('member', 'trainer')),
  trainer_id uuid references auth.users(id) on delete set null,
  trainer_name text,
  trainer_code text unique,
  created_at timestamptz not null default now()
);

alter table public.setup_profiles enable row level security;

drop policy if exists setup_profiles_select on public.setup_profiles;
create policy setup_profiles_select on public.setup_profiles
  for select using (user_id = auth.uid() or trainer_id = auth.uid());

-- 프로필은 회원가입 트리거와 SECURITY DEFINER 함수로만 만들고 연결한다.
revoke insert, update, delete on public.setup_profiles from anon, authenticated;
grant select on public.setup_profiles to authenticated;
grant update (display_name) on public.setup_profiles to authenticated;

-- ───────────────────────── 루틴 ─────────────────────────
create table if not exists public.setup_routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_by_name text,
  name text not null,
  part text not null check (part in ('upper', 'lower', 'full', 'cardio')),
  focus text not null default '',
  minutes integer not null default 45,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists setup_routines_owner_idx on public.setup_routines (owner_id, created_at desc);
create index if not exists setup_routines_trainer_idx on public.setup_routines (assigned_by, created_at desc);

alter table public.setup_routines enable row level security;

drop policy if exists setup_routines_select on public.setup_routines;
create policy setup_routines_select on public.setup_routines
  for select using (
    owner_id = auth.uid()
    or created_by = auth.uid()
    or exists (
      select 1 from public.setup_profiles p
      where p.user_id = setup_routines.owner_id and p.trainer_id = auth.uid()
    )
  );

drop policy if exists setup_routines_insert on public.setup_routines;
create policy setup_routines_insert on public.setup_routines
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      owner_id = auth.uid()
      or exists (
        select 1 from public.setup_profiles p
        where p.user_id = setup_routines.owner_id and p.trainer_id = auth.uid()
      )
    )
  );

drop policy if exists setup_routines_update on public.setup_routines;
create policy setup_routines_update on public.setup_routines
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (
      assigned_by = auth.uid()
      and exists (
        select 1 from public.setup_profiles p
        where p.user_id = setup_routines.owner_id and p.trainer_id = auth.uid()
      )
    )
  )
  with check (
    owner_id = auth.uid()
    or (
      assigned_by = auth.uid()
      and exists (
        select 1 from public.setup_profiles p
        where p.user_id = setup_routines.owner_id and p.trainer_id = auth.uid()
      )
    )
  );

drop policy if exists setup_routines_delete on public.setup_routines;
create policy setup_routines_delete on public.setup_routines
  for delete to authenticated
  using (
    owner_id = auth.uid()
    or (
      assigned_by = auth.uid()
      and exists (
        select 1 from public.setup_profiles p
        where p.user_id = setup_routines.owner_id and p.trainer_id = auth.uid()
      )
    )
  );

-- ───────────────────────── 운동 기록 ─────────────────────────
create table if not exists public.setup_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  part text not null,
  routine_name text not null,
  sets_done integer not null default 0,
  total_sets integer not null default 0,
  volume numeric not null default 0,
  exercises jsonb not null default '[]'::jsonb,
  finished_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists setup_workouts_user_idx on public.setup_workouts (user_id, finished_at desc);

alter table public.setup_workouts enable row level security;

drop policy if exists setup_workouts_select on public.setup_workouts;
create policy setup_workouts_select on public.setup_workouts
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.setup_profiles p
      where p.user_id = setup_workouts.user_id and p.trainer_id = auth.uid()
    )
  );

drop policy if exists setup_workouts_insert on public.setup_workouts;
create policy setup_workouts_insert on public.setup_workouts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists setup_workouts_delete on public.setup_workouts;
create policy setup_workouts_delete on public.setup_workouts
  for delete to authenticated
  using (user_id = auth.uid());

-- ─────────────────── 회원가입 시 프로필 자동 생성 ───────────────────
create or replace function public.setup_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := case
    when coalesce(new.raw_user_meta_data ->> 'role', 'member') = 'trainer' then 'trainer'
    else 'member'
  end;
  v_name text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_code text;
begin
  if v_role = 'trainer' then
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  end if;

  insert into public.setup_profiles (user_id, display_name, role, trainer_code)
  values (new.id, v_name, v_role, v_code)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_setup on auth.users;
create trigger on_auth_user_created_setup
  after insert on auth.users
  for each row execute function public.setup_handle_new_user();

-- ─────────────────── 트레이너 초대 코드로 연결 ───────────────────
create or replace function public.setup_link_trainer(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_trainer_name text;
begin
  select p.user_id, p.display_name
    into v_trainer_id, v_trainer_name
    from public.setup_profiles p
   where p.role = 'trainer'
     and p.trainer_code = upper(btrim(p_code))
   limit 1;

  if v_trainer_id is null then
    raise exception 'invalid_trainer_code';
  end if;

  update public.setup_profiles
     set trainer_id = v_trainer_id,
         trainer_name = v_trainer_name
   where user_id = auth.uid()
     and role = 'member';

  return json_build_object('trainer_id', v_trainer_id, 'trainer_name', v_trainer_name);
end;
$$;

grant execute on function public.setup_link_trainer(text) to authenticated;

-- ─────────────────── 연결 해제(회원 본인) ───────────────────
create or replace function public.setup_unlink_trainer()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.setup_profiles
     set trainer_id = null,
         trainer_name = null
   where user_id = auth.uid()
     and role = 'member';
end;
$$;

grant execute on function public.setup_unlink_trainer() to authenticated;
