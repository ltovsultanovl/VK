import { useRef, useState } from "react";
import Avatar from "./Avatar";
import MeAvatar from "./MeAvatar";
import {
  BookmarkIcon,
  CommentIcon,
  EyeIcon,
  FlagIcon,
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
import { formatCount, plural } from "../utils";

const TEXT_LIMIT = 300;
const COMMENTS_PREVIEW = 2;

// Автор «мой» (post.mine / comment.mine) берётся из актуального профиля,
// чтобы смена имени и аватара сразу отражалась в старых записях
const useAuthor = (item, fallback) => {
  const { profile, name } = useProfile();
  return item.mine ? { name, color: profile.color, src: profile.avatar } : fallback;
};

// ---------- Меню «⋯» ----------
function PostMenu({ post, onPin, onDelete }) {
  const showSnackbar = useSnackbar();
  const { open, ref, close, toggle } = useDropdown();

  const act = (fn) => () => {
    close();
    fn();
  };

  return (
    <div className="post__menu" ref={ref}>
      <button className="icon-btn" title="Действия" onClick={toggle}>
        <MoreIcon size={20} />
      </button>

      {open && (
        <div className="dropdown dropdown--right">
          <button
            className="dropdown__item"
            onClick={act(() => showSnackbar("Запись сохранена в закладках"))}
          >
            <BookmarkIcon /> Сохранить в закладках
          </button>
          {post.mine && onPin && (
            <button className="dropdown__item" onClick={act(() => onPin(post.id))}>
              <PinIcon /> {post.pinned ? "Открепить" : "Закрепить"}
            </button>
          )}
          {post.mine && onDelete ? (
            <button
              className="dropdown__item dropdown__item--danger"
              onClick={act(() => {
                onDelete(post.id);
                showSnackbar("Запись удалена");
              })}
            >
              <TrashIcon /> Удалить запись
            </button>
          ) : (
            <button
              className="dropdown__item"
              onClick={act(() => showSnackbar("Жалоба отправлена"))}
            >
              <FlagIcon /> Пожаловаться
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Комментарий ----------
function Comment({ comment, onReply }) {
  const author = useAuthor(comment, comment.author);
  const [liked, setLiked] = useState(false);
  const likes = comment.likes + (liked ? 1 : 0);

  return (
    <div className="comment">
      <Avatar name={author.name} color={author.color} src={author.src} size={32} />
      <div className="comment__body">
        <span className="comment__name">{author.name}</span>
        <div className="comment__text">{comment.text}</div>
        <div className="comment__meta">
          <span>сегодня в {comment.time}</span>
          {!comment.mine && (
            <button className="comment__reply" onClick={() => onReply(author.name)}>
              Ответить
            </button>
          )}
        </div>
      </div>
      <button
        className={`comment__like ${liked ? "comment__like--on" : ""}`}
        onClick={() => setLiked((l) => !l)}
        title="Нравится"
      >
        <LikeIcon size={16} filled={liked} />
        {likes > 0 && <span>{likes}</span>}
      </button>
    </div>
  );
}

// ---------- Пост ----------
export default function Post({ post, onLike, onShare, onComment, onPin, onDelete }) {
  const author = useAuthor(post, { name: post.author, color: post.color });
  const [commentsOpen, setCommentsOpen] = useState(post.comments.length > 0);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const inputRef = useRef(null);

  const isLong = post.text && post.text.length > TEXT_LIMIT;
  const text = isLong && !expanded ? post.text.slice(0, TEXT_LIMIT).trimEnd() : post.text;

  const hidden = showAll ? 0 : Math.max(post.comments.length - COMMENTS_PREVIEW, 0);
  const visibleComments = post.comments.slice(hidden);

  const focusInput = () => requestAnimationFrame(() => inputRef.current?.focus());

  const toggleComments = () => {
    setCommentsOpen((o) => !o);
    if (!commentsOpen) focusInput();
  };

  const reply = (name) => {
    setComment(`${name.split(" ")[0]}, `);
    focusInput();
  };

  const submit = (e) => {
    e.preventDefault();
    const value = comment.trim();
    if (!value) return;
    onComment(post.id, value);
    setComment("");
    setShowAll(true);
  };

  return (
    <article className="card post">
      <header className="post__head">
        <Avatar name={author.name} color={author.color} src={author.src} size={40} />
        <div className="post__head-text">
          <span className="post__author">{author.name}</span>
          <div className="post__time">
            {post.pinned && (
              <span className="post__pinned">
                <PinIcon size={12} /> запись закреплена ·{" "}
              </span>
            )}
            {post.time}
          </div>
        </div>
        <PostMenu post={post} onPin={onPin} onDelete={onDelete} />
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

      {post.image && <div className="post__media" style={{ background: post.image }} />}

      <footer className="post__actions">
        <button
          className={`pill ${post.liked ? "pill--liked" : ""}`}
          onClick={() => onLike(post.id)}
          title="Нравится"
        >
          <LikeIcon filled={post.liked} />
          {post.likes > 0 && <span>{formatCount(post.likes)}</span>}
        </button>
        <button className="pill" onClick={toggleComments} title="Комментировать">
          <CommentIcon />
          {post.comments.length > 0 && <span>{post.comments.length}</span>}
        </button>
        <button className="pill" onClick={() => onShare(post.id)} title="Поделиться">
          <ShareIcon />
          {post.reposts > 0 && <span>{formatCount(post.reposts)}</span>}
        </button>
        {post.views && (
          <span className="post__views" title="Просмотры">
            <EyeIcon size={16} />
            {post.views}
          </span>
        )}
      </footer>

      {commentsOpen && (
        <div className="comments">
          {hidden > 0 && (
            <button className="comments__more" onClick={() => setShowAll(true)}>
              Показать ещё {hidden} {plural(hidden, ["комментарий", "комментария", "комментариев"])}
            </button>
          )}
          {visibleComments.map((c) => (
            <Comment key={c.id} comment={c} onReply={reply} />
          ))}
          <form className="comment-form" onSubmit={submit}>
            <MeAvatar size={32} />
            <div className="comment-form__field">
              <input
                ref={inputRef}
                placeholder="Написать комментарий..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                className="icon-btn icon-btn--sm comment-form__send"
                disabled={!comment.trim()}
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
