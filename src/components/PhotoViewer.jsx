import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmModal from "./ConfirmModal";
import MeAvatar from "./MeAvatar";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CommentIcon,
  DownloadIcon,
  LikeIcon,
  SendIcon,
  ShareIcon,
  UserIcon,
} from "./Icons";
import { useSnackbar } from "./Snackbar";
import { useProfile } from "../context/ProfileContext";
import { useDismiss } from "../hooks";
import { formatCount, formatDate } from "../utils";

// ---------- «Ещё» под фото ----------
function MoreMenu({ photo, onMakeAvatar }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className="viewer__more" ref={ref}>
      <button className="viewer__link" onClick={() => setOpen((o) => !o)}>
        Ещё <ChevronDownIcon size={16} />
      </button>
      {open && (
        <div className="dropdown viewer__dropdown">
          <button
            className="dropdown__item"
            onClick={() => {
              close();
              onMakeAvatar();
            }}
          >
            <UserIcon /> Сделать фото профиля
          </button>
          <a
            className="dropdown__item"
            href={photo.src}
            download="photo.jpg"
            target="_blank"
            rel="noreferrer"
            onClick={close}
          >
            <DownloadIcon /> Скачать
          </a>
        </div>
      )}
    </div>
  );
}

// ---------- Просмотр фото как в VK: фото слева, автор и комментарии справа ----------
export default function PhotoViewer({
  photos,
  index,
  album = "Фото профиля",
  onIndexChange,
  onClose,
  onDelete,
  onUpdate,
}) {
  const { name, updateProfile } = useProfile();
  const showSnackbar = useSnackbar();
  const [confirming, setConfirming] = useState(false);
  const [comment, setComment] = useState("");
  const commentsRef = useRef(null);
  const count = photos.length;
  const photo = photos[index];

  const go = useCallback(
    (step) => {
      onIndexChange((index + step + count) % count);
      setComment("");
    },
    [index, count, onIndexChange],
  );

  // ← → листают (кроме ввода комментария), Esc закрывает.
  // Пока открыто подтверждение удаления, клавиши обрабатывает оно
  useEffect(() => {
    if (confirming) return;
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
      if (e.target.tagName === "INPUT" || count < 2) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, count, go, onClose]);

  // Блокируем прокрутку страницы под просмотрщиком
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  if (!photo) return null;

  const remove = () => {
    setConfirming(false);
    onDelete(photo.id);
    if (count === 1) onClose();
    else if (index === count - 1) onIndexChange(index - 1);
  };

  const toggleLike = () =>
    onUpdate(photo.id, (p) => ({
      ...p,
      liked: !p.liked,
      likes: p.likes + (p.liked ? -1 : 1),
    }));

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}#profile`);
      showSnackbar("Ссылка скопирована");
    } catch {
      showSnackbar("Не удалось скопировать ссылку");
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const text = comment.trim();
    if (!text) return;
    onUpdate(photo.id, (p) => ({
      ...p,
      comments: [
        ...p.comments,
        { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() },
      ],
    }));
    setComment("");
    // Прокручиваем к новому комментарию
    requestAnimationFrame(() => {
      const el = commentsRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const removeComment = (id) =>
    onUpdate(photo.id, (p) => ({
      ...p,
      comments: p.comments.filter((c) => c.id !== id),
    }));

  return createPortal(
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <button className="viewer__close" onClick={onClose} title="Закрыть">
        <CloseIcon size={28} />
      </button>

      <div className="viewer__box">
        {/* ---------- Фото ---------- */}
        <div className="viewer__stage">
          <div className="viewer__image">
            <img
              src={photo.src}
              alt=""
              onClick={() => count > 1 && go(1)}
              style={{ cursor: count > 1 ? "pointer" : "default" }}
            />
            {count > 1 && (
              <>
                <button className="viewer__nav viewer__nav--prev" onClick={() => go(-1)} title="Предыдущая">
                  <ChevronLeftIcon size={32} />
                </button>
                <button className="viewer__nav viewer__nav--next" onClick={() => go(1)} title="Следующая">
                  <ChevronRightIcon size={32} />
                </button>
              </>
            )}
          </div>

          <div className="viewer__bar">
            <span className="viewer__album">{album}</span>
            <span className="viewer__counter">
              {index + 1} из {count}
            </span>
            <div className="viewer__links">
              <button className="viewer__link" onClick={share}>
                Поделиться
              </button>
              <span className="viewer__dot">·</span>
              <button
                className="viewer__link"
                onClick={() => showSnackbar("Отметки людей пока недоступны")}
              >
                Отметить человека
              </button>
              <span className="viewer__dot">·</span>
              <button className="viewer__link" onClick={() => setConfirming(true)}>
                Удалить
              </button>
              <span className="viewer__dot">·</span>
              <MoreMenu
                photo={photo}
                onMakeAvatar={() => {
                  updateProfile({ avatar: photo.src });
                  showSnackbar("Фотография профиля обновлена");
                }}
              />
            </div>
          </div>
        </div>

        {/* ---------- Автор, лайки, комментарии ---------- */}
        <aside className="viewer__side">
          <header className="viewer__author">
            <MeAvatar size={48} />
            <div>
              <a href="#profile" className="viewer__name" onClick={onClose}>
                {name}
              </a>
              <div className="viewer__date">{formatDate(photo.createdAt)}</div>
            </div>
          </header>

          <div className="viewer__actions">
            <button
              className={`viewer__action ${photo.liked ? "viewer__action--liked" : ""}`}
              onClick={toggleLike}
              title="Нравится"
            >
              <LikeIcon size={28} filled={photo.liked} />
              {photo.likes > 0 && <span>{formatCount(photo.likes)}</span>}
            </button>
            <button className="viewer__action" onClick={share} title="Поделиться">
              <ShareIcon size={28} />
            </button>
          </div>

          <div className="viewer__comments" ref={commentsRef}>
            {photo.comments.length === 0 ? (
              <div className="viewer__empty">
                <CommentIcon size={56} />
                Оставьте первый комментарий к этой фотографии
              </div>
            ) : (
              photo.comments.map((c) => (
                <div key={c.id} className="comment viewer__comment">
                  <MeAvatar size={32} />
                  <div className="comment__body">
                    <span className="comment__name">{name}</span>
                    <div className="comment__text">{c.text}</div>
                    <div className="comment__meta">
                      <span>{formatDate(c.createdAt)}</span>
                      <button className="comment__reply" onClick={() => removeComment(c.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form className="viewer__form" onSubmit={submit}>
            <MeAvatar size={32} />
            <input
              placeholder="Написать комментарий..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {comment.trim() && (
              <button className="icon-btn icon-btn--sm comment-form__send" title="Отправить">
                <SendIcon size={20} />
              </button>
            )}
          </form>
        </aside>
      </div>

      {confirming && (
        <ConfirmModal
          title="Удаление фотографии"
          text="Вы действительно хотите удалить эту фотографию?"
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>,
    document.body,
  );
}
