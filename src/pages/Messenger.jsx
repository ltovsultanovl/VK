import { useEffect, useRef, useState } from "react";
import Avatar from "../components/Avatar";
import {
  AttachIcon,
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

// Окно мессенджера. Работает и в демо-режиме, и с онлайн-чатом.
// dialog: { id, person: { name, color, avatar?, online }, unread, time, typing?,
//           messages: [{ id, out, text, time, day?, state?: pending|sent|read|failed }] }
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
  const bodyRef = useRef(null);
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

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !active) return;
    onSend(active.id, value);
    setText("");
  };

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
                          {last.text}
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
        <div className="chat">
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
                    <div className={`msg ${m.out ? "msg--out" : ""} ${m.state === "failed" ? "msg--failed" : ""}`}>
                      {m.text}
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

          <form className="chat__composer" onSubmit={submit}>
            <button
              type="button"
              className="icon-btn chat__send"
              title="Прикрепить"
              style={{ color: "var(--icon-secondary)" }}
            >
              <AttachIcon size={24} />
            </button>
            <div className="chat__field">
              <input
                placeholder="Сообщение"
                autoComplete="off"
                maxLength={4000}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target.value) onTyping?.(active.id);
                }}
              />
              <button type="button" className="icon-btn" title="Эмодзи">
                <SmileIcon size={22} />
              </button>
            </div>
            {text.trim() ? (
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
    </div>
  );
}
