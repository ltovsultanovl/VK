import { useRef, useState } from "react";
import Avatar from "./Avatar";
import MeAvatar from "./MeAvatar";
import ConfirmModal from "./ConfirmModal";
import {
  CommentIcon,
  LikeIcon,
  MoreIcon,
  PinIcon,
  SendIcon,
  ShareIcon,
  TrashIcon,
} from "./Icons";
import { useSnackbar } from "./Snackbar";
import { useProfile } from "../context/ProfileContext";
import { useDropdown } from "../hooks";
import { formatCount, formatDate, plural } from "../utils";

const TEXT_LIMIT = 300;
const COMMENTS_PREVIEW = 2;

const PersonLink = ({ person, className }) => (
  <a href={`#user/${person.id}`} className={className}>
    {person.name}
  </a>
);

// ---------- Меню «⋯»: закрепить (владелец стены), удалить (автор или владелец) ----------
function PostMenu({ post, canPin, canDelete, onTogglePin, onDelete }) {
  const menu = useDropdown();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="post__menu" ref={menu.ref}>
      <button className="icon-btn" title="Действия" onClick={menu.toggle}>
        <MoreIcon size={20} />
      </button>

      {menu.open && (
        <div className="dropdown dropdown--right">
          {canPin && (
            <button
              className="dropdown__item"
              onClick={() => {
                menu.close();
                onTogglePin(post);
              }}
            >
              <PinIcon /> {post.pinned ? "Открепить" : "Закрепить"}
            </button>
          )}
          {canDelete && (
            <button
              className="dropdown__item dropdown__item--danger"
              onClick={() => {
                menu.close();
                setConfirming(true);
              }}
            >
              <TrashIcon /> Удалить запись
            </button>
          )}
        </div>
      )}

      {confirming && (
        <ConfirmModal
          title="Удаление записи"
          text="Вы действительно хотите удалить эту запись?"
          onConfirm={() => {
            setConfirming(false);
            onDelete(post);
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

// ---------- Комментарий ----------
function Comment({ comment, canDelete, onReply, onDelete }) {
  const { myId } = useProfile();
  const mine = comment.author.id === myId;

  return (
    <div className="comment">
      <a href={`#user/${comment.author.id}`}>
        <Avatar name={comment.author.name} color={comment.author.color} src={comment.author.avatar} size={32} />
      </a>
      <div className="comment__body">
        <PersonLink person={comment.author} className="comment__name" />
        <div className="comment__text">{comment.text}</div>
        <div className="comment__meta">
          <span>{formatDate(comment.createdAt)}</span>
          {!mine && (
            <button className="comment__reply" onClick={() => onReply(comment.author.firstName)}>
              Ответить
            </button>
          )}
          {canDelete && (
            <button className="comment__reply" onClick={() => onDelete(comment)}>
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Пост ----------
// Действия приходят из usePosts: onLike, onComment, onDeleteComment, onDelete, onTogglePin
export default function Post({ post, onLike, onComment, onDeleteComment, onDelete, onTogglePin }) {
  const { myId } = useProfile();
  const showSnackbar = useSnackbar();
  const [commentsOpen, setCommentsOpen] = useState(post.comments.length > 0);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const inputRef = useRef(null);

  const { author, owner } = post;
  const onOtherWall = owner && owner.id !== author.id;
  const wallOwner = post.ownerId === myId;
  const canDelete = author.id === myId || wallOwner;

  const isLong = post.text.length > TEXT_LIMIT;
  const text = isLong && !expanded ? post.text.slice(0, TEXT_LIMIT).trimEnd() : post.text;

  const hidden = showAll ? 0 : Math.max(post.comments.length - COMMENTS_PREVIEW, 0);
  const visibleComments = post.comments.slice(hidden);

  const focusInput = () => requestAnimationFrame(() => inputRef.current?.focus());

  const toggleComments = () => {
    setCommentsOpen((o) => !o);
    if (!commentsOpen) focusInput();
  };

  const reply = (firstName) => {
    setComment(`${firstName}, `);
    focusInput();
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}#user/${post.ownerId}`);
      showSnackbar("Ссылка на стену скопирована");
    } catch {
      showSnackbar("Не удалось скопировать ссылку", "error");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const value = comment.trim();
    if (!value || sending) return;
    setSending(true);
    if (await onComment(post, value)) {
      setComment("");
      setShowAll(true);
    }
    setSending(false);
  };

  return (
    <article className="card post">
      <header className="post__head">
        <a href={`#user/${author.id}`}>
          <Avatar name={author.name} color={author.color} src={author.avatar} size={40} />
        </a>
        <div className="post__head-text">
          <PersonLink person={author} className="post__author" />
          {onOtherWall && (
            <>
              <span className="post__arrow"> ▸ </span>
              <PersonLink person={owner} className="post__author" />
            </>
          )}
          <div className="post__time">
            {post.pinned && (
              <span className="post__pinned">
                <PinIcon size={12} /> запись закреплена ·{" "}
              </span>
            )}
            {formatDate(post.createdAt)}
          </div>
        </div>
        {(canDelete || wallOwner) && (
          <PostMenu
            post={post}
            canPin={wallOwner}
            canDelete={canDelete}
            onTogglePin={onTogglePin}
            onDelete={onDelete}
          />
        )}
      </header>

      {post.text && (
        <div className="post__text">
          {text}
          {isLong && !expanded && (
            <>
              {"… "}
              <button className="post__text-more" onClick={() => setExpanded(true)}>
                Показать ещё
              </button>
            </>
          )}
        </div>
      )}

      {post.image && !imageFailed && (
        <img
          className="post__image"
          src={post.image}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      )}

      <footer className="post__actions">
        <button
          className={`pill ${post.liked ? "pill--liked" : ""}`}
          onClick={() => onLike(post)}
          title="Нравится"
        >
          <LikeIcon filled={post.liked} />
          {post.likes > 0 && <span>{formatCount(post.likes)}</span>}
        </button>
        <button className="pill" onClick={toggleComments} title="Комментировать">
          <CommentIcon />
          {post.comments.length > 0 && <span>{post.comments.length}</span>}
        </button>
        <button className="pill" onClick={share} title="Поделиться">
          <ShareIcon />
        </button>
      </footer>

      {commentsOpen && (
        <div className="comments">
          {hidden > 0 && (
            <button className="comments__more" onClick={() => setShowAll(true)}>
              Показать ещё {hidden} {plural(hidden, ["комментарий", "комментария", "комментариев"])}
            </button>
          )}
          {visibleComments.map((c) => (
            <Comment
              key={c.id}
              comment={c}
              canDelete={c.author.id === myId || wallOwner}
              onReply={reply}
              onDelete={(target) => onDeleteComment(post, target)}
            />
          ))}
          <form className="comment-form" onSubmit={submit}>
            <MeAvatar size={32} />
            <div className="comment-form__field">
              <input
                ref={inputRef}
                placeholder="Написать комментарий..."
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                className="icon-btn icon-btn--sm comment-form__send"
                disabled={!comment.trim() || sending}
                title="Отправить"
              >
                <SendIcon size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
