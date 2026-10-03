import { useCallback, useEffect, useRef, useState } from "react";
import { defaultPhotos } from "./data";
import { useSnackbar } from "./components/Snackbar";

export const STORAGE_FULL_MESSAGE =
  "В браузере закончилось место — последние изменения пропадут после перезагрузки";

// Закрывает попап по клику снаружи элемента ref и по Esc
export function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, onClose]);
}

const PHOTOS_KEY = "photos";

// Дополняем старые сохранения новыми полями (дата, лайки, комментарии)
const normalizePhoto = (p) => ({ createdAt: null, likes: 0, liked: false, comments: [], ...p });

const readPhotos = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PHOTOS_KEY));
    return Array.isArray(saved) ? saved.map(normalizePhoto) : defaultPhotos;
  } catch {
    return defaultPhotos;
  }
};

// Фотографии профиля, сохраняются в localStorage.
// saved = false — место в хранилище кончилось, новые фото живут до перезагрузки
export function usePhotos() {
  const [photos, setPhotos] = useState(readPhotos);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [photos]);

  const addPhotos = useCallback(
    (sources) =>
      setPhotos((list) => [
        ...sources.map((src) =>
          normalizePhoto({ id: crypto.randomUUID(), src, createdAt: new Date().toISOString() }),
        ),
        ...list,
      ]),
    [],
  );

  const removePhoto = useCallback(
    (id) => setPhotos((list) => list.filter((p) => p.id !== id)),
    [],
  );

  const updatePhoto = useCallback(
    (id, fn) => setPhotos((list) => list.map((p) => (p.id === id ? fn(p) : p))),
    [],
  );

  return { photos, addPhotos, removePhoto, updatePhoto, saved };
}

// useState, который переживает перезагрузку страницы (хранится в localStorage)
export function useStoredState(key, initial) {
  const showSnackbar = useSnackbar();
  const failedRef = useRef(false);
  const [value, setValue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? initial;
    } catch {
      return initial;
    }
  });

  // Не смогли сохранить — предупреждаем один раз, пока запись снова не пройдёт
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      failedRef.current = false;
    } catch {
      if (!failedRef.current) showSnackbar(STORAGE_FULL_MESSAGE, "error");
      failedRef.current = true;
    }
  }, [key, value, showSnackbar]);

  return [value, setValue];
}
