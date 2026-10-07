import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Avatar from "../components/Avatar";
import { useSnackbar } from "../components/Snackbar";
import { useDropdown, useFileDrop, useFilePicker, useScrollLock } from "../hooks";
import { MAX_FILE_MB, attachmentKind } from "../api";
import {
  AttachIcon,
  CamcorderIcon,
  CloseIcon,
  MusicIcon,
  PhotoIcon,
  MicIcon,
  MoreIcon,
  PhoneIcon,
  SearchIcon,
  SendIcon,
  SmileIcon,
  WriteIcon,
} from "../components/Icons";

const folders = ["Все", "Непрочитанные", "Личные"];

// Отметка у исходящего сообщения: часики → ✓ доставлено → ✓✓ прочитано
const STATE_MARKS = { pending: "🕓", sent: "✓", read: "✓✓" };

// Фото на весь экран по клику; закрывается кликом или Esc
function Lightbox({ url, onClose }) {
  useScrollLock();
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <img src={url} alt="" />
      <button className="viewer__close" title="Закрыть">
        <CloseIcon size={28} />
      </button>
    </div>,
    document.body,
  );
}

// Музыка в сообщении: иконка, название трека и плеер
function AudioAttachment({ attachment, pending }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="msg__audio">
      <span className="msg__audio-icon">
        {pending ? <div className="chat-status__spinner" /> : <MusicIcon size={20} />}
      </span>
      <span className="msg__audio-body">
        <span className="msg__audio-name">{attachment.name || "Аудиозапись"}</span>
        {failed ? (
          <span className="msg__audio-error">Не удалось загрузить</span>
        ) : (
          attachment.url && <audio src={attachment.url} controls preload="none" onError={() => setFailed(true)} />
        )}
      </span>
    </div>
  );
}

// Фото, видео или музыка в сообщении; пока нет ссылки — заглушка с крутилкой
function Attachment({ attachment, pending, onOpen }) {
  const { type, url } = attachment;
  if (type === "audio") return <AudioAttachment attachment={attachment} pending={pending} />;
  // Нет сети или ссылка устарела — показываем понятную заглушку вместо пустого пузыря
  const [failedUrl, setFailedUrl] = useState(null);
  const failed = url && url === failedUrl;

  return (
    <div className={`msg__media ${pending ? "msg__media--pending" : ""}`}>
      {!url || failed ? (
        <div className="msg__media-placeholder">
          {failed ? (
            <span className="msg__media-error">
              {type === "video" ? "🎬 Видео" : "📷 Фото"} не удалось загрузить
            </span>
          ) : (
            <div className="chat-status__spinner" />
          )}
        </div>
      ) : type === "video" ? (
        <video src={url} controls preload="metadata" playsInline onError={() => setFailedUrl(url)} />
      ) : (
        <img src={url} alt="" onClick={() => onOpen(url)} loading="lazy" onError={() => setFailedUrl(url)} />
      )}
      {pending && url && (
        <div className="msg__media-overlay">
          <div className="chat-status__spinner" />
        </div>
      )}
    </div>
  );
}

// Окно мессенджера.
// dialog: { id, person: { name, color, avatar?, online }, unread, time, typing?,
//           messages: [{ id, out, text, summary?, attachment?: { type, url, name? }, time, day?,
//                        state?: pending|sent|read|failed }] }
// onSend(dialogId, text, file?) — file: фото, видео или музыка
export default function Messenger({
  dialogs,
  activeId,
  onOpen,
  onSend,
  onTyping,
  onRetry,
  emptyText = "Здесь пока нет чатов",
}) {
  const [text, setText] = useState("");
  const [folder, setFolder] = useState(folders[0]);
  const [query, setQuery] = useState("");
  const [attachment, setAttachment] = useState(null); // { file, url, type } — выбранный, ещё не отправленный
  const [zoomUrl, setZoomUrl] = useState(null);
  const showSnackbar = useSnackbar();
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const active = dialogs.find((d) => d.id === activeId) ?? dialogs[0] ?? null;

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, active?.id, active?.typing]);

  const visible = dialogs.filter(
    (d) =>
      (folder !== "Непрочитанные" || d.unread > 0) &&
      d.person.name.toLowerCase().includes(query.toLowerCase()),
  );

  // Выбрали файл (кнопкой, перетаскиванием или вставкой) — проверяем и показываем превью
  const choose = (file) => {
    if (!file) return;
    const type = attachmentKind(file);
    if (!type) {
      showSnackbar("Можно отправить только фото, видео или музыку", "error");
      return;
    }
    if (type !== "image" && file.size > MAX_FILE_MB * 1024 * 1024) {
      showSnackbar(`Файл больше ${MAX_FILE_MB} МБ — выберите поменьше`, "error");
      return;
    }
    setAttachment((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file), type };
    });
    inputRef.current?.focus();
  };

  const clearAttachment = () =>
    setAttachment((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });

  // Меню скрепки как в VK: Фото / Видео / Музыка — у каждого пункта свой выбор файла
  const attachMenu = useDropdown();
  const photoPicker = useFilePicker({ accept: "image/*", onPick: ([file]) => choose(file) });
  const videoPicker = useFilePicker({ accept: "video/*", onPick: ([file]) => choose(file) });
  const musicPicker = useFilePicker({ accept: "audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac", onPick: ([file]) => choose(file) });
  const ATTACH_ITEMS = [
    { label: "Фото", Icon: PhotoIcon, picker: photoPicker },
    { label: "Видео", Icon: CamcorderIcon, picker: videoPicker },
    { label: "Музыка", Icon: MusicIcon, picker: musicPicker },
  ];
  const [dragging, dropProps] = useFileDrop(([file]) => choose(file));

  // Освобождаем превью, когда окно закрывается
  useEffect(() => () => attachment && URL.revokeObjectURL(attachment.url), [attachment]);

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if ((!value && !attachment) || !active) return;
    onSend(active.id, value, attachment?.file ?? null);
    setText("");
    setAttachment(null); // превью освободит эффект выше; у отправленного сообщения своя ссылка
  };

  const canSend = text.trim() || attachment;

  return (
    <div className="card messenger">
      {/* ---------- Список чатов ---------- */}
      <div className="im-list">
        <div className="im-list__head">
          <label className="search">
            <SearchIcon size={16} />
            <input
              type="search"
              placeholder="Поиск"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button className="icon-btn" title="Новый чат">
            <WriteIcon size={22} />
          </button>
        </div>

        <div className="im-folders">
          {folders.map((f) => (
            <button
              key={f}
              className={`seg ${folder === f ? "active" : ""}`}
              onClick={() => setFolder(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="im-list__items">
          {visible.map((d) => {
            const last = d.messages.at(-1);
            return (
              <button
                key={d.id}
                type="button"
                className={`dialog ${d.id === active?.id ? "active" : ""}`}
                onClick={() => onOpen(d.id)}
              >
                <Avatar
                  name={d.person.name}
                  color={d.person.color}
                  src={d.person.avatar}
                  size={48}
                  online={d.person.online}
                />
                <span className="dialog__body">
                  <span className="dialog__top">
                    <span className="dialog__name">{d.person.name}</span>
                    <span className="dialog__time">{d.time}</span>
                  </span>
                  <span className="dialog__bottom">
                    <span className={`dialog__last ${d.typing ? "dialog__last--typing" : ""}`}>
                      {d.typing ? (
                        "печатает…"
                      ) : last ? (
                        <>
                          {last.out && <b>Вы: </b>}
                          {last.summary ?? last.text}
                        </>
                      ) : (
                        "Нет сообщений"
                      )}
                    </span>
                    {d.unread > 0 && <span className="dialog__unread">{d.unread}</span>}
                  </span>
                </span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <div className="empty">{dialogs.length ? "Ничего не найдено" : emptyText}</div>
          )}
        </div>
      </div>

      {/* ---------- Окно чата ---------- */}
      {active ? (
        <div className={`chat ${dragging ? "chat--drag" : ""}`} {...dropProps}>
          <div className="chat__head">
            <Avatar
              name={active.person.name}
              color={active.person.color}
              src={active.person.avatar}
              size={36}
              online={active.person.online}
            />
            <div className="chat__title">
              <div className="chat__name">{active.person.name}</div>
              <div
                className={`chat__status ${active.person.online || active.typing ? "chat__status--online" : ""}`}
              >
                {active.typing ? "печатает…" : active.person.online ? "в сети" : "был(а) недавно"}
              </div>
            </div>
            <button className="icon-btn" title="Поиск по чату">
              <SearchIcon size={22} />
            </button>
            <button className="icon-btn" title="Позвонить">
              <PhoneIcon size={22} />
            </button>
            <button className="icon-btn" title="Ещё">
              <MoreIcon size={22} />
            </button>
          </div>

          <div className="chat__body" ref={bodyRef}>
            {active.messages.length > 0 ? (
              active.messages.map((m, i) => {
                const day = m.day ?? "Сегодня";
                const showDay = i === 0 || day !== (active.messages[i - 1].day ?? "Сегодня");
                return (
                  <div key={m.id} className="chat__item">
                    {showDay && <div className="chat__day">{day}</div>}
                    <div
                      className={`msg ${m.out ? "msg--out" : ""} ${m.state === "failed" ? "msg--failed" : ""} ${m.attachment ? "msg--with-media" : ""}`}
                    >
                      {m.attachment && (
                        <Attachment
                          attachment={m.attachment}
                          pending={m.state === "pending"}
                          onOpen={setZoomUrl}
                        />
                      )}
                      {m.text && <span className="msg__text">{m.text}</span>}
                      <span className="msg__time">
                        {m.time}
                        {m.out && STATE_MARKS[m.state] && (
                          <span className={`msg__state msg__state--${m.state}`}>
                            {STATE_MARKS[m.state]}
                          </span>
                        )}
                      </span>
                    </div>
                    {m.state === "failed" && (
                      <button className="msg__retry" onClick={() => onRetry?.(m)}>
                        Не отправлено. Повторить
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="chat__empty">Здесь будет история переписки</div>
            )}
            {active.typing && <div className="msg msg--typing">печатает…</div>}
          </div>

          {dragging && <div className="chat__drop">Отпустите, чтобы прикрепить фото, видео или музыку</div>}

          {attachment && (
            <div className="chat__attachment">
              {attachment.type === "video" ? (
                <video src={attachment.url} muted />
              ) : attachment.type === "audio" ? (
                <span className="chat__attachment-audio">
                  <MusicIcon size={24} />
                </span>
              ) : (
                <img src={attachment.url} alt="" />
              )}
              <span className="chat__attachment-name">{attachment.file.name}</span>
              <button className="icon-btn icon-btn--sm" onClick={clearAttachment} title="Убрать вложение">
                <CloseIcon size={18} />
              </button>
            </div>
          )}

          <form className="chat__composer" onSubmit={submit}>
            <div className="attach-menu" ref={attachMenu.ref}>
              <button
                type="button"
                className={`icon-btn chat__send ${attachMenu.open ? "attach-menu__trigger--open" : ""}`}
                title="Прикрепить"
                aria-haspopup="menu"
                aria-expanded={attachMenu.open}
                style={{ color: "var(--icon-secondary)" }}
                onClick={attachMenu.toggle}
              >
                <AttachIcon size={24} />
              </button>
              {attachMenu.open && (
                <div className="attach-menu__list" role="menu">
                  {ATTACH_ITEMS.map(({ label, Icon, picker }) => (
                    <button
                      key={label}
                      type="button"
                      role="menuitem"
                      className="attach-menu__item"
                      onClick={() => {
                        attachMenu.close();
                        picker.open();
                      }}
                    >
                      <Icon size={26} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {photoPicker.input}
              {videoPicker.input}
              {musicPicker.input}
            </div>
            <div className="chat__field">
              <input
                ref={inputRef}
                placeholder={attachment ? "Добавьте подпись…" : "Сообщение"}
                autoComplete="off"
                maxLength={4000}
                value={text}
                onPaste={(e) => {
                  const file = [...e.clipboardData.files].find((f) => attachmentKind(f));
                  if (file) {
                    e.preventDefault();
                    choose(file);
                  }
                }}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target.value) onTyping?.(active.id);
                }}
              />
              <button type="button" className="icon-btn" title="Эмодзи">
                <SmileIcon size={22} />
              </button>
            </div>
            {canSend ? (
              <button className="icon-btn chat__send" title="Отправить">
                <SendIcon size={26} />
              </button>
            ) : (
              <button
                type="button"
                className="icon-btn chat__send"
                title="Голосовое сообщение"
                style={{ color: "var(--icon-secondary)" }}
              >
                <MicIcon size={24} />
              </button>
            )}
          </form>
        </div>
      ) : (
        <div className="chat chat--empty">
          <div className="chat__empty">Выберите чат слева</div>
        </div>
      )}

      {zoomUrl && <Lightbox url={zoomUrl} onClose={() => setZoomUrl(null)} />}
    </div>
  );
}
