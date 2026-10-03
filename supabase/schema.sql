-- Онлайн-чат: таблицы, правила доступа и realtime.
-- Как применить: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Скрипт можно запускать повторно: он ничего не ломает и не удаляет сообщения.

-- ---------- Профили участников чата ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#5181b8',
  avatar text check (avatar is null or char_length(avatar) <= 200000),
  updated_at timestamptz not null default now()
);

-- ---------- Личные сообщения ----------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_dialog_idx on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_unread_idx on public.messages (recipient_id, read_at);

-- ---------- Правила доступа (RLS) ----------
alter table public.profiles enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Профили видны всем участникам" on public.profiles;
create policy "Профили видны всем участникам" on public.profiles
  for select to authenticated using (true);

drop policy if exists "Можно создать только свой профиль" on public.profiles;
create policy "Можно создать только свой профиль" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "Можно менять только свой профиль" on public.profiles;
create policy "Можно менять только свой профиль" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Видны только свои переписки" on public.messages;
create policy "Видны только свои переписки" on public.messages
  for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

drop policy if exists "Писать можно только от своего имени" on public.messages;
create policy "Писать можно только от своего имени" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and recipient_id <> (select auth.uid()));

drop policy if exists "Получатель отмечает прочитанным" on public.messages;
create policy "Получатель отмечает прочитанным" on public.messages
  for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

-- Менять в сообщении можно только отметку о прочтении, не текст
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- ---------- Realtime: новые сообщения и профили приходят сразу ----------
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;
