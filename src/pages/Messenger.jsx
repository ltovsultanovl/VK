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

export default function Messenger({ dialogs, activeId, onOpen, onSend }) {
  const [text, setText] = useState("");
  const [folder, setFolder] = useState(folders[0]);
  const [query, setQuery] = useState("");
  const bodyRef = useRef(null);
  const active = dialogs.find((d) => d.id === activeId) ?? dialogs[0];

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active.messages.length, active.id]);

  const visible = dialogs.filter(
    (d) =>
      (folder !== "Непрочитанные" || d.unread > 0) &&
      d.person.name.toLowerCase().includes(query.toLowerCase()),
  );

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
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
            const last = d.messages[d.messages.length - 1];
            return (
              <div
                key={d.id}
                className={`dialog ${d.id === active.id ? "active" : ""}`}
                onClick={() => onOpen(d.id)}
              >
                <Avatar
                  name={d.person.name}
                  color={d.person.color}
                  size={48}
                  online={d.person.online}
                />
                <div className="dialog__body">
                  <div className="dialog__top">
                    <span className="dialog__name">{d.person.name}</span>
                    <span className="dialog__time">{d.time}</span>
                  </div>
                  <div className="dialog__bottom">
                    <span className="dialog__last">
                      {last ? (
                        <>
                          {last.out && <b>Вы: </b>}
                          {last.text}
                        </>
                      ) : (
                        "Нет сообщений"
                      )}
                    </span>
                    {d.unread > 0 && (
                      <span className="dialog__unread">{d.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && (
            <div className="empty">Ничего не найдено</div>
          )}
        </div>
      </div>

      {/* ---------- Окно чата ---------- */}
      <div className="chat">
        <div className="chat__head">
          <Avatar
            name={active.person.name}
            color={active.person.color}
            size={36}
            online={active.person.online}
          />
          <div className="chat__title">
            <div className="chat__name">{active.person.name}</div>
            <div
              className={`chat__status ${active.person.online ? "chat__status--online" : ""}`}
            >
              {active.person.online ? "в сети" : "был(а) недавно"}
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
            <>
              <div className="chat__day">Сегодня</div>
              {active.messages.map((m) => (
                <div key={m.id} className={`msg ${m.out ? "msg--out" : ""}`}>
                  {m.text}
                  <span className="msg__time">{m.time}</span>
                </div>
              ))}
            </>
          ) : (
            <div className="chat__empty">Здесь будет история переписки</div>
          )}
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
              value={text}
              onChange={(e) => setText(e.target.value)}
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
    </div>
  );
}
