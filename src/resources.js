// Загрузка данных с сервера для страниц: loading / error / пусто — и действия
// с оптимистичным обновлением (интерфейс меняется сразу, при ошибке — откат)
import { useCallback, useEffect, useState } from "react";
import * as api from "./api";
import { useProfile } from "./context/ProfileContext";
import { useSnackbar } from "./components/Snackbar";
import { readImage } from "./utils";

// Универсальная загрузка: { data, setData, loading, error, reload }
export function useResource(load, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    load()
      .then((data) => !cancelled && setState({ data, loading: false, error: "" }))
      .catch((e) => !cancelled && setState((s) => ({ ...s, loading: false, error: api.explainError(e) })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const setData = useCallback((fn) => setState((s) => ({ ...s, data: fn(s.data) })), []);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, setData, reload };
}

// Профиль любого пользователя (своя страница берёт данные из ProfileContext)
export const useUserProfile = (userId) => useResource(() => api.fetchProfile(userId), [userId]);

// Друзья любого пользователя — для блока «Друзья» на его странице
export const useFriendsOf = (userId) =>
  useResource(async () => {
    if (!userId) return [];
    return (await api.fetchFriendships(userId)).filter((l) => l.status === "friend").map((l) => l.person);
  }, [userId]);

// ---------- Посты: стена, лента, понравившиеся ----------

// source: { wall: userId } | { feed: ownerIds | null } | { liked: true }
export function usePosts(source) {
  const { myId } = useProfile();
  const showSnackbar = useSnackbar();
  const key = JSON.stringify(source);

  const resource = useResource(() => {
    if (source.wall) return api.fetchWall(source.wall, myId);
    if (source.liked) return api.fetchLikedPosts(myId);
    return api.fetchFeed(source.feed, myId);
  }, [key, myId]);
  const { setData, reload } = resource;

  const patchPost = useCallback(
    (id, fn) => setData((list) => list?.map((p) => (p.id === id ? fn(p) : p))),
    [setData],
  );

  const fail = useCallback(
    (e, text) => {
      showSnackbar(`${text}: ${api.explainError(e)}`, "error");
      reload();
    },
    [showSnackbar, reload],
  );

  const actions = {
    publish: async ({ ownerId, text, imageDataUrl }) => {
      try {
        const image = imageDataUrl ? await api.uploadImage(myId, imageDataUrl, "posts") : null;
        const post = await api.createPost({ ownerId, text, imageUrl: image?.url, myId });
        setData((list) => {
          if (!list) return [post];
          const pinned = list.filter((p) => p.pinned);
          return [...pinned, post, ...list.filter((p) => !p.pinned)];
        });
        return true;
      } catch (e) {
        showSnackbar(`Не удалось опубликовать: ${api.explainError(e)}`, "error");
        return false;
      }
    },

    toggleLike: async (post) => {
      const liked = !post.liked;
      patchPost(post.id, (p) => ({ ...p, liked, likes: p.likes + (liked ? 1 : -1) }));
      try {
        await api.setPostLiked(post.id, myId, liked);
      } catch (e) {
        patchPost(post.id, (p) => ({ ...p, liked: !liked, likes: p.likes + (liked ? -1 : 1) }));
        showSnackbar(api.explainError(e), "error");
      }
    },

    comment: async (post, text) => {
      try {
        const comment = await api.addPostComment(post.id, text);
        patchPost(post.id, (p) => ({ ...p, comments: [...p.comments, comment] }));
        return true;
      } catch (e) {
        showSnackbar(`Комментарий не отправлен: ${api.explainError(e)}`, "error");
        return false;
      }
    },

    deleteComment: async (post, comment) => {
      patchPost(post.id, (p) => ({ ...p, comments: p.comments.filter((c) => c.id !== comment.id) }));
      try {
        await api.deletePostComment(comment.id);
      } catch (e) {
        fail(e, "Не удалось удалить комментарий");
      }
    },

    remove: async (post) => {
      setData((list) => list.filter((p) => p.id !== post.id));
      try {
        await api.deletePost(post);
        showSnackbar("Запись удалена");
      } catch (e) {
        fail(e, "Не удалось удалить запись");
      }
    },

    togglePin: async (post) => {
      try {
        await api.setPostPinned(post, !post.pinned);
        reload();
      } catch (e) {
        fail(e, "Не удалось закрепить запись");
      }
    },
  };

  return { ...resource, posts: resource.data ?? [], ...actions };
}

// ---------- Фото пользователя ----------

export function usePhotos(ownerId) {
  const { myId, profile, updateProfile } = useProfile();
  const showSnackbar = useSnackbar();
  const resource = useResource(() => api.fetchPhotos(ownerId, myId), [ownerId, myId]);
  const { setData, reload } = resource;

  const patchPhoto = useCallback(
    (id, fn) => setData((list) => list?.map((p) => (p.id === id ? fn(p) : p))),
    [setData],
  );

  // Загружаем по одному, чтобы битый файл не отменял остальные
  const upload = async (files) => {
    let added = 0;
    let lastError = null;
    for (const file of files) {
      try {
        const dataUrl = await readImage(file, { max: 1600, quality: 0.85 });
        const photo = await api.addPhoto(myId, dataUrl);
        setData((list) => [photo, ...(list ?? [])]);
        added += 1;
      } catch (e) {
        lastError = e;
      }
    }
    return { added, failed: files.length - added, error: lastError && api.explainError(lastError) };
  };

  // Только что загруженное фото (например, новый аватар) — сразу в начало альбома
  const addLocal = (photo) => setData((list) => [photo, ...(list ?? []).filter((p) => p.id !== photo.id)]);

  const remove = async (photo) => {
    setData((list) => list.filter((p) => p.id !== photo.id));
    try {
      await api.deletePhoto(photo);
      // Удалили фото, которое стоит на аватаре, — файла больше нет, убираем и аватар
      if (photo.ownerId === myId && profile.avatar === photo.src) await updateProfile({ avatar: null });
      showSnackbar("Фотография удалена");
    } catch (e) {
      showSnackbar(`Не удалось удалить: ${api.explainError(e)}`, "error");
      reload();
    }
  };

  const toggleLike = async (photo) => {
    const liked = !photo.liked;
    patchPhoto(photo.id, (p) => ({ ...p, liked, likes: p.likes + (liked ? 1 : -1) }));
    try {
      await api.setPhotoLiked(photo.id, myId, liked);
    } catch (e) {
      patchPhoto(photo.id, (p) => ({ ...p, liked: !liked, likes: p.likes + (liked ? -1 : 1) }));
      showSnackbar(api.explainError(e), "error");
    }
  };

  const comment = async (photo, text) => {
    try {
      const c = await api.addPhotoComment(photo.id, text);
      patchPhoto(photo.id, (p) => ({ ...p, comments: [...p.comments, c] }));
      return true;
    } catch (e) {
      showSnackbar(`Комментарий не отправлен: ${api.explainError(e)}`, "error");
      return false;
    }
  };

  const deleteComment = async (photo, c) => {
    patchPhoto(photo.id, (p) => ({ ...p, comments: p.comments.filter((x) => x.id !== c.id) }));
    try {
      await api.deletePhotoComment(c.id);
    } catch (e) {
      showSnackbar(api.explainError(e), "error");
      reload();
    }
  };

  return { ...resource, photos: resource.data ?? [], upload, addLocal, remove, toggleLike, comment, deleteComment };
}
