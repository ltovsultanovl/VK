import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmModal from "./ConfirmModal";
import EmojiPicker from "./EmojiPicker";
import ShareModal from "./ShareModal";
import Avatar from "./Avatar";
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
import { useDropdown, useScrollLock } from "../hooks";
import { formatCount, formatDate } from "../utils";

// ---------- «Ещё» под фото ----------
function MoreMenu({ photo, onMakeAvatar }) {
  const { open, ref, close, toggle } = useDropdown();

  return (
    <div className="viewer__more" ref={ref}>
      <button className="viewer__link" onClick={toggle}>
        Ещё <ChevronDownIcon size={16} />
      </button>
      {open && (
        <div className="dropdown viewer__dropdown">
          {onMakeAvatar && (
            <button
              className="dropdown__item"
              onClick={() => {
                close();
                onMakeAvatar();
              }}
            >
              <UserIcon /> Сделать фото профиля
            </button>
          )}
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
// owner — владелец фото; удалять фото и ставить на аватар может только он сам.
// Действия — из usePhotos: onDelete, onToggleLike, onComment, onDeleteComment
export default function PhotoViewer({
  photos,
  index,
  owner,
  album,
  onIndexChange,
  onClose,
  onDelete,
  onToggleLike,
  onComment,
  onDeleteComment,
}) {
  const { myId, updateProfile } = useProfile();
  const showSnackbar = useSnackbar();
  const [confirming, setConfirming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [failedSrc, setFailedSrc] = useState(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const isMine = owner.id === myId;
  const commentsRef = useRef(null);
  const commentInputRef = useRef(null);
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
    if (confirming || sharing) return;
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
      if (e.target.tagName === "INPUT" || count < 2) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, sharing, count, go, onClose]);

  useScrollLock();

  if (!photo) return null;

  const remove = () => {
    setConfirming(false);
    onDelete(photo);
    if (count === 1) onClose();
    else if (index === count - 1) onIndexChange(index - 1);
  };

  const share = () => setSharing(true);

  const submit = async (e) => {
    e.preventDefault();
    const text = comment.trim();
    if (!text || sending) return;
    setSending(true);
    const ok = await onComment(photo, text);
    setSending(false);
    if (!ok) return;
    setComment("");
    // Прокручиваем к новому комментарию
    requestAnimationFrame(() => {
      const el = commentsRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

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
            {photo.src === failedSrc ? (
              <div className="viewer__broken">Не удалось загрузить фотографию</div>
            ) : (
              <img
                src={photo.src}
                alt=""
                onClick={() => count > 1 && go(1)}
                onError={() => setFailedSrc(photo.src)}
                style={{ cursor: count > 1 ? "pointer" : "default" }}
              />
            )}
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
            <span className="viewer__album">{album ?? `Фотографии · ${owner.name}`}</span>
            <span className="viewer__counter">
              {index + 1} из {count}
            </span>
            <div className="viewer__links">
              <button className="viewer__link" onClick={share}>
                Поделиться
              </button>
              {isMine && !photo.readOnly && (
                <>
                  <span className="viewer__dot">·</span>
                  <button className="viewer__link" onClick={() => setConfirming(true)}>
                    Удалить
                  </button>
                </>
              )}
              <span className="viewer__dot">·</span>
              <MoreMenu
                photo={photo}
                onMakeAvatar={
                  isMine &&
                  !photo.readOnly &&
                  (async () => {
                    if (await updateProfile({ avatar: photo.src })) {
                      showSnackbar("Фотография профиля обновлена");
                    }
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* ---------- Автор, лайки, комментарии ---------- */}
        <aside className="viewer__side">
          <header className="viewer__author">
            <Avatar name={owner.name} color={owner.color} src={owner.avatar} size={48} />
            <div>
              <a href={`#user/${owner.id}`} className="viewer__name" onClick={onClose}>
                {owner.name}
              </a>
              <div className="viewer__date">{formatDate(photo.createdAt)}</div>
            </div>
          </header>

          {photo.readOnly ? (
            <div className="viewer__comments">
              <div className="viewer__empty">
                Это фото загружено на аватар раньше, чем появились лайки и комментарии. Обновите
                фотографию профиля — и её можно будет оценить и обсудить.
              </div>
            </div>
          ) : (
            <>
            <div className="viewer__actions">
              <button
                className={`viewer__action ${photo.liked ? "viewer__action--liked" : ""}`}
                onClick={() => onToggleLike(photo)}
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
                    <Avatar name={c.author.name} color={c.author.color} src={c.author.avatar} size={32} />
                    <div className="comment__body">
                      <a href={`#user/${c.author.id}`} className="comment__name" onClick={onClose}>
                        {c.author.name}
                      </a>
                      <div className="comment__text">{c.text}</div>
                      <div className="comment__meta">
                        <span>{formatDate(c.createdAt)}</span>
                        {(isMine || c.author.id === myId) && (
                          <button className="comment__reply" onClick={() => onDeleteComment(photo, c)}>
                            Удалить
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form className="viewer__form" onSubmit={submit}>
              <MeAvatar size={32} />
              <input
                ref={commentInputRef}
                placeholder="Написать комментарий..."
                maxLength={2000}
                disabled={sending}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <EmojiPicker inputRef={commentInputRef} value={comment} onChange={setComment} size={20} />
              {comment.trim() && (
                <button className="icon-btn icon-btn--sm comment-form__send" title="Отправить">
                  <SendIcon size={20} />
                </button>
              )}
            </form>
            </>
          )}
        </aside>
      </div>

      {sharing && (
        <ShareModal
          // Старый аватар без записи в «Фото» — делимся страницей владельца
          shared={photo.readOnly ? { type: "profile", id: owner.id } : { type: "photo", id: photo.id }}
          link={`#user/${owner.id}`}
          onClose={() => setSharing(false)}
        />
      )}

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
