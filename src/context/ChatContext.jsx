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
import { useProfile } from "./ProfileContext";
import { useSnackbar } from "../components/Snackbar";

const ChatContext = createContext(null);

const TYPING_TIMEOUT = 3500; // столько держится «печатает…» после последнего нажатия
const TYPING_THROTTLE = 2000; // не чаще раза в 2 с шлём «я печатаю»
const MESSAGES_LIMIT = 1000;

// Понятные подсказки к частым ошибкам настройки Supabase
const explain = (error) => {
  const text = error?.message ?? String(error);
  if (/anonymous/i.test(text)) {
    return "В Supabase выключен анонимный вход. Включите: Authentication → Sign In / Providers → Allow anonymous sign-ins.";
  }
  if (/relation .* does not exist|schema cache/i.test(text)) {
    return "В базе нет таблиц чата. Выполните скрипт supabase/schema.sql в SQL Editor.";
  }
  if (/fetch|network/i.test(text)) {
    return "Нет связи с Supabase. Проверьте интернет (или VPN) и адрес проекта в .env.local.";
  }
  return text;
};

// Одна сессия на вкладку: StrictMode запускает эффект дважды,
// и без этого два параллельных signInAnonymously создали бы двух пользователей
let sessionPromise = null;
const ensureSession = () =>
  (sessionPromise ??= (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.session;
  })().catch((e) => {
    sessionPromise = null; // чтобы «Повторить» попробовало ещё раз
    throw e;
  }));

const upsertById = (list, row) => {
  const i = list.findIndex((m) => m.id === row.id);
  if (i === -1) return [...list, row];
  const next = [...list];
  next[i] = { ...next[i], ...row };
  return next;
};

const byTime = (a, b) => new Date(a.created_at) - new Date(b.created_at);

// Онлайн-чат на Supabase: анонимный вход, профили, личные сообщения,
// «в сети» (presence) и «печатает…» (broadcast) в реальном времени
export function ChatProvider({ children }) {
  const { profile, name } = useProfile();
  const showSnackbar = useSnackbar();

  const [status, setStatus] = useState(supabase ? "connecting" : "disabled");
  const [error, setError] = useState("");
  const [myId, setMyId] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineIds, setOnlineIds] = useState(() => new Set());
  const [typingIds, setTypingIds] = useState(() => new Set());
  const [attempt, setAttempt] = useState(0);

  const presenceRef = useRef(null);
  const typingTimers = useRef({});
  const lastTypingSent = useRef(0);
  const namesRef = useRef({});

  useEffect(() => {
    namesRef.current = Object.fromEntries(profiles.map((p) => [p.id, p.name]));
  }, [profiles]);

  // ---------- Подключение ----------
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const channels = [];

    const connect = async () => {
      setStatus("connecting");
      setError("");
      try {
        const session = await ensureSession();
        if (cancelled) return;
        const me = session.user.id;

        // Профиль нужен до сообщений: на него ссылаются внешние ключи
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: me, name, color: profile.color, avatar: profile.avatar });
        if (profileError) throw profileError;

        const [profilesRes, messagesRes] = await Promise.all([
          supabase.from("profiles").select("id, name, color, avatar"),
          supabase
            .from("messages")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(MESSAGES_LIMIT),
        ]);
        if (profilesRes.error) throw profilesRes.error;
        if (messagesRes.error) throw messagesRes.error;
        if (cancelled) return;

        setMyId(me);
        setProfiles(profilesRes.data);
        setMessages(messagesRes.data.sort(byTime));

        // Новые и прочитанные сообщения, новые участники
        channels.push(
          supabase
            .channel("db-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, ({ new: row }) => {
              if (!row?.id) return;
              setMessages((list) => upsertById(list, row).sort(byTime));
              const incoming = row.recipient_id === me && !row.read_at;
              if (incoming && location.hash !== "#messages") {
                const from = namesRef.current[row.sender_id] ?? "Новое сообщение";
                showSnackbar(`${from}: ${row.text.slice(0, 60)}`, "info");
              }
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, ({ new: row }) => {
              if (row?.id) setProfiles((list) => upsertById(list, row));
            })
            .subscribe(),
        );

        // Кто в сети и кто печатает
        const presence = supabase.channel("online", { config: { presence: { key: me } } });
        presence
          .on("presence", { event: "sync" }, () => {
            setOnlineIds(new Set(Object.keys(presence.presenceState())));
          })
          .on("broadcast", { event: "typing" }, ({ payload }) => {
            if (payload?.to !== me) return;
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
        setError(explain(e));
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
    // Переподключаемся только по кнопке «Повторить» — профиль обновляется отдельным эффектом
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // ---------- Имя, цвет и аватар в чате следуют за профилем ----------
  useEffect(() => {
    if (status !== "ready" || !myId) return;
    supabase
      .from("profiles")
      .update({ name, color: profile.color, avatar: profile.avatar, updated_at: new Date().toISOString() })
      .eq("id", myId)
      .then(({ error }) => error && showSnackbar(explain(error), "error"));
  }, [status, myId, name, profile.color, profile.avatar, showSnackbar]);

  // ---------- Действия ----------
  const sendMessage = useCallback(
    async (to, text) => {
      // Сразу показываем сообщение с часиками, после ответа сервера — меняем на настоящее
      const tempId = `tmp-${crypto.randomUUID()}`;
      const temp = {
        id: tempId,
        sender_id: myId,
        recipient_id: to,
        text,
        created_at: new Date().toISOString(),
        read_at: null,
        pending: true,
      };
      setMessages((list) => [...list, temp]);

      const { data, error } = await supabase
        .from("messages")
        .insert({ recipient_id: to, text })
        .select()
        .single();

      if (error) {
        setMessages((list) => list.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
        showSnackbar(`Сообщение не отправлено: ${explain(error)}`, "error");
        return;
      }
      setMessages((list) => upsertById(list.filter((m) => m.id !== tempId), data).sort(byTime));
    },
    [myId, showSnackbar],
  );

  const retryMessage = useCallback(
    (message) => {
      setMessages((list) => list.filter((m) => m.id !== message.id));
      sendMessage(message.recipient_id, message.text);
    },
    [sendMessage],
  );

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

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // ---------- Диалоги: все участники, кроме меня, с их перепиской ----------
  const dialogs = useMemo(() => {
    if (!myId) return [];
    return profiles
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
  }, [profiles, messages, myId, onlineIds, typingIds]);

  const unreadTotal = dialogs.reduce((sum, d) => sum + d.unread, 0);

  const value = useMemo(
    () => ({
      status,
      error,
      myId,
      dialogs,
      unreadTotal,
      sendMessage,
      retryMessage,
      markRead,
      sendTyping,
      retry,
    }),
    [status, error, myId, dialogs, unreadTotal, sendMessage, retryMessage, markRead, sendTyping, retry],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat нужно вызывать внутри <ChatProvider>");
  return context;
}
