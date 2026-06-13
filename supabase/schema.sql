-- KidQuest 雲端存檔 — Supabase schema（M9）
-- 在 Supabase 專案的 SQL Editor 貼上並執行一次。
-- 模型：一個登入帳號 = 一筆存檔列；Row Level Security 確保彼此隔離。

-- 1) 存檔表
create table if not exists public.saves (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2) 啟用 Row Level Security（沒有這行，下面的 policy 不會生效！）
alter table public.saves enable row level security;

-- 3) Policies：每個使用者只能存取自己的那一列（user_id = auth.uid()）
drop policy if exists "read own save"   on public.saves;
drop policy if exists "insert own save" on public.saves;
drop policy if exists "update own save" on public.saves;

create policy "read own save"
  on public.saves for select
  using ( auth.uid() = user_id );

create policy "insert own save"
  on public.saves for insert
  with check ( auth.uid() = user_id );

create policy "update own save"
  on public.saves for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 4)（可選）每次更新自動刷新 updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists saves_touch_updated_at on public.saves;
create trigger saves_touch_updated_at
  before update on public.saves
  for each row execute function public.touch_updated_at();

-- 驗證 RLS：用 A 帳號登入時 select * from saves 只會看到 A 自己的列。
