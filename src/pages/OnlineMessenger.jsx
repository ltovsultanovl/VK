import { useEffect, useMemo, useState } from "react";
import Messenger from "./Messenger";
import { useChat } from "../context/ChatContext";
import { formatDay, formatDialogTime, formatTime } from "../utils";

const messageState = (m, out) => {
  if (m.failed) return "failed";
  if (m.pending) return "pending";
  if (!out) return undefined;
  return m.read_at ? "read" : "sent";
};

// Мессенджер с настоящим онлайн-чатом (Supabase): подключение, ошибки, пустой чат
export default function OnlineMessenger() {
  const { status, error, myId, dialogs, sendMessage, retryMessage, markRead, sendTyping, retry } =
    useChat();
  const [activeId, setActiveId] = useState(null);

  // Данные Supabase → формат, который понимает Messenger
  const view = useMemo(
    () =>
      dialogs.map((d) => ({
        id: d.person.id,
        person: d.person,
        unread: d.unread,
        typing: d.typing,
        time: formatDialogTime(d.last?.created_at),
        messages: d.messages.map((m) => {
          const out = m.sender_id === myId;
          return {
            id: m.id,
            out,
            text: m.text,
            time: formatTime(m.created_at),
            day: formatDay(m.created_at),
            state: messageState(m, out),
            raw: m,
          };
        }),
      })),
    [dialogs, myId],
  );

  const active = view.find((d) => d.id === activeId) ?? view[0] ?? null;

  // Открытый чат сразу помечаем прочитанным — и при входе, и когда приходят новые сообщения
  useEffect(() => {
    if (active?.unread) markRead(active.id);
  }, [active?.id, active?.unread, markRead]);

  if (status === "connecting") {
    return (
      <div className="card chat-status" role="status">
        <div className="chat-status__spinner" />
        Подключаемся к чату…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card chat-status" role="alert">
        <div className="chat-status__title">Не удалось подключиться к чату</div>
        <p className="chat-status__text">{error}</p>
        <button className="btn" onClick={retry}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <Messenger
      dialogs={view}
      activeId={active?.id}
      onOpen={setActiveId}
      onSend={sendMessage}
      onTyping={sendTyping}
      onRetry={(m) => retryMessage(m.raw)}
      emptyText="Пока в чате только вы. Откройте сайт в другом браузере или на другом устройстве — там появится второй участник"
    />
  );
}
