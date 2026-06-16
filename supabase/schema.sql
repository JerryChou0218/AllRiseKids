-- AllRiseKids / KidQuest 雲端 schema（M23：家長為主帳號模型）
-- 在 Supabase 專案的 SQL Editor 貼上並執行一次。
-- 模型：家長用 Google 登入 = auth.users 一列；其「整包雲端資料（名下小孩/進度/佇列等）」存成一列 jsonb。
--       排行榜與交易為跨家庭，另立可共讀的表。RLS 確保隱私。

-- ───────────────────────────────────────────────
-- 1) 家長雲端存檔：一個登入家長 = 一列（data 內含 children[] 等整包 kidquest_cloud 的該家長部分）
create table if not exists public.saves (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
drop policy if exists "read own save"   on public.saves;
drop policy if exists "write own save"  on public.saves;
create policy "read own save"  on public.saves for select using ( auth.uid() = user_id );
create policy "write own save" on public.saves for all
  using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- ───────────────────────────────────────────────
-- 2) 世界排行榜：跨家庭可讀（只放非敏感欄位：暱稱/等級/任務/年齡），各家長只能寫自己的列
create table if not exists public.leaderboard (
  child_id   text primary key,                 -- 小孩 id（非 PII）
  user_id    uuid not null references auth.users(id) on delete cascade,
  nickname   text not null,                    -- 遊戲暱稱（非真實姓名）
  level      int  not null default 1,
  tasks      int  not null default 0,
  week_tasks int  not null default 0,
  age        int  not null default 10,
  updated_at timestamptz not null default now()
);
alter table public.leaderboard enable row level security;
drop policy if exists "read all leaderboard"  on public.leaderboard;
drop policy if exists "write own leaderboard" on public.leaderboard;
create policy "read all leaderboard"  on public.leaderboard for select using ( true );
create policy "write own leaderboard" on public.leaderboard for all
  using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- ───────────────────────────────────────────────
-- 3) 跨家庭物品交換：交易雙方家長皆可讀寫該列
create table if not exists public.trades (
  id          text primary key,
  from_user   uuid not null references auth.users(id) on delete cascade,
  to_user     uuid not null references auth.users(id) on delete cascade,
  payload     jsonb not null,                  -- { from, to, offer, request, ... }
  status      text not null default 'proposed',-- proposed/pending_parent/accepted/declined/cancelled
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.trades enable row level security;
drop policy if exists "read involved trades"  on public.trades;
drop policy if exists "insert own trades"     on public.trades;
drop policy if exists "update involved trades" on public.trades;
create policy "read involved trades"   on public.trades for select
  using ( auth.uid() = from_user or auth.uid() = to_user );
create policy "insert own trades"      on public.trades for insert
  with check ( auth.uid() = from_user );
create policy "update involved trades" on public.trades for update
  using ( auth.uid() = from_user or auth.uid() = to_user );

-- ───────────────────────────────────────────────
-- 4) updated_at 自動刷新
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists saves_touch on public.saves;
create trigger saves_touch before update on public.saves for each row execute function public.touch_updated_at();
drop trigger if exists lb_touch on public.leaderboard;
create trigger lb_touch before update on public.leaderboard for each row execute function public.touch_updated_at();
drop trigger if exists trades_touch on public.trades;
create trigger trades_touch before update on public.trades for each row execute function public.touch_updated_at();
