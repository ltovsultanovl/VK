// Все запросы к Supabase в одном месте: компоненты работают с привычными
// объектами (profile, person, post, photo), а не с колонками базы
import { supabase } from "./lib/supabase";
import { emptyProfileInfo } from "./data";
import { readImage } from "./utils";

// ---------- Ошибки ----------

// Понятный текст для частых ошибок Supabase
export const explainError = (error) => {
  const text = error?.message ?? String(error);
  if (/fetch|network|Load failed/i.test(text)) return "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз";
  if (/email rate limit/i.test(text)) return "Лимит писем исчерпан: бесплатная почта Supabase отправляет лишь пару писем в час. Попробуйте позже";
  const wait = text.match(/after (\d+) seconds?/i);
  if (wait) return `Подождите ${wait[1]} с и попробуйте снова`;
  if (/rate limit|too many/i.test(text)) return "Слишком много попыток. Подождите немного и попробуйте снова";
  if (/invalid login credentials/i.test(text)) return "Неверная почта или пароль";
  if (/already registered|already been registered|user_already_exists/i.test(text)) return "Эта почта уже зарегистрирована — войдите или восстановите пароль";
  if (/email not confirmed/i.test(text)) return "Почта не подтверждена. Откройте ссылку из письма, которое пришло при регистрации";
  if (/password.*(at least|characters)|weak.?password/i.test(text)) return "Пароль слишком простой: минимум 6 символов";
  if (/same.*password|different from the old/i.test(text)) return "Новый пароль должен отличаться от старого";
  if (/expired|invalid.*(token|otp)|token.*invalid/i.test(text)) return "Код неверный или устарел. Запросите новый";
  if (/find_profile_by_email/i.test(text)) return "Поиск по почте ещё не включён: выполните обновлённый supabase/schema.sql в SQL Editor";
  if (/row-level security|permission denied/i.test(text)) return "Нет прав на это действие";
  if (
    /Bucket not found|Could not find the function|column .* does not exist|in the schema cache/i.test(text) ||
    ["42703", "PGRST202", "PGRST204"].includes(error?.code)
  ) {
    return "База Supabase не обновлена: откройте SQL Editor, вставьте supabase/schema.sql целиком и нажмите Run";
  }
  if (/exceeded the maximum allowed size|too large/i.test(text)) return "Файл слишком большой";
  if (/mime type/i.test(text)) return "Такой формат не поддерживается. Можно: фото JPG, PNG, GIF, WEBP, видео MP4, MOV, WEBM и музыку MP3, M4A, OGG, WAV, FLAC";
  return text;
};

const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// ---------- Вход по ссылке / коду из письма ----------

export const sendLoginEmail = (email) =>
  supabase.auth
    .signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } })
    .then(unwrap);

export const verifyLoginCode = (email, token) =>
  supabase.auth.verifyOtp({ email, token, type: "email" }).then(unwrap);

export const signOut = () => supabase.auth.signOut().then(unwrap);

// ---------- Вход по паролю ----------

const redirectTo = () => location.origin + location.pathname;

// Если в Supabase включено «Confirm email», сессии сразу не будет — нужно подтвердить почту
export const signUpWithPassword = async (email, password) => {
  const data = unwrap(await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } }));
  // Supabase не сообщает, что почта занята (защита от перебора): у такого «пользователя» нет identities
  if (data.user && !data.session && data.user.identities?.length === 0) {
    throw new Error("User already registered");
  }
  return { needsConfirmation: !data.session };
};

export const signInWithPassword = (email, password) =>
  supabase.auth.signInWithPassword({ email, password }).then(unwrap);

export const sendPasswordReset = (email) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() }).then(unwrap);

export const setNewPassword = (password) => supabase.auth.updateUser({ password }).then(unwrap);

// ---------- Профили ----------

const PERSON_FIELDS = "id, first_name, last_name, color, avatar_url, info";
const PROFILE_FIELDS = "id, first_name, last_name, color, status, avatar_url, cover_url, info, created_at";
const INFO_KEYS = Object.keys(emptyProfileInfo);

// Краткие данные о человеке — для аватаров, списков, постов
const toPerson = (row) =>
  row && {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`.trim(),
    color: row.color,
    avatar: row.avatar_url,
    city: row.info?.contacts?.city ?? "",
  };

// Полный профиль — для страницы пользователя и редактирования
const fromProfileRow = (row) => {
  if (!row) return null;
  const info = row.info ?? {};
  return {
    ...emptyProfileInfo,
    ...info,
    contacts: { ...emptyProfileInfo.contacts, ...info.contacts },
    interests: { ...emptyProfileInfo.interests, ...info.interests },
    education: { ...emptyProfileInfo.education, ...info.education },
    career: { ...emptyProfileInfo.career, ...info.career },
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    color: row.color,
    status: row.status ?? "",
    avatar: row.avatar_url,
    cover: row.cover_url,
    createdAt: row.created_at,
  };
};

const toProfileRow = (p) => ({
  first_name: p.firstName,
  last_name: p.lastName,
  color: p.color,
  status: p.status,
  avatar_url: p.avatar,
  cover_url: p.cover,
  info: Object.fromEntries(INFO_KEYS.map((k) => [k, p[k]])),
  updated_at: new Date().toISOString(),
});

export const fetchProfile = async (id) =>
  fromProfileRow(
    unwrap(await supabase.from("profiles").select(PROFILE_FIELDS).eq("id", id).maybeSingle()),
  );

export const createProfile = async (id, { firstName, lastName, color }) =>
  fromProfileRow(
    unwrap(
      await supabase
        .from("profiles")
        .insert({ id, first_name: firstName, last_name: lastName, color })
        .select(PROFILE_FIELDS)
        .single(),
    ),
  );

export const saveProfile = async (profile) =>
  unwrap(await supabase.from("profiles").update(toProfileRow(profile)).eq("id", profile.id));

export const fetchPeople = async (ids) => {
  if (!ids.length) return [];
  return unwrap(await supabase.from("profiles").select(PERSON_FIELDS).in("id", ids)).map(toPerson);
};

// Поиск: по точной почте (если в запросе есть @), иначе по имени и фамилии;
// пустой запрос — недавно зарегистрированные
export const searchPeople = async (query) => {
  if (query.includes("@")) {
    const rows = unwrap(await supabase.rpc("find_profile_by_email", { p_email: query.trim() }));
    return rows.map(toPerson);
  }
  let request = supabase.from("profiles").select(PERSON_FIELDS).order("created_at", { ascending: false }).limit(50);
  const words = query.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[%_,()]/g, ""));
  for (const word of words) {
    request = request.or(`first_name.ilike.%${word}%,last_name.ilike.%${word}%`);
  }
  return unwrap(await request).map(toPerson);
};

// ---------- Картинки в Storage ----------

const BUCKET = "media";

// dataURL (после сжатия в readImage) → файл в папке пользователя → публичная ссылка
export const uploadImage = async (userId, dataUrl, folder) => {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${userId}/${folder}/${crypto.randomUUID()}.jpg`;
  unwrap(
    await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      cacheControl: "31536000",
    }),
  );
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
};

// Путь файла по его публичной ссылке (для удаления старого аватара/обложки)
const pathFromUrl = (url) => url?.split(`/object/public/${BUCKET}/`)[1] ?? null;

// Удаление файла — «по возможности»: если не вышло, остаётся только лишний файл в хранилище
export const removeImage = async (pathOrUrl) => {
  const path = pathOrUrl?.startsWith("http") ? pathFromUrl(pathOrUrl) : pathOrUrl;
  if (path) await supabase.storage.from(BUCKET).remove([path]);
};

// ---------- Друзья ----------

const FRIENDSHIP_FIELDS = `requester_id, addressee_id, status, created_at,
  requester:profiles!friendships_requester_id_fkey(${PERSON_FIELDS}),
  addressee:profiles!friendships_addressee_id_fkey(${PERSON_FIELDS})`;

// Все связи пользователя: друзья, входящие и исходящие заявки
export const fetchFriendships = async (userId) =>
  unwrap(
    await supabase
      .from("friendships")
      .select(FRIENDSHIP_FIELDS)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
  ).map((row) => {
    const outgoing = row.requester_id === userId;
    return {
      person: toPerson(outgoing ? row.addressee : row.requester),
      status: row.status === "accepted" ? "friend" : outgoing ? "outgoing" : "incoming",
      createdAt: row.created_at,
    };
  });

export const sendFriendRequest = async (userId) =>
  unwrap(await supabase.from("friendships").insert({ addressee_id: userId }));

export const acceptFriendRequest = async (myId, userId) =>
  unwrap(
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("requester_id", userId)
      .eq("addressee_id", myId),
  );

// Отклонить, отменить заявку или удалить из друзей — одна операция
export const removeFriendship = async (myId, userId) =>
  unwrap(
    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(requester_id.eq.${myId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${myId})`,
      ),
  );

// ---------- Посты ----------

const POST_FIELDS = `id, text, image_url, pinned, created_at, owner_id,
  author:profiles!posts_author_id_fkey(${PERSON_FIELDS}),
  owner:profiles!posts_owner_id_fkey(${PERSON_FIELDS}),
  likes:post_likes(user_id),
  comments:post_comments(id, text, created_at, author:profiles!post_comments_author_id_fkey(${PERSON_FIELDS}))`;

const byCreated = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);

const toComment = (c) => ({ id: c.id, text: c.text, createdAt: c.created_at, author: toPerson(c.author) });

const toPost = (row, myId) => ({
  id: row.id,
  text: row.text,
  image: row.image_url,
  pinned: row.pinned,
  createdAt: row.created_at,
  ownerId: row.owner_id,
  author: toPerson(row.author),
  owner: toPerson(row.owner),
  likes: row.likes.length,
  liked: row.likes.some((l) => l.user_id === myId),
  comments: row.comments.map(toComment).sort(byCreated),
});

const POSTS_LIMIT = 50;

// Стена пользователя: закреплённая запись первой
export const fetchWall = async (ownerId, myId) =>
  unwrap(
    await supabase
      .from("posts")
      .select(POST_FIELDS)
      .eq("owner_id", ownerId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(POSTS_LIMIT),
  ).map((row) => toPost(row, myId));

// Лента: записи на стенах ownerIds (друзья и я); null — записи всех пользователей
export const fetchFeed = async (ownerIds, myId) => {
  let request = supabase.from("posts").select(POST_FIELDS).order("created_at", { ascending: false }).limit(POSTS_LIMIT);
  if (ownerIds) request = request.in("owner_id", ownerIds);
  return unwrap(await request).map((row) => toPost(row, myId));
};

export const fetchLikedPosts = async (myId) => {
  const liked = unwrap(
    await supabase.from("post_likes").select("post_id").eq("user_id", myId).order("created_at", { ascending: false }).limit(POSTS_LIMIT),
  );
  if (!liked.length) return [];
  const order = liked.map((l) => l.post_id);
  const rows = unwrap(await supabase.from("posts").select(POST_FIELDS).in("id", order));
  return rows.map((row) => toPost(row, myId)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
};

export const createPost = async ({ ownerId, text, imageUrl, myId }) =>
  toPost(
    unwrap(
      await supabase
        .from("posts")
        .insert({ owner_id: ownerId, text, image_url: imageUrl ?? null })
        .select(POST_FIELDS)
        .single(),
    ),
    myId,
  );

export const deletePost = async (post) => {
  unwrap(await supabase.from("posts").delete().eq("id", post.id));
  if (post.image) await removeImage(post.image);
};

// Закреплённой может быть только одна запись на стене
export const setPostPinned = async (post, pinned) => {
  if (pinned) {
    unwrap(await supabase.from("posts").update({ pinned: false }).eq("owner_id", post.ownerId).eq("pinned", true));
  }
  unwrap(await supabase.from("posts").update({ pinned }).eq("id", post.id));
};

export const setPostLiked = async (postId, myId, liked) =>
  liked
    ? unwrap(await supabase.from("post_likes").insert({ post_id: postId }))
    : unwrap(await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", myId));

export const addPostComment = async (postId, text) =>
  toComment(
    unwrap(
      await supabase
        .from("post_comments")
        .insert({ post_id: postId, text })
        .select(`id, text, created_at, author:profiles!post_comments_author_id_fkey(${PERSON_FIELDS})`)
        .single(),
    ),
  );

export const deletePostComment = async (commentId) =>
  unwrap(await supabase.from("post_comments").delete().eq("id", commentId));

// ---------- Фото ----------

const PHOTO_FIELDS = `id, url, path, created_at, owner_id,
  likes:photo_likes(user_id),
  comments:photo_comments(id, text, created_at, author:profiles!photo_comments_author_id_fkey(${PERSON_FIELDS}))`;

const toPhoto = (row, myId) => ({
  id: row.id,
  src: row.url,
  path: row.path,
  ownerId: row.owner_id,
  createdAt: row.created_at,
  likes: row.likes.length,
  liked: row.likes.some((l) => l.user_id === myId),
  comments: row.comments.map(toComment).sort(byCreated),
});

export const fetchPhotos = async (ownerId, myId) =>
  unwrap(
    await supabase.from("photos").select(PHOTO_FIELDS).eq("owner_id", ownerId).order("created_at", { ascending: false }),
  ).map((row) => toPhoto(row, myId));

export const addPhoto = async (myId, dataUrl) => {
  const { path, url } = await uploadImage(myId, dataUrl, "photos");
  try {
    return toPhoto(unwrap(await supabase.from("photos").insert({ path, url }).select(PHOTO_FIELDS).single()), myId);
  } catch (e) {
    await removeImage(path); // запись не создалась — файл не нужен
    throw e;
  }
};

export const deletePhoto = async (photo) => {
  unwrap(await supabase.from("photos").delete().eq("id", photo.id));
  await removeImage(photo.path);
};

export const setPhotoLiked = async (photoId, myId, liked) =>
  liked
    ? unwrap(await supabase.from("photo_likes").insert({ photo_id: photoId }))
    : unwrap(await supabase.from("photo_likes").delete().eq("photo_id", photoId).eq("user_id", myId));

export const addPhotoComment = async (photoId, text) =>
  toComment(
    unwrap(
      await supabase
        .from("photo_comments")
        .insert({ photo_id: photoId, text })
        .select(`id, text, created_at, author:profiles!photo_comments_author_id_fkey(${PERSON_FIELDS})`)
        .single(),
    ),
  );

export const deletePhotoComment = async (commentId) =>
  unwrap(await supabase.from("photo_comments").delete().eq("id", commentId));

// ---------- Вложения в сообщениях (закрытое хранилище chat) ----------

const CHAT_BUCKET = "chat";
export const MAX_VIDEO_MB = 50;
export const MAX_FILE_MB = MAX_VIDEO_MB; // общий лимит хранилища chat — и для видео, и для музыки

// Тип вложения по файлу: image | video | audio | null (не поддерживается)
export const attachmentKind = (file) =>
  file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/") || /\.(mp3|m4a|aac|ogg|oga|wav|flac)$/i.test(file.name)
        ? "audio"
        : null;

// Название трека из имени файла: «Кино - Группа крови.mp3» → «Кино - Группа крови»
export const trackTitle = (fileName) => fileName.replace(/\.[^.]+$/, "").slice(0, 200);
const LINK_TTL = 60 * 60 * 24; // временная ссылка на файл живёт сутки

// Фото сжимаем (кроме GIF — иначе пропадёт анимация), видео и музыку загружаем как есть.
// Путь <я>/<собеседник>/… — по нему правила хранилища пускают только нас двоих
// kind: "voice" — голосовое с микрофона (тип у файла audio/*, но показываем иначе, чем музыку)
export const uploadChatFile = async (myId, peerId, file, { kind: forcedKind } = {}) => {
  let blob = file;
  let ext;
  let type;
  let name = null;
  const kind = forcedKind ?? attachmentKind(file);
  if (kind === "voice") {
    ext = { "audio/mp4": "m4a", "audio/ogg": "ogg" }[file.type] ?? "webm";
    type = "voice";
  } else if (kind === "audio") {
    if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Файл больше ${MAX_FILE_MB} МБ`);
    ext = (file.name.split(".").pop() || "mp3").toLowerCase();
    type = "audio";
    name = trackTitle(file.name);
  } else if (file.type === "image/gif") {
    ext = "gif";
    type = "image";
  } else if (file.type.startsWith("image/")) {
    blob = await (await fetch(await readImage(file, { max: 1600, quality: 0.85 }))).blob();
    ext = "jpg";
    type = "image";
  } else if (file.type.startsWith("video/")) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`Видео больше ${MAX_VIDEO_MB} МБ — выберите покороче`);
    ext = (file.name.split(".").pop() || "mp4").toLowerCase();
    type = "video";
  } else {
    throw new Error("Можно отправить только фото, видео или музыку");
  }

  const path = `${myId}/${peerId}/${crypto.randomUUID()}.${ext}`;
  unwrap(
    await supabase.storage.from(CHAT_BUCKET).upload(path, blob, {
      // без параметров вроде ";codecs=opus" — хранилище сверяет только сам тип
      contentType: (blob.type || file.type || (type === "audio" ? "audio/mpeg" : "")).split(";")[0] || undefined,
      cacheControl: "31536000",
    }),
  );
  return { path, type, name };
};

// Временные ссылки на вложения: { путь: ссылка }
export const getChatFileUrls = async (paths) => {
  if (!paths.length) return {};
  const data = unwrap(await supabase.storage.from(CHAT_BUCKET).createSignedUrls(paths, LINK_TTL));
  return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
};

export const removeChatFile = (path) => supabase.storage.from(CHAT_BUCKET).remove([path]);

// ---------- «Поделиться»: одна запись, одно фото — для карточки в чате ----------

export const fetchPost = async (id, myId) => {
  // id приходит из сообщения строкой — у записей и фото он числовой
  const row = unwrap(await supabase.from("posts").select(POST_FIELDS).eq("id", Number(id)).maybeSingle());
  return row && toPost(row, myId);
};

export const fetchPhoto = async (id) => {
  const row = unwrap(
    await supabase
      .from("photos")
      .select(`id, url, created_at, owner:profiles!photos_owner_id_fkey(${PERSON_FIELDS})`)
      .eq("id", Number(id))
      .maybeSingle(),
  );
  return row && { id: row.id, src: row.url, createdAt: row.created_at, owner: toPerson(row.owner) };
};

// ---------- Удаление сообщений ----------

// «У себя» — скрыть только для меня (у собеседника сообщение останется)
export const deleteMessageForMe = async (id) => unwrap(await supabase.rpc("delete_message_for_me", { p_id: id }));

// «У всех» — удалить совсем; файл вложения тоже удаляем
export const deleteMessageForAll = async (id) => {
  const path = unwrap(await supabase.rpc("delete_message_for_all", { p_id: id }));
  if (path) await removeChatFile(path).catch(() => {});
};
