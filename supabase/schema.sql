-- Схема базы данных для eye-response-app (Supabase / Postgres).
--
-- Три предметные таблицы — прямой аналог того, что описано в главе 2
-- магистерской ВКР (там это была SQLite-таблица «Пациенты» + история
-- исследований), только разложено на три связанные таблицы вместо одной,
-- плюс `profiles` — стандартная для Supabase Auth таблица профиля врача.
--
-- В этом файле нет ни одного реального имени или значения — только
-- структура. Файл безопасно коммитить в git.
--
-- Как применить: Supabase Dashboard → SQL Editor → вставить целиком → Run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- patients — один пациент = один код (как в анонимизированной таблице
-- «Пациенты» в приложении). Диагноз/группа патологии — на уровне
-- пациента, а не глаза: в исходных данных ВКР она всегда совпадает у
-- обоих глаз одного пациента.
-- ---------------------------------------------------------------------
create table if not exists patients (
  code text primary key,
  pathology text not null check (pathology in ('norm', 'myopia', 'glaucoma', 'amd')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- patient_identity — ФИО и личные данные, один-к-одному с patients.
-- Отдельная таблица (а не колонки в patients), потому что это самые
-- чувствительные данные — удобно потом ограничить доступ к ней отдельной
-- RLS-политикой, если понадобится более тонкий контроль, чем «любой
-- авторизованный врач».
-- ---------------------------------------------------------------------
create table if not exists patient_identity (
  code text primary key references patients(code) on delete cascade,
  fio text not null,
  sex text not null check (sex in ('F', 'M')),
  dob date,
  clinic text,
  operator text,                 -- оператор прибора; известен не для всех записей
  stage text,                    -- стадия/форма заболевания
  doctor_comment text,           -- комментарий врача — то, что видно в колонке «Примечание»
  research_note text,            -- реальная пометка из ВКР (возраст на момент теста, оговорки по данным)
  device_pat_id text,            -- ID пациента в приборе, если был в исходном файле
  in_app boolean not null default true,
  -- Придуманные (не реальные) записи помечены явно — то самое поле для
  -- обратимости, о котором договорились, когда сочиняли ФИО для таблицы
  -- «Пациенты». В интерфейсе оно никак не показывается, но сохраняется.
  synthetic boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- patient_records — история исследований («визитов»). Одна строка — это
-- одно измерение одного глаза на одну дату. У всех пациентов из ВКР
-- сейчас будет ровно по одной строке на глаз (один-единственный визит —
-- он же единственный, что был зафиксирован в исходных данных), но
-- структура сразу поддерживает несколько визитов на одного пациента —
-- то, чего в текущем React-приложении вообще не было, а в магистерской
-- ВКР было прямо заявлено как цель («смотреть, как протекает болезнь»).
-- ---------------------------------------------------------------------
create table if not exists patient_records (
  id uuid primary key default gen_random_uuid(),
  code text not null references patients(code) on delete cascade,
  eye text not null check (eye in ('R', 'L')),
  visit_date date not null default current_date,
  phase1 double precision not null,       -- фаза 1-й гармоники ФЧХ, рад
  slope_pfc double precision not null,    -- наклон ФЧХ, рад/Гц
  nf double precision not null,           -- НЧ — сумма АЧХ на 20-50 Гц
  vf double precision not null,           -- ВЧ — сумма АЧХ на 51-81 Гц
  nf_hf double precision not null,        -- НЧ/ВЧ (может немного отличаться от nf/vf из-за округления в ВКР)
  research_note text,                     -- реальная пометка из ВКР для этого конкретного визита
  created_at timestamptz not null default now()
);

create index if not exists patient_records_code_idx on patient_records (code);
create index if not exists patient_records_code_eye_date_idx on patient_records (code, eye, visit_date);

-- ---------------------------------------------------------------------
-- profiles — профиль врача поверх Supabase Auth. Одна строка на
-- auth.users, создаётся автоматически триггером ниже при регистрации.
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- chart_exports — лог того, что кто-то нажал «Скачать PDF» на графике
-- пациента. Сам PDF нигде не хранится (файл уходит через системный
-- диалог печати браузера прямо на диск врача) — здесь только факт: кто,
-- когда, по какому пациенту/глазу. Пригодится, если понадобится понять,
-- кто и как часто на самом деле выгружает графики.
-- ---------------------------------------------------------------------
create table if not exists chart_exports (
  id uuid primary key default gen_random_uuid(),
  code text not null references patients(code) on delete cascade,
  eye text not null check (eye in ('R', 'L')),
  exported_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists chart_exports_code_idx on chart_exports (code);

-- ---------------------------------------------------------------------
-- RLS. Проект однопользовательский (один врач — вы), поэтому политика
-- простая: читать и писать может любой авторизованный пользователь, все
-- анонимные запросы (без входа) — запрещены. Если приложение когда-нибудь
-- станет многопользовательским (несколько врачей, каждый видит только
-- своих пациентов — как в самой ВКР), сюда нужно будет добавить колонку
-- doctor_id и сузить политики до `auth.uid() = doctor_id`.
-- ---------------------------------------------------------------------
alter table patients enable row level security;
alter table patient_identity enable row level security;
alter table patient_records enable row level security;
alter table profiles enable row level security;
alter table chart_exports enable row level security;

create policy "authenticated can read patients" on patients
  for select using (auth.uid() is not null);
create policy "authenticated can write patients" on patients
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated can read patient_identity" on patient_identity
  for select using (auth.uid() is not null);
create policy "authenticated can write patient_identity" on patient_identity
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated can read patient_records" on patient_records
  for select using (auth.uid() is not null);
create policy "authenticated can write patient_records" on patient_records
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "user can read own profile" on profiles
  for select using (auth.uid() = id);
create policy "user can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "authenticated can read chart_exports" on chart_exports
  for select using (auth.uid() is not null);
create policy "authenticated can log chart_exports" on chart_exports
  for insert with check (auth.uid() is not null);
