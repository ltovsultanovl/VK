import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  attachmentKind,
  explainError,
  fetchPeople,
  getChatFileUrls,
  removeChatFile,
  trackTitle,
  uploadChatFile,
} from "../api";
import { useProfile } from "./ProfileContext";
import { useFriends } from "./FriendsContext";
import { useSnackbar } from "../components/Snackbar";

const ChatContext = createContext(null);

const TYPING_TIMEOUT = 3500; // столько держится «печатает…» после последнего нажатия
const TYPING_THROTTLE = 2000; // не чаще раза в 2 с шлём «я печатаю»
const MESSAGES_LIMIT = 1000;

const upsertById = (list, row) => {
  const i = list.findIndex((m) => m.id === row.id);
  if (i === -1) return [...list, row];
  const next = [...list];
  next[i] = { ...next[i], ...row };
  return next;
};

const byTime = (a, b) => new Date(a.created_at) - new Date(b.created_at);

// Короткое описание сообщения — для уведомлений и списка чатов
const ATTACHMENT_SUMMARY = { image: "📷 Фотография", video: "🎬 Видео", audio: "🎵 Аудиозапись" };
export const messageSummary = (m) =>
  m.text ||
  (m.attachment_type === "audio" && m.attachment_name ? `🎵 ${m.attachment_name}` : ATTACHMENT_SUMMARY[m.attachment_type] ?? "");

// Личные сообщения в реальном времени: переписки, «в сети» (presence),
// «печатает…» (broadcast), прочитано/не прочитано
export function ChatProvider({ children }) {
  const { myId } = useProfile();
  const { friends } = useFriends();
  const showSnackbar = useSnackbar();

  const [status, setStatus] = useState("connecting"); // connecting | ready | error
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [people, setPeople] = useState({}); // id → person: собеседники, которых нет в друзьях
  const [onlineIds, setOnlineIds] = useState(() => new Set());
  const [typingIds, setTypingIds] = useState(() => new Set());
  const [activePeerId, setActivePeerId] = useState(null);
  const [fileUrls, setFileUrls] = useState({}); // путь вложения → временная ссылка
  const requestedUrls = useRef(new Set());
  const [attempt, setAttempt] = useState(0);

  const presenceRef = useRef(null);
  const typingTimers = useRef({});
  const lastTypingSent = useRef(0);
  const peopleRef = useRef(people);
  useEffect(() => {
    peopleRef.current = people;
  });

  // Подгружаем профили собеседников, которых ещё не знаем
  const loadPeople = useCallback(async (ids) => {
    const missing = [...new Set(ids)].filter((id) => id && !peopleRef.current[id]);
    if (!missing.length) return;
    try {
      const list = await fetchPeople(missing);
      setPeople((map) => ({ ...map, ...Object.fromEntries(list.map((p) => [p.id, p])) }));
    } catch {
      /* без имени собеседника переписка всё равно видна — повторим при следующем сообщении */
    }
  }, []);

  // ---------- Подключение ----------
  useEffect(() => {
    let cancelled = false;
    const channels = [];

    const connect = async () => {
      setStatus("connecting");
      setError("");
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(MESSAGES_LIMIT);
        if (error) throw error;
        if (cancelled) return;

        setMessages(data.sort(byTime));
        await loadPeople(data.map((m) => (m.sender_id === myId ? m.recipient_id : m.sender_id)));

        // Новые и прочитанные сообщения
        channels.push(
          supabase
            .channel("messages")
            .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, ({ new: row }) => {
              if (!row?.id) return;
              setMessages((list) => upsertById(list, row).sort(byTime));
              const peer = row.sender_id === myId ? row.recipient_id : row.sender_id;
              loadPeople([peer]);
              const incoming = row.recipient_id === myId && !row.read_at;
              if (incoming && !location.hash.startsWith("#messages")) {
                const from = peopleRef.current[row.sender_id]?.name ?? "Новое сообщение";
                showSnackbar(`${from}: ${messageSummary(row).slice(0, 60)}`, "info");
              }
            })
            .subscribe(),
        );

        // Кто в сети и кто печатает
        const presence = supabase.channel("online", { config: { presence: { key: myId } } });
        presence
          .on("presence", { event: "sync" }, () => {
            setOnlineIds(new Set(Object.keys(presence.presenceState())));
          })
          .on("broadcast", { event: "typing" }, ({ payload }) => {
            if (payload?.to !== myId) return;
            const from = payload.from;
            setTypingIds((ids) => new Set(ids).add(from));
            clearTimeout(typingTimers.current[from]);
            typingTimers.current[from] = setTimeout(() => {
              setTypingIds((ids) => {
                const next = new Set(ids);
                next.delete(from);
                return next;
              });
            }, TYPING_TIMEOUT);
          })
          .subscribe((state) => {
            if (state === "SUBSCRIBED") presence.track({ at: Date.now() });
          });
        channels.push(presence);
        presenceRef.current = presence;

        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(explainError(e));
        setStatus("error");
      }
    };

    connect();

    return () => {
      cancelled = true;
      channels.forEach((ch) => supabase.removeChannel(ch));
      presenceRef.current = null;
      Object.values(typingTimers.current).forEach(clearTimeout);
    };
  }, [myId, attempt, loadPeople, showSnackbar]);

  // ---------- Действия ----------
  // file — фото, видео или музыка (необязательно). Сначала грузим файл, потом создаём сообщение
  const sendMessage = useCallback(
    async (to, text, file = null) => {
      // Сразу показываем сообщение с часиками (и превью файла), после ответа сервера — настоящее
      const tempId = `tmp-${crypto.randomUUID()}`;
      const localUrl = file ? URL.createObjectURL(file) : null;
      const attachmentType = file ? attachmentKind(file) : null;
      setMessages((list) => [
        ...list,
        {
          id: tempId,
          sender_id: myId,
          recipient_id: to,
          text,
          attachment_type: attachmentType,
          attachment_name: attachmentType === "audio" ? trackTitle(file.name) : null,
          localUrl,
          file,
          created_at: new Date().toISOString(),
          read_at: null,
          pending: true,
        },
      ]);

      let uploaded = null;
      try {
        if (file) uploaded = await uploadChatFile(myId, to, file);
        const { data, error } = await supabase
          .from("messages")
          .insert({
            recipient_id: to,
            text,
            attachment_path: uploaded?.path ?? null,
            attachment_type: uploaded?.type ?? null,
            attachment_name: uploaded?.name ?? null,
          })
          .select()
          .single();
        if (error) throw error;

        // Своё вложение показываем по локальной ссылке — без лишней загрузки
        if (uploaded && localUrl) setFileUrls((urls) => ({ ...urls, [uploaded.path]: localUrl }));
        setMessages((list) => upsertById(list.filter((m) => m.id !== tempId), data).sort(byTime));
      } catch (e) {
        if (uploaded) removeChatFile(uploaded.path).catch(() => {}); // файл без сообщения не нужен
        setMessages((list) => list.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
        showSnackbar(`Сообщение не отправлено: ${explainError(e)}`, "error");
      }
    },
    [myId, showSnackbar],
  );

  const retryMessage = useCallback(
    (message) => {
      setMessages((list) => list.filter((m) => m.id !== message.id));
      if (message.localUrl) URL.revokeObjectURL(message.localUrl);
      sendMessage(message.recipient_id, message.text, message.file);
    },
    [sendMessage],
  );

  // Временные ссылки на вложения: запрашиваем для новых сообщений пачкой
  useEffect(() => {
    const missing = messages
      .map((m) => m.attachment_path)
      .filter((path) => path && !fileUrls[path] && !requestedUrls.current.has(path));
    if (!missing.length) return;
    missing.forEach((path) => requestedUrls.current.add(path));
    getChatFileUrls(missing)
      .then((urls) => setFileUrls((prev) => ({ ...prev, ...urls })))
      .catch(() => missing.forEach((path) => requestedUrls.current.delete(path)));
  }, [messages, fileUrls]);

  const markRead = useCallback(
    async (peerId) => {
      const now = new Date().toISOString();
      setMessages((list) =>
        list.map((m) =>
          m.sender_id === peerId && m.recipient_id === myId && !m.read_at ? { ...m, read_at: now } : m,
        ),
      );
      await supabase
        .from("messages")
        .update({ read_at: now })
        .eq("sender_id", peerId)
        .eq("recipient_id", myId)
        .is("read_at", null);
    },
    [myId],
  );

  const sendTyping = useCallback(
    (to) => {
      const now = Date.now();
      if (!presenceRef.current || now - lastTypingSent.current < TYPING_THROTTLE) return;
      lastTypingSent.current = now;
      presenceRef.current.send({ type: "broadcast", event: "typing", payload: { from: myId, to } });
    },
    [myId],
  );

  // «Написать сообщение» со страницы человека: открываем чат с ним, даже если переписки ещё нет
  const openChat = useCallback(
    (person) => {
      setPeople((map) => (map[person.id] ? map : { ...map, [person.id]: person }));
      setActivePeerId(person.id);
    },
    [],
  );

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // ---------- Диалоги: друзья + все, с кем есть переписка ----------
  const dialogs = useMemo(() => {
    const contacts = new Map(Object.entries(people));
    friends.forEach((f) => contacts.set(f.id, f));

    return [...contacts.values()]
      .filter((p) => p.id !== myId)
      .map((person) => {
        const thread = messages.filter(
          (m) =>
            (m.sender_id === person.id && m.recipient_id === myId) ||
            (m.sender_id === myId && m.recipient_id === person.id),
        );
        return {
          person: { ...person, online: onlineIds.has(person.id) },
          messages: thread,
          last: thread.at(-1) ?? null,
          unread: thread.filter((m) => m.recipient_id === myId && !m.read_at).length,
          typing: typingIds.has(person.id),
        };
      })
      .sort((a, b) => {
        if (a.last && b.last) return byTime(b.last, a.last);
        if (a.last || b.last) return a.last ? -1 : 1;
        return Number(b.person.online) - Number(a.person.online);
      });
  }, [people, friends, messages, myId, onlineIds, typingIds]);

  const unreadTotal = dialogs.reduce((sum, d) => sum + d.unread, 0);

  const value = useMemo(
    () => ({
      status,
      error,
      myId,
      dialogs,
      fileUrls,
      unreadTotal,
      onlineIds,
      activePeerId,
      setActivePeerId,
      openChat,
      sendMessage,
      retryMessage,
      markRead,
      sendTyping,
      retry,
    }),
    [status, error, myId, dialogs, fileUrls, unreadTotal, onlineIds, activePeerId, openChat, sendMessage, retryMessage, markRead, sendTyping, retry],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat нужно вызывать внутри <ChatProvider>");
  return context;
}
