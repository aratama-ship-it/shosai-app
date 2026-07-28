-- 舞台スケッチ オンライン同期 セットアップ（SYNC_DESIGN.md 参照）
-- Supabase ダッシュボード → SQL Editor へ全文貼り付けて実行する。再実行しても壊れない。

create table if not exists public.stage_shows (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  data        jsonb not null,
  revision    integer not null default 1,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);

create table if not exists public.stage_show_members (
  show_id  uuid not null references public.stage_shows(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     text not null default 'editor',
  primary key (show_id, user_id)
);

create table if not exists public.stage_invites (
  id          uuid primary key default gen_random_uuid(),
  show_id     uuid not null references public.stage_shows(id) on delete cascade,
  email       text not null,
  invited_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

alter table public.stage_shows        enable row level security;
alter table public.stage_show_members enable row level security;
alter table public.stage_invites      enable row level security;

-- メンバー判定（RLSの中から使うので security definer で再帰を避ける）
create or replace function public.is_show_member(p_show uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from stage_show_members m
    where m.show_id = p_show and m.user_id = auth.uid()
  );
$$;

-- stage_shows: 読み書きは owner か member。作成は本人。削除は owner のみ
drop policy if exists shows_select on public.stage_shows;
create policy shows_select on public.stage_shows for select
  using (owner = auth.uid() or public.is_show_member(id));

drop policy if exists shows_insert on public.stage_shows;
create policy shows_insert on public.stage_shows for insert
  with check (owner = auth.uid());

drop policy if exists shows_update on public.stage_shows;
create policy shows_update on public.stage_shows for update
  using (owner = auth.uid() or public.is_show_member(id))
  with check (owner = auth.uid() or public.is_show_member(id));

drop policy if exists shows_delete on public.stage_shows;
create policy shows_delete on public.stage_shows for delete
  using (owner = auth.uid());

-- members: 追加・削除は owner。自分の行は見える・消せる（退出）
drop policy if exists members_select on public.stage_show_members;
create policy members_select on public.stage_show_members for select
  using (user_id = auth.uid()
         or exists (select 1 from stage_shows s where s.id = show_id and s.owner = auth.uid()));

drop policy if exists members_insert on public.stage_show_members;
create policy members_insert on public.stage_show_members for insert
  with check (exists (select 1 from stage_shows s where s.id = show_id and s.owner = auth.uid()));

drop policy if exists members_delete on public.stage_show_members;
create policy members_delete on public.stage_show_members for delete
  using (user_id = auth.uid()
         or exists (select 1 from stage_shows s where s.id = show_id and s.owner = auth.uid()));

-- invites: owner が出す。owner は自分のショーの分を見られる
drop policy if exists invites_select on public.stage_invites;
create policy invites_select on public.stage_invites for select
  using (exists (select 1 from stage_shows s where s.id = show_id and s.owner = auth.uid()));

drop policy if exists invites_insert on public.stage_invites;
create policy invites_insert on public.stage_invites for insert
  with check (invited_by = auth.uid()
              and exists (select 1 from stage_shows s where s.id = show_id and s.owner = auth.uid()));

drop policy if exists invites_delete on public.stage_invites;
create policy invites_delete on public.stage_invites for delete
  using (exists (select 1 from stage_shows s where s.id = show_id and s.owner = auth.uid()));

-- ログインした本人が、自分のメール宛の招待を受理して members へ入る
create or replace function public.accept_my_invites()
returns integer language plpgsql security definer set search_path = public as $$
declare moved integer;
begin
  with mine as (
    delete from stage_invites i
    where lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    returning i.show_id
  ), ins as (
    insert into stage_show_members (show_id, user_id)
    select show_id, auth.uid() from mine
    on conflict do nothing
    returning 1
  )
  select count(*) into moved from ins;
  return moved;
end;
$$;

-- push 時の楽観ロック更新（0行更新＝競合、を1回の呼び出しで判定する）
create or replace function public.push_show(
  p_id uuid, p_expected_revision integer, p_title text, p_data jsonb
) returns table (ok boolean, new_revision integer, server_revision integer)
language plpgsql security definer set search_path = public as $$
declare cur integer;
begin
  select revision into cur from stage_shows s
  where s.id = p_id and (s.owner = auth.uid() or public.is_show_member(s.id))
  for update;
  if cur is null then
    return query select false, null::integer, null::integer; return;
  end if;
  if cur <> p_expected_revision then
    return query select false, null::integer, cur; return;
  end if;
  update stage_shows s
  set title = p_title, data = p_data, revision = cur + 1,
      updated_at = now(), updated_by = auth.uid()
  where s.id = p_id;
  return query select true, cur + 1, cur + 1;
end;
$$;
