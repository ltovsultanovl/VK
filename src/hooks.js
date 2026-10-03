import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

// Выпадающее меню: ref вешается на обёртку (кнопка + меню),
// клик снаружи и Esc закрывают его
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  useDismiss(ref, open, close);
  return { open, ref, close, toggle };
}

// Блокирует прокрутку страницы, пока компонент на экране (модалки, просмотр фото)
export function useScrollLock() {
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
}

// Скрытый <input type="file">: open() открывает диалог выбора,
// input нужно отрендерить где угодно. onPick получает массив файлов
export function useFilePicker({ accept, multiple = false, onPick }) {
  const ref = useRef(null);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  const input = createElement("input", {
    ref,
    type: "file",
    accept,
    multiple,
    hidden: true,
    onChange: (e) => {
      const files = [...e.target.files];
      e.target.value = ""; // чтобы тот же файл можно было выбрать ещё раз
      if (files.length) onPickRef.current(files);
    },
  });

  const open = useCallback(() => ref.current?.click(), []);
  return { open, input };
}

// Перетаскивание файлов на элемент: [dragging, props] — props вешаются на элемент.
// relatedTarget-проверка убирает мигание подсветки над дочерними элементами
export function useFileDrop(onDrop) {
  const [dragging, setDragging] = useState(false);

  const props = {
    onDragOver: (e) => {
      if (![...e.dataTransfer.types].includes("Files")) return;
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      onDrop([...e.dataTransfer.files]);
    },
  };

  return [dragging, props];
}

// useState, который переживает перезагрузку страницы (хранится в localStorage).
// revive(saved) — привести старое сохранение к текущему формату данных
export function useStoredState(key, initial, { revive } = {}) {
  const showSnackbar = useSnackbar();
  const failedRef = useRef(false);
  const [value, setValue] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved == null) return initial;
      return revive ? revive(saved) : saved;
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

// ---------- Фото профиля ----------

// Дополняем старые сохранения новыми полями (дата, лайки, комментарии)
const normalizePhoto = (p) => ({ createdAt: null, likes: 0, liked: false, comments: [], ...p });
const revivePhotos = (saved) => (Array.isArray(saved) ? saved.map(normalizePhoto) : defaultPhotos);

export function usePhotos() {
  const [photos, setPhotos] = useStoredState("photos", defaultPhotos, { revive: revivePhotos });

  const addPhotos = useCallback(
    (sources) =>
      setPhotos((list) => [
        ...sources.map((src) =>
          normalizePhoto({ id: crypto.randomUUID(), src, createdAt: new Date().toISOString() }),
        ),
        ...list,
      ]),
    [setPhotos],
  );

  const removePhoto = useCallback(
    (id) => setPhotos((list) => list.filter((p) => p.id !== id)),
    [setPhotos],
  );

  const updatePhoto = useCallback(
    (id, fn) => setPhotos((list) => list.map((p) => (p.id === id ? fn(p) : p))),
    [setPhotos],
  );

  return { photos, addPhotos, removePhoto, updatePhoto };
}
