-- Play Caller: database setup.
-- Paste this whole file into Supabase → SQL Editor → New query → Run. Safe to run again.

create extension if not exists pgcrypto;

create table if not exists pc_rooms (
  code        text primary key check (code ~ '^[A-Z0-9]{4,8}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  league      text not null default 'nfl' check (league in ('nfl', 'college-football')),
  event_id    text,
  game_label  text,
  auto        boolean not null default true,
  host_key    text,
  round       int not null default 1 check (round >= 1),
  pending     jsonb not null default '[]'::jsonb,   -- locked rounds waiting for a result: [{r, t}]
  lock_log    jsonb not null default '[]'::jsonb,   -- recent lock taps, used to learn the TV delay
  delay       int,
  last_seq    bigint,
  rz_phase    text not null default 'none' check (rz_phase in ('none', 'open', 'locked')),
  rz_round    int not null default 0,
  rz_drive    text,
  rz_label    text,
  rz_done     text,
  status      jsonb,
  note        text check (char_length(note) <= 400)
);

create table if not exists pc_players (
  id          uuid primary key default gen_random_uuid(),
  room        text not null references pc_rooms(code) on delete cascade,
  name        text not null check (char_length(name) between 1 and 20),
  avatar      text not null default '🏈' check (char_length(avatar) <= 16),
  created_at  timestamptz not null default now()
);
create index if not exists pc_players_room on pc_players(room);

create table if not exists pc_picks (
  room        text not null references pc_rooms(code) on delete cascade,
  player      uuid not null references pc_players(id) on delete cascade,
  kind        text not null check (kind in ('play', 'drive')),
  round       int not null,
  play_type   text check (play_type in ('run', 'pass')),
  dir         text check (dir in ('left', 'center', 'right')),
  dist        text check (dist in ('short', 'mid', 'long')),
  drive       text check (drive in ('td', 'fg', 'none')),
  updated_at  timestamptz not null default now(),
  primary key (room, player, kind, round)
);

create table if not exists pc_results (
  room        text not null references pc_rooms(code) on delete cascade,
  kind        text not null check (kind in ('play', 'drive')),
  round       int not null,
  void        boolean not null default false,
  play_type   text check (play_type in ('run', 'pass')),
  dir         text check (dir in ('left', 'center', 'right')),
  dist        text check (dist in ('short', 'mid', 'long')),
  yards       int,
  drive       text check (drive in ('td', 'fg', 'none')),
  text        text check (char_length(text) <= 600),
  anim        jsonb,                                -- where the ball went, for the field animation
  source      text not null default 'auto' check (source in ('auto', 'host')),
  created_at  timestamptz not null default now(),
  primary key (room, kind, round)
);

alter table pc_results add column if not exists anim jsonb;

-- Picks can only be made or changed while that round is open. The database enforces this,
-- so nobody can sneak a pick in after the host taps LOCK.
create or replace function pc_pick_open(r text, k text, n int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from pc_rooms
    where code = r
      and ((k = 'play' and round = n) or (k = 'drive' and rz_phase = 'open' and rz_round = n))
  );
$$;

alter table pc_rooms   enable row level security;
alter table pc_players enable row level security;
alter table pc_picks   enable row level security;
alter table pc_results enable row level security;

do $$
declare t text;
begin
  foreach t in array array['pc_rooms', 'pc_players', 'pc_picks', 'pc_results'] loop
    execute format('drop policy if exists %I on %I', t || '_read', t);
    execute format('create policy %I on %I for select to anon, authenticated using (true)', t || '_read', t);
  end loop;
end $$;

drop policy if exists pc_rooms_insert on pc_rooms;
create policy pc_rooms_insert on pc_rooms for insert to anon, authenticated with check (true);
drop policy if exists pc_rooms_update on pc_rooms;
create policy pc_rooms_update on pc_rooms for update to anon, authenticated using (true) with check (true);

drop policy if exists pc_players_insert on pc_players;
create policy pc_players_insert on pc_players for insert to anon, authenticated with check (true);
drop policy if exists pc_players_update on pc_players;
create policy pc_players_update on pc_players for update to anon, authenticated using (true) with check (true);
drop policy if exists pc_players_delete on pc_players;
create policy pc_players_delete on pc_players for delete to anon, authenticated using (true);

drop policy if exists pc_picks_insert on pc_picks;
create policy pc_picks_insert on pc_picks for insert to anon, authenticated
  with check (pc_pick_open(room, kind, round));
drop policy if exists pc_picks_update on pc_picks;
create policy pc_picks_update on pc_picks for update to anon, authenticated
  using (pc_pick_open(room, kind, round)) with check (pc_pick_open(room, kind, round));

drop policy if exists pc_results_insert on pc_results;
create policy pc_results_insert on pc_results for insert to anon, authenticated with check (true);
drop policy if exists pc_results_update on pc_results;
create policy pc_results_update on pc_results for update to anon, authenticated using (true) with check (true);

-- Live updates to every phone.
alter table pc_rooms   replica identity full;
alter table pc_players replica identity full;
alter table pc_picks   replica identity full;
alter table pc_results replica identity full;
do $$
declare t text;
begin
  foreach t in array array['pc_rooms', 'pc_players', 'pc_picks', 'pc_results'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ===== Squares mini-game (added later; safe to run again) =====
alter table pc_rooms add column if not exists sq_phase text not null default 'open';
alter table pc_rooms add column if not exists sq_cols  jsonb;   -- digits across the top (away team)
alter table pc_rooms add column if not exists sq_rows  jsonb;   -- digits down the side (home team)
alter table pc_rooms add column if not exists sq_wins  jsonb not null default '[]'::jsonb;

create table if not exists pc_squares (
  room        text not null references pc_rooms(code) on delete cascade,
  idx         int  not null check (idx between 0 and 99),     -- row * 10 + column
  player      uuid not null references pc_players(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (room, idx)                                     -- one owner per square
);

create or replace function pc_squares_open(r text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pc_rooms where code = r and coalesce(sq_phase, 'open') = 'open');
$$;

-- Optional cap on squares per player (null = no limit).
alter table pc_rooms add column if not exists sq_max int check (sq_max between 1 and 100);
create or replace function pc_square_ok(r text, p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from pc_rooms
    where code = r and coalesce(sq_phase, 'open') = 'open'
      and (sq_max is null or (select count(*) from pc_squares where room = r and player = p) < sq_max)
  );
$$;

alter table pc_squares enable row level security;
drop policy if exists pc_squares_read on pc_squares;
create policy pc_squares_read on pc_squares for select to anon, authenticated using (true);
drop policy if exists pc_squares_insert on pc_squares;
create policy pc_squares_insert on pc_squares for insert to anon, authenticated with check (pc_square_ok(room, player));
drop policy if exists pc_squares_delete on pc_squares;
create policy pc_squares_delete on pc_squares for delete to anon, authenticated using (pc_squares_open(room));
alter table pc_squares replica identity full;
do $$ begin
  alter publication supabase_realtime add table pc_squares;
exception when duplicate_object then null;
end $$;

-- Optional clean-up: delete rooms older than 3 days (run by hand whenever you like).
-- delete from pc_rooms where created_at < now() - interval '3 days';
