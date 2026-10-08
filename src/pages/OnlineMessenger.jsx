import { useEffect, useMemo } from "react";
import Messenger from "./Messenger";
import { messageSummary, useChat } from "../context/ChatContext";
import { formatDay, formatDialogTime, formatTime } from "../utils";
import { usePageVisible } from "../hooks";

const DAY_MS = 24 * 60 * 60 * 1000;

const messageState = (m, out) => {
  if (m.failed) return "failed";
  if (m.pending) return "pending";
  if (!out) return undefined;
  return m.read_at ? "read" : "sent";
};

// Мессенджер на Supabase: подключение, ошибки, пустой список
export default function OnlineMessenger() {
  const {
    status,
    error,
    myId,
    dialogs,
    fileUrls,
    activePeerId,
    setActivePeerId,
    sendMessage,
    retryMessage,
    deleteMessage,
    markRead,
    sendTyping,
    retry,
  } = useChat();

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
            summary: messageSummary(m),
            attachment: m.attachment_type && {
              type: m.attachment_type,
              name: m.attachment_name,
              meta: m.attachment_meta,
              url: m.localUrl ?? fileUrls[m.attachment_path] ?? null,
            },
            shared: m.shared_type && { type: m.shared_type, id: m.shared_id },
            time: formatTime(m.created_at),
            day: formatDay(m.created_at),
            state: messageState(m, out),
            // «Удалить у всех» — своё, уже на сервере и не старше суток (как в VK)
            canDeleteForAll:
              out && !String(m.id).startsWith("tmp-") && Date.now() - new Date(m.created_at) < DAY_MS,
            raw: m,
          };
        }),
      })),
    [dialogs, myId, fileUrls],
  );

  const active = view.find((d) => d.id === activePeerId) ?? view[0] ?? null;

  // Закрепляем первый чат как выбранный: иначе при подгрузке друзей список пересортируется
  // и открытый чат сам переключится на другой — посреди набора текста или записи голосового
  useEffect(() => {
    if (!activePeerId && view[0]) setActivePeerId(view[0].id);
  }, [activePeerId, view, setActivePeerId]);

  // Прочитано — только когда собеседник действительно видит чат: он открыт и вкладка на экране.
  // Свернул окно — новые сообщения ждут; вернулся — сразу отмечаем (у отправителя станет ✓✓)
  const pageVisible = usePageVisible();
  useEffect(() => {
    if (pageVisible && active?.unread) markRead(active.id);
  }, [pageVisible, active?.id, active?.unread, markRead]);

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
      onOpen={setActivePeerId}
      onSend={(id, text, file, voice) => sendMessage(id, { text, file, voice })}
      onTyping={sendTyping}
      onRetry={(m) => retryMessage(m.raw)}
      onDelete={(m, forAll) => deleteMessage(m.raw, { forAll })}
      emptyText="Здесь появятся ваши друзья и переписки. Найдите знакомых в разделе «Друзья»"
    />
  );
}
