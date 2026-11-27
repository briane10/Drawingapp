-- Marrowby Manor mystery game: database setup.
-- Paste this whole file into Supabase → SQL Editor → New query → Run. Safe to run again.
-- It only adds new mm_* tables; it doesn't touch Play Caller's pc_* tables.

create extension if not exists pgcrypto;

create table if not exists mm_rooms (
  code        text primary key check (code ~ '^[A-Z0-9]{4,8}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  host_key    text,
  case_id     text not null default 'marrowby' check (char_length(case_id) <= 40),
  phase       text not null default 'lobby' check (phase in ('lobby', 'intro', 'play', 'accuse', 'reveal')),
  mode        text not null default 'team' check (mode in ('team', 'solo')),
  difficulty  text not null default 'normal' check (difficulty in ('easy', 'normal', 'hard')),
  teams       int  not null default 2 check (teams between 2 and 3),
  ending      text not null default 'random' check (char_length(ending) <= 10),
  seed        bigint not null default 0,
  round       int  not null default 0 check (round between 0 and 20),
  game        int  not null default 1,                       -- bumps on "play again"; old moves are ignored
  actors      jsonb not null default '[]'::jsonb,            -- detectives (teams or players), frozen at start
  reveal_step int  not null default 0
);

create table if not exists mm_players (
  id          uuid primary key default gen_random_uuid(),
  room        text not null references mm_rooms(code) on delete cascade,
  name        text not null check (char_length(name) between 1 and 20),
  avatar      text not null default '🕵️' check (char_length(avatar) <= 16),
  team        int  not null default 1 check (team between 1 and 3),
  created_at  timestamptz not null default now()
);
create index if not exists mm_players_room on mm_players(room);

create table if not exists mm_moves (
  id          uuid primary key default gen_random_uuid(),
  room        text not null references mm_rooms(code) on delete cascade,
  game        int  not null default 1,
  actor       text not null check (char_length(actor) <= 40),
  player      uuid references mm_players(id) on delete set null,
  kind        text not null check (kind in ('search', 'question', 'theory', 'object', 'share', 'accuse')),
  round       int  not null,
  slot        int  not null,
  target      jsonb not null default '{}'::jsonb check (pg_column_size(target) < 2000),
  created_at  timestamptz not null default clock_timestamp(),
  unique (room, game, actor, kind, round, slot)
);
create index if not exists mm_moves_room on mm_moves(room);

-- The database itself enforces the rules: searches/questions/theories only during the current round
-- and only as many as allowed; one final accusation per detective.
create or replace function mm_move_ok(r text, g int, k text, n int, s int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mm_rooms
    where code = r and game = g and (
      (k in ('search', 'question', 'theory') and phase = 'play' and round = n and s >= 0 and s <
        case k
          when 'search'   then case mode when 'team' then 3 else 2 end
          when 'question' then case mode when 'team' then 2 else 1 end
          else 1
        end)
      or (k = 'accuse' and phase in ('play', 'accuse') and n = 0 and s = 0)
      or (k in ('object', 'share') and phase in ('play', 'accuse'))
    )
  );
$$;

alter table mm_rooms   enable row level security;
alter table mm_players enable row level security;
alter table mm_moves   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['mm_rooms', 'mm_players', 'mm_moves'] loop
    execute format('drop policy if exists %I on %I', t || '_read', t);
    execute format('create policy %I on %I for select to anon, authenticated using (true)', t || '_read', t);
  end loop;
end $$;

drop policy if exists mm_rooms_insert on mm_rooms;
create policy mm_rooms_insert on mm_rooms for insert to anon, authenticated with check (true);
drop policy if exists mm_rooms_update on mm_rooms;
create policy mm_rooms_update on mm_rooms for update to anon, authenticated using (true) with check (true);

drop policy if exists mm_players_insert on mm_players;
create policy mm_players_insert on mm_players for insert to anon, authenticated with check (true);
drop policy if exists mm_players_update on mm_players;
create policy mm_players_update on mm_players for update to anon, authenticated using (true) with check (true);
drop policy if exists mm_players_delete on mm_players;
create policy mm_players_delete on mm_players for delete to anon, authenticated using (true);

-- Moves can be added (never changed or deleted), and only when the rules allow.
drop policy if exists mm_moves_insert on mm_moves;
create policy mm_moves_insert on mm_moves for insert to anon, authenticated
  with check (mm_move_ok(room, game, kind, round, slot));

-- Live updates to every device.
alter table mm_rooms   replica identity full;
alter table mm_players replica identity full;
alter table mm_moves   replica identity full;
do $$
declare t text;
begin
  foreach t in array array['mm_rooms', 'mm_players', 'mm_moves'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Optional clean-up: delete games older than 3 days (run by hand whenever you like).
-- delete from mm_rooms where created_at < now() - interval '3 days';
