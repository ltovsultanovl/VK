import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import type { AttachmentType, ChatPeer, Shared, VoiceMeta } from "../types";
import { createPortal } from "react-dom";
import Avatar from "../components/Avatar";
import EmojiPicker from "../components/EmojiPicker";
import SharedCard from "../components/SharedCard";
import Modal from "../components/Modal";
import { useSnackbar } from "../components/Snackbar";
import {
  useDropdown,
  useFileDrop,
  useFilePicker,
  useScrollLock,
  useVoiceRecorder,
  voiceRecordingSupported,
} from "../hooks";
import { MAX_FILE_MB, attachmentKind } from "../api";
import {
  AttachIcon,
  ChevronLeftIcon,
  CamcorderIcon,
  CloseIcon,
  CopyIcon,
  MusicIcon,
  PauseIcon,
  PhotoIcon,
  PlayIcon,
  TrashIcon,
  MicIcon,
  MoreIcon,
  SearchIcon,
  SendIcon,
  WriteIcon,
} from "../components/Icons";

const folders = ["Все", "Непрочитанные", "Личные"];

// ---------- Данные для окна мессенджера (уже в виде для показа) ----------
export type MessageState = "pending" | "sent" | "read" | "failed";

export interface ChatAttachment {
  type: AttachmentType;
  name?: string | null;
  meta?: VoiceMeta | null;
  url: string | null;
}

// R — исходное сообщение (строка из базы): возвращается в onRetry / onDelete
export interface ViewMessage<R = unknown> {
  id: number | string;
  out: boolean;
  text: string;
  summary?: string;
  attachment?: ChatAttachment | null;
  shared?: Shared | null;
  time: string;
  day: string;
  state?: MessageState;
  deletable?: boolean;
  canDeleteForAll?: boolean;
  raw: R;
}

export interface ViewDialog<R = unknown> {
  id: string;
  person: ChatPeer;
  textOnly?: boolean;
  unread: number;
  typing?: boolean;
  time: string;
  messages: ViewMessage<R>[];
}

// Статус своего сообщения как в VK: часики → ✓ отправлено → ✓✓ прочитано (синие), ! — ошибка
const STATUS_LABELS: Record<MessageState, string> = {
  pending: "Отправляется",
  sent: "Отправлено",
  read: "Прочитано",
  failed: "Не отправлено",
};

export function MessageStatus({ state }: { state?: MessageState }) {
  if (!state || !STATUS_LABELS[state]) return null;
  return (
    <span
      className={`msg-status msg-status--${state}`}
      title={STATUS_LABELS[state]}
      aria-label={STATUS_LABELS[state]}
    >
      {state === "pending" ? (
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <circle
            cx="8"
            cy="8"
            r="6.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M8 4.8V8l2.2 1.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : state === "failed" ? (
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="M8 4.5v4.2M8 11.2v.3"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 20 14" width="18" height="13" aria-hidden="true">
          {state === "read" ? (
            <>
              <path d="M1.5 7.5 5 11l7-7.5" />
              <path d="M8.6 10.2 9.4 11l7-7.5" />
            </>
          ) : (
            <path d="M4.5 7.5 8 11l7-7.5" />
          )}
        </svg>
      )}
    </span>
  );
}

// Страница собеседника: человека или сообщества
const personHref = (person: ChatPeer) =>
  person.isCommunity ? `#club/${person.communityId}` : `#user/${person.id}`;

// ---------- Действия с сообщением: «⋯» при наведении → Копировать / Удалить ----------
function MessageActions({ message, onDeleteClick }: { message: ViewMessage; onDeleteClick: (() => void) | null }) {
  const showSnackbar = useSnackbar();
  const menu = useDropdown();
  const [up, setUp] = useState(true);

  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    // У нижних сообщений меню открываем вверх, у верхних — вниз, чтобы не обрезалось
    setUp(e.currentTarget.getBoundingClientRect().top > 220);
    menu.toggle();
  };

  const copy = async () => {
    menu.close();
    try {
      await navigator.clipboard.writeText(message.text);
      showSnackbar("Текст скопирован");
    } catch {
      showSnackbar("Не удалось скопировать", "error");
    }
  };

  return (
    <div
      className={`msg-actions ${menu.open ? "msg-actions--open" : ""}`}
      ref={menu.ref}
    >
      <button
        type="button"
        className="msg-actions__btn"
        title="Действия"
        aria-label="Действия с сообщением"
        onClick={toggle}
      >
        <MoreIcon size={18} />
      </button>
      {menu.open && (
        <div
          className={`dropdown msg-actions__menu ${up ? "msg-actions__menu--up" : ""} ${message.out ? "" : "msg-actions__menu--left"}`}
        >
          {message.text && (
            <button className="dropdown__item" onClick={copy}>
              <CopyIcon /> Копировать текст
            </button>
          )}
          {onDeleteClick && (
            <button
              className="dropdown__item dropdown__item--danger"
              onClick={() => {
                menu.close();
                onDeleteClick();
              }}
            >
              <TrashIcon /> Удалить
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// «Удалить сообщение?» с галочкой «Удалить для всех», как в VK
function DeleteMessageModal({
  canDeleteForAll,
  onConfirm,
  onClose,
}: {
  canDeleteForAll?: boolean;
  onConfirm: (forAll: boolean) => void;
  onClose: () => void;
}) {
  const [forAll, setForAll] = useState(false);
  return (
    <Modal
      title="Удалить сообщение?"
      onClose={onClose}
      width={420}
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn btn--danger"
            onClick={() => onConfirm(forAll)}
            autoFocus
          >
            Удалить
          </button>
        </>
      }
    >
      <p className="modal__text">
        {forAll
          ? "Сообщение удалится у вас и у собеседника."
          : "Сообщение удалится только у вас — у собеседника оно останется."}
      </p>
      {canDeleteForAll && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={forAll}
            onChange={(e) => setForAll(e.target.checked)}
          />
          <span className="checkbox__box" aria-hidden="true" />
          Удалить для всех
        </label>
      )}
    </Modal>
  );
}

// Фото на весь экран по клику; закрывается кликом или Esc
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useScrollLock();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
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

const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Голосовое сообщение как в VK: кнопка ▶, волна с прогрессом (клик — перемотка) и время
function VoicePlayer({ url, meta, pending }: { url: string | null; meta?: VoiceMeta | null; pending?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [failed, setFailed] = useState(false);
  const duration = meta?.duration || 0;
  const bars: number[] = meta?.waveform?.length ? meta.waveform : Array(48).fill(20);
  const progress = duration ? Math.min(time / duration, 1) : 0;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setFailed(true));
    else audio.pause();
  };

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const next = ((e.clientX - rect.left) / rect.width) * duration;
    audio.currentTime = next;
    setTime(next);
  };

  return (
    <div className="voice">
      <button
        type="button"
        className="voice__play"
        onClick={toggle}
        disabled={!url || pending || failed}
        aria-label={playing ? "Пауза" : "Слушать"}
      >
        {pending ? (
          <div className="chat-status__spinner" />
        ) : playing ? (
          <PauseIcon size={16} />
        ) : (
          <PlayIcon size={16} />
        )}
      </button>
      <div className="voice__body">
        <div className="voice__wave" onClick={seek}>
          {bars.map((h, i) => (
            <span
              key={i}
              className={i / bars.length < progress ? "voice__bar--played" : ""}
              style={{ height: `${Math.max(12, h)}%` }}
            />
          ))}
        </div>
        <span className="voice__time">
          {failed
            ? "Не удалось загрузить"
            : formatDuration(playing || time ? time : duration)}
        </span>
      </div>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setTime(0);
          }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

// Музыка в сообщении: иконка, название трека и плеер
function AudioAttachment({ attachment, pending }: { attachment: ChatAttachment; pending?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="msg__audio">
      <span className="msg__audio-icon">
        {pending ? (
          <div className="chat-status__spinner" />
        ) : (
          <MusicIcon size={20} />
        )}
      </span>
      <span className="msg__audio-body">
        <span className="msg__audio-name">
          {attachment.name || "Аудиозапись"}
        </span>
        {failed ? (
          <span className="msg__audio-error">Не удалось загрузить</span>
        ) : (
          attachment.url && (
            <audio
              src={attachment.url}
              controls
              preload="none"
              onError={() => setFailed(true)}
            />
          )
        )}
      </span>
    </div>
  );
}

// Фото, видео или музыка в сообщении; пока нет ссылки — заглушка с крутилкой
function Attachment({
  attachment,
  pending,
  onOpen,
}: {
  attachment: ChatAttachment;
  pending?: boolean;
  onOpen: (url: string) => void;
}) {
  const { type, url } = attachment;
  // Нет сети или ссылка устарела — показываем понятную заглушку вместо пустого пузыря.
  // Хук — до любых return: порядок хуков не должен зависеть от типа вложения
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (type === "audio")
    return <AudioAttachment attachment={attachment} pending={pending} />;
  if (type === "voice")
    return <VoicePlayer url={url} meta={attachment.meta} pending={pending} />;
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
        <video
          src={url}
          controls
          preload="metadata"
          playsInline
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <img
          src={url}
          alt=""
          onClick={() => onOpen(url)}
          loading="lazy"
          onError={() => setFailedUrl(url)}
        />
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
// onSend(dialogId, text, file?, voice?) — file: фото, видео или музыка; voice: { duration, waveform }
export default function Messenger<R>({
  dialogs,
  activeId,
  onOpen,
  onSend,
  onTyping,
  onRetry,
  onDelete,
  emptyText = "Здесь пока нет чатов",
  startInChat = false,
}: {
  dialogs: ViewDialog<R>[];
  activeId: string | undefined;
  onOpen: (id: string) => void;
  onSend: (id: string, text: string, file?: File | null, voice?: VoiceMeta | null) => void;
  onTyping?: (id: string) => void;
  onRetry?: (message: ViewMessage<R>) => void;
  onDelete?: (message: ViewMessage<R>, forAll: boolean) => void;
  emptyText?: string;
  // На телефоне видно что-то одно: список чатов или открытый чат. true — сразу чат
  // (пришли по «Написать сообщение» со страницы человека)
  startInChat?: boolean;
}) {
  const [chatOpen, setChatOpen] = useState(startInChat);
  const [toDelete, setToDelete] = useState<ViewMessage<R> | null>(null); // сообщение, для которого открыто «Удалить?»
  const [text, setText] = useState("");
  const [folder, setFolder] = useState(folders[0]);
  const [query, setQuery] = useState("");
  // Выбранное, ещё не отправленное вложение
  const [attachment, setAttachment] = useState<{ file: File; url: string; type: AttachmentType } | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const showSnackbar = useSnackbar();
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
  const choose = (file: File | undefined) => {
    if (!file) return;
    if (active?.textOnly) {
      showSnackbar("Сообществу можно отправить только текст", "info");
      return;
    }
    const type = attachmentKind(file);
    if (!type) {
      showSnackbar("Можно отправить только фото, видео или музыку", "error");
      return;
    }
    if (type !== "image" && file.size > MAX_FILE_MB * 1024 * 1024) {
      showSnackbar(
        `Файл больше ${MAX_FILE_MB} МБ — выберите поменьше`,
        "error",
      );
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
  const photoPicker = useFilePicker({
    accept: "image/*",
    onPick: ([file]) => choose(file),
  });
  const videoPicker = useFilePicker({
    accept: "video/*",
    onPick: ([file]) => choose(file),
  });
  const musicPicker = useFilePicker({
    accept: "audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac",
    onPick: ([file]) => choose(file),
  });
  const ATTACH_ITEMS = [
    { label: "Фото", Icon: PhotoIcon, picker: photoPicker },
    { label: "Видео", Icon: CamcorderIcon, picker: videoPicker },
    { label: "Музыка", Icon: MusicIcon, picker: musicPicker },
  ];
  const [dragging, dropProps] = useFileDrop(([file]) => choose(file));

  // ---------- Голосовое: 🎤 → запись → 🗑 или «отправить» ----------
  const finishVoiceRef = useRef<(() => Promise<void>) | null>(null);
  const recorder = useVoiceRecorder({
    maxSeconds: 300,
    onLimit: () => finishVoiceRef.current?.(),
  });

  const startVoice = async () => {
    if (!voiceRecordingSupported()) {
      showSnackbar("Этот браузер не умеет записывать звук", "error");
      return;
    }
    try {
      await recorder.start();
    } catch (err) {
      const e = err as DOMException;
      showSnackbar(
        e.name === "NotAllowedError"
          ? "Нет доступа к микрофону. Разрешите его в настройках браузера (значок слева от адреса сайта)"
          : e.name === "NotFoundError"
            ? "Микрофон не найден — подключите его и попробуйте снова"
            : `Не удалось включить микрофон: ${e.message}`,
        "error",
      );
    }
  };

  const finishVoice = async () => {
    const result = await recorder.stop();
    if (!result || !active) return;
    if (result.duration < 0.7 || !result.blob.size) {
      showSnackbar(
        "Слишком короткое сообщение — удерживайте запись подольше",
        "info",
      );
      return;
    }
    const ext =
      { "audio/mp4": "m4a", "audio/ogg": "ogg" }[result.blob.type] ?? "webm";
    const file = new File([result.blob], `voice.${ext}`, {
      type: result.blob.type,
    });
    onSend(active.id, "", file, {
      duration: result.duration,
      waveform: result.waveform,
    });
  };
  finishVoiceRef.current = finishVoice;

  // Переключились на другой чат посреди записи — запись выбрасываем
  const { cancel: cancelVoice } = recorder;
  useEffect(() => cancelVoice, [active?.id, cancelVoice]);

  // Освобождаем превью, когда окно закрывается
  useEffect(
    () => () => {
      if (attachment) URL.revokeObjectURL(attachment.url);
    },
    [attachment],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if ((!value && !attachment) || !active) return;
    onSend(active.id, value, attachment?.file ?? null);
    setText("");
    setAttachment(null); // превью освободит эффект выше; у отправленного сообщения своя ссылка
  };

  const canSend = text.trim() || attachment;

  return (
    <div className={`card messenger ${chatOpen ? "messenger--chat" : ""}`}>
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
                onClick={() => {
                  onOpen(d.id);
                  setChatOpen(true);
                }}
              >
                <Avatar
                  name={d.person.name}
                  color={d.person.color}
                  src={d.person.avatar}
                  empty={!d.person.isCommunity}
                  size={48}
                  online={d.person.online}
                />
                <span className="dialog__body">
                  <span className="dialog__top">
                    <span className="dialog__name">{d.person.name}</span>
                    <span className="dialog__time">{d.time}</span>
                  </span>
                  <span className="dialog__bottom">
                    <span
                      className={`dialog__last ${d.typing ? "dialog__last--typing" : ""}`}
                    >
                      {d.typing ? (
                        "печатает…"
                      ) : last ? (
                        <>
                          {last.out && (
                            <>
                              <MessageStatus state={last.state} />
                              <b>Вы: </b>
                            </>
                          )}
                          {last.summary ?? last.text}
                        </>
                      ) : (
                        "Нет сообщений"
                      )}
                    </span>
                    {d.unread > 0 && (
                      <span className="dialog__unread">{d.unread}</span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <div className="empty">
              {dialogs.length ? "Ничего не найдено" : emptyText}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Окно чата ---------- */}
      {active ? (
        <div className={`chat ${dragging ? "chat--drag" : ""}`} {...dropProps}>
          <div className="chat__head">
            <button type="button" className="icon-btn chat__back" title="Назад к чатам" onClick={() => setChatOpen(false)}>
              <ChevronLeftIcon size={24} />
            </button>
            {/* Аватар и имя ведут на страницу собеседника, как в VK */}
            <a
              href={personHref(active.person)}
              className="chat__person"
              title="Открыть страницу"
            >
              <Avatar
                name={active.person.name}
                color={active.person.color}
                src={active.person.avatar}
                empty={!active.person.isCommunity}
                size={36}
                online={active.person.online}
              />
            </a>
            <div className="chat__title">
              <a
                href={personHref(active.person)}
                className="chat__name chat__name--link"
              >
                {active.person.name}
              </a>
              <div
                className={`chat__status ${active.person.online || active.typing ? "chat__status--online" : ""}`}
              >
                {active.person.isCommunity
                  ? "Сообщество"
                  : active.typing
                    ? "печатает…"
                    : active.person.online
                      ? "в сети"
                      : "был(а) недавно"}
              </div>
            </div>
            <button className="icon-btn" title="Поиск по чату">
              <SearchIcon size={22} />
            </button>
            <button className="icon-btn" title="Ещё">
              <MoreIcon size={22} />
            </button>
          </div>

          <div className="chat__body" ref={bodyRef}>
            {active.messages.length > 0 ? (
              active.messages.map((m, i) => {
                const day = m.day ?? "Сегодня";
                const showDay =
                  i === 0 || day !== (active.messages[i - 1].day ?? "Сегодня");
                return (
                  <div key={m.id} className="chat__item">
                    {showDay && <div className="chat__day">{day}</div>}
                    <div className={`msg-line ${m.out ? "msg-line--out" : ""}`}>
                      <div
                        className={`msg ${m.out ? "msg--out" : ""} ${m.state === "failed" ? "msg--failed" : ""} ${m.attachment || m.shared ? "msg--with-media" : ""}`}
                      >
                        {m.attachment && (
                          <Attachment
                            attachment={m.attachment}
                            pending={m.state === "pending"}
                            onOpen={setZoomUrl}
                          />
                        )}
                        {m.text && <span className="msg__text">{m.text}</span>}
                        {m.shared && <SharedCard shared={m.shared} />}
                        <span className="msg__time">
                          {m.time}
                          {m.out && <MessageStatus state={m.state} />}
                        </span>
                      </div>
                      {m.state !== "pending" &&
                        (m.text || (onDelete && m.deletable !== false)) && (
                          <MessageActions
                            message={m}
                            onDeleteClick={
                              onDelete && m.deletable !== false
                                ? () => setToDelete(m)
                                : null
                            }
                          />
                        )}
                    </div>
                    {m.state === "failed" && (
                      <button
                        className="msg__retry"
                        onClick={() => onRetry?.(m)}
                      >
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

          {dragging && (
            <div className="chat__drop">
              Отпустите, чтобы прикрепить фото, видео или музыку
            </div>
          )}

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
              <span className="chat__attachment-name">
                {attachment.file.name}
              </span>
              <button
                className="icon-btn icon-btn--sm"
                onClick={clearAttachment}
                title="Убрать вложение"
              >
                <CloseIcon size={18} />
              </button>
            </div>
          )}

          {recorder.recording ? (
            <form
              className="chat__composer chat__composer--recording"
              onSubmit={(e) => {
                e.preventDefault();
                finishVoice();
              }}
            >
              <button
                type="button"
                className="icon-btn chat__send"
                title="Отменить запись"
                style={{ color: "var(--like)" }}
                onClick={recorder.cancel}
              >
                <TrashIcon size={22} />
              </button>
              <div className="recording" role="status">
                <span className="recording__dot" />
                <span className="recording__time">
                  {formatDuration(recorder.seconds)}
                </span>
                <span className="recording__wave">
                  {recorder.levels.map((l, i) => (
                    <span
                      key={i}
                      style={{ height: `${Math.min(100, 12 + l * 400)}%` }}
                    />
                  ))}
                </span>
              </div>
              <button
                className="icon-btn chat__send"
                title="Отправить голосовое"
                autoFocus
              >
                <SendIcon size={26} />
              </button>
            </form>
          ) : (
            <form className="chat__composer" onSubmit={submit}>
              {!active.textOnly && (
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
              )}
              <div className="chat__field">
                <input
                  ref={inputRef}
                  placeholder={attachment ? "Добавьте подпись…" : "Сообщение"}
                  autoComplete="off"
                  maxLength={4000}
                  value={text}
                  onPaste={(e) => {
                    const file = [...e.clipboardData.files].find((f) =>
                      attachmentKind(f),
                    );
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
                <EmojiPicker
                  inputRef={inputRef}
                  value={text}
                  onChange={(next) => {
                    setText(next);
                    if (next) onTyping?.(active.id);
                  }}
                />
              </div>
              {canSend || active.textOnly ? (
                <button
                  className="icon-btn chat__send"
                  title="Отправить"
                  disabled={!canSend}
                >
                  <SendIcon size={26} />
                </button>
              ) : (
                <button
                  type="button"
                  className="icon-btn chat__send"
                  title="Записать голосовое сообщение"
                  style={{ color: "var(--icon-secondary)" }}
                  onClick={startVoice}
                >
                  <MicIcon size={24} />
                </button>
              )}
            </form>
          )}
        </div>
      ) : (
        <div className="chat chat--empty">
          <div className="chat__empty">Выберите чат слева</div>
        </div>
      )}

      {zoomUrl && <Lightbox url={zoomUrl} onClose={() => setZoomUrl(null)} />}

      {toDelete && (
        <DeleteMessageModal
          canDeleteForAll={toDelete.canDeleteForAll}
          onConfirm={(forAll) => {
            onDelete?.(toDelete, forAll);
            setToDelete(null);
          }}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
