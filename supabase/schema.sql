-- Социальная сеть: профили, друзья, посты, фото, сообщения.
-- Как применить: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Скрипт можно запускать повторно: существующие данные он не удаляет.

-- Старая схема онлайн-чата (анонимные профили с колонкой name) несовместима
-- с настоящими пользователями — убираем её, там только тестовые данные
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'name'
  ) then
    drop table if exists public.messages;
    drop table if exists public.profiles;
  end if;
end $$;

-- =====================================================================
-- Профили
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 32),
  last_name text not null check (char_length(last_name) between 1 and 32),
  color text not null default '#5181b8',
  status text not null default '' check (char_length(status) <= 140),
  avatar_url text,
  cover_url text,
  -- Остальное из «Редактировать профиль»: пол, дата рождения, контакты, интересы…
  info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Профили видны всем" on public.profiles;
create policy "Профили видны всем" on public.profiles
  for select to authenticated using (true);

drop policy if exists "Создать можно только свой профиль" on public.profiles;
create policy "Создать можно только свой профиль" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "Менять можно только свой профиль" on public.profiles;
create policy "Менять можно только свой профиль" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- =====================================================================
-- Друзья: заявка (pending) → принята (accepted). Одна запись на пару людей
-- =====================================================================
create table if not exists public.friendships (
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_idx on public.friendships (
  least(requester_id, addressee_id), greatest(requester_id, addressee_id)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$;

alter table public.friendships enable row level security;

drop policy if exists "Видны свои заявки и все дружбы" on public.friendships;
create policy "Видны свои заявки и все дружбы" on public.friendships
  for select to authenticated
  using (status = 'accepted' or (select auth.uid()) in (requester_id, addressee_id));

drop policy if exists "Заявку отправляет сам пользователь" on public.friendships;
create policy "Заявку отправляет сам пользователь" on public.friendships
  for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');

drop policy if exists "Принимает заявку получатель" on public.friendships;
create policy "Принимает заявку получатель" on public.friendships
  for update to authenticated
  using (addressee_id = (select auth.uid()))
  with check (addressee_id = (select auth.uid()) and status = 'accepted');

drop policy if exists "Отменить или удалить может любая сторона" on public.friendships;
create policy "Отменить или удалить может любая сторона" on public.friendships
  for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

revoke update on public.friendships from authenticated;
grant update (status) on public.friendships to authenticated;

-- =====================================================================
-- Посты на стене, лайки, комментарии
-- =====================================================================
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade, -- чья стена
  text text not null default '' check (char_length(text) <= 10000),
  image_url text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  check (char_length(text) > 0 or image_url is not null)
);

create index if not exists posts_owner_idx on public.posts (owner_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "Посты видны всем" on public.posts;
create policy "Посты видны всем" on public.posts
  for select to authenticated using (true);

drop policy if exists "Писать можно на своей стене и у друзей" on public.posts;
create policy "Писать можно на своей стене и у друзей" on public.posts
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (owner_id = (select auth.uid()) or public.are_friends((select auth.uid()), owner_id))
  );

drop policy if exists "Закрепляет владелец стены" on public.posts;
create policy "Закрепляет владелец стены" on public.posts
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "Удаляет автор или владелец стены" on public.posts;
create policy "Удаляет автор или владелец стены" on public.posts
  for delete to authenticated
  using ((select auth.uid()) in (author_id, owner_id));

revoke update on public.posts from authenticated;
grant update (pinned) on public.posts to authenticated;

create table if not exists public.post_likes (
  post_id bigint not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Лайки видны всем" on public.post_likes;
create policy "Лайки видны всем" on public.post_likes
  for select to authenticated using (true);

drop policy if exists "Лайк ставит сам пользователь" on public.post_likes;
create policy "Лайк ставит сам пользователь" on public.post_likes
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Лайк снимает сам пользователь" on public.post_likes;
create policy "Лайк снимает сам пользователь" on public.post_likes
  for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.post_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

drop policy if exists "Комментарии видны всем" on public.post_comments;
create policy "Комментарии видны всем" on public.post_comments
  for select to authenticated using (true);

drop policy if exists "Комментирует сам пользователь" on public.post_comments;
create policy "Комментирует сам пользователь" on public.post_comments
  for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists "Удаляет автор комментария или владелец стены" on public.post_comments;
create policy "Удаляет автор комментария или владелец стены" on public.post_comments
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.posts p
      where p.id = post_id and p.owner_id = (select auth.uid())
    )
  );

-- =====================================================================
-- Фотографии, их лайки и комментарии
-- =====================================================================
create table if not exists public.photos (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  path text not null,  -- путь в Storage, нужен для удаления файла
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists photos_owner_idx on public.photos (owner_id, created_at desc);

alter table public.photos enable row level security;

drop policy if exists "Фото видны всем" on public.photos;
create policy "Фото видны всем" on public.photos
  for select to authenticated using (true);

drop policy if exists "Добавляет фото владелец" on public.photos;
create policy "Добавляет фото владелец" on public.photos
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "Удаляет фото владелец" on public.photos;
create policy "Удаляет фото владелец" on public.photos
  for delete to authenticated using (owner_id = (select auth.uid()));

create table if not exists public.photo_likes (
  photo_id bigint not null references public.photos (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

alter table public.photo_likes enable row level security;

drop policy if exists "Лайки фото видны всем" on public.photo_likes;
create policy "Лайки фото видны всем" on public.photo_likes
  for select to authenticated using (true);

drop policy if exists "Лайк фото ставит сам пользователь" on public.photo_likes;
create policy "Лайк фото ставит сам пользователь" on public.photo_likes
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Лайк фото снимает сам пользователь" on public.photo_likes;
create policy "Лайк фото снимает сам пользователь" on public.photo_likes
  for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.photo_comments (
  id bigint generated always as identity primary key,
  photo_id bigint not null references public.photos (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists photo_comments_photo_idx on public.photo_comments (photo_id, created_at);

alter table public.photo_comments enable row level security;

drop policy if exists "Комментарии к фото видны всем" on public.photo_comments;
create policy "Комментарии к фото видны всем" on public.photo_comments
  for select to authenticated using (true);

drop policy if exists "Комментирует фото сам пользователь" on public.photo_comments;
create policy "Комментирует фото сам пользователь" on public.photo_comments
  for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists "Удаляет автор или владелец фото" on public.photo_comments;
create policy "Удаляет автор или владелец фото" on public.photo_comments
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.photos ph
      where ph.id = photo_id and ph.owner_id = (select auth.uid())
    )
  );

-- =====================================================================
-- Личные сообщения
-- =====================================================================
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

alter table public.messages enable row level security;

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

revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- =====================================================================
-- Хранилище картинок: аватары, обложки, фото, картинки к постам.
-- Каждый пишет только в свою папку <id пользователя>/…, читать может кто угодно
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Загрузка картинок в свою папку" on storage.objects;
create policy "Загрузка картинок в свою папку" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Удаление картинок из своей папки" on storage.objects;
create policy "Удаление картинок из своей папки" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =====================================================================
-- Realtime: сообщения и заявки в друзья приходят сразу
-- =====================================================================
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null;
end $$;

-- =====================================================================
-- Поиск человека по точному адресу почты. Сами адреса никому не видны:
-- функция возвращает профиль только при полном совпадении и только вошедшим
-- =====================================================================
create or replace function public.find_profile_by_email(p_email text)
returns setof public.profiles
language sql stable security definer set search_path = public, auth
as $$
  select p.*
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
    and lower(u.email) = lower(trim(p_email));
$$;

revoke execute on function public.find_profile_by_email(text) from public, anon;
grant execute on function public.find_profile_by_email(text) to authenticated;

-- =====================================================================
-- Вложения в сообщениях: фото, видео и музыка.
-- Файлы лежат в закрытом хранилище chat по пути <отправитель>/<получатель>/…,
-- открыть их могут только участники переписки (по временной ссылке)
-- =====================================================================
alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_type text;
alter table public.messages add column if not exists attachment_name text; -- имя файла: название трека
alter table public.messages alter column text set default '';

alter table public.messages drop constraint if exists messages_text_check;
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check check (
  char_length(text) <= 4000
  and (char_length(text) > 0 or attachment_path is not null)
  and (attachment_path is null) = (attachment_type is null)
  and (attachment_type is null or attachment_type in ('image', 'video', 'audio'))
  and (attachment_name is null or char_length(attachment_name) <= 200)
);

-- Вложение можно прикрепить только из своей папки для этого получателя
drop policy if exists "Писать можно только от своего имени" on public.messages;
create policy "Писать можно только от своего имени" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and recipient_id <> (select auth.uid())
    and (
      attachment_path is null
      or attachment_path like (select auth.uid())::text || '/' || recipient_id::text || '/%'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat', 'chat', false, 52428800,
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/flac'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Вложения: загрузка в свою папку" on storage.objects;
create policy "Вложения: загрузка в свою папку" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Вложения видят только участники переписки" on storage.objects;
create policy "Вложения видят только участники переписки" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat'
    and (select auth.uid())::text in ((storage.foldername(name))[1], (storage.foldername(name))[2])
  );

drop policy if exists "Вложения: удаление своих" on storage.objects;
create policy "Вложения: удаление своих" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat' and (storage.foldername(name))[1] = (select auth.uid())::text);
