import { useEffect, useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Messenger from "./pages/Messenger";
import Friends from "./pages/Friends";
import { autoReplies, initialDialogs, initialPosts, people } from "./data";
import EditProfile from "./pages/EditProfile";
import ErrorBoundary from "./components/ErrorBoundary";
import { nowTime } from "./utils";

// Тему до отрисовки уже поставил скрипт в index.html (с учётом системной)
const readTheme = () => document.documentElement.dataset.theme || "light";

const VIEWS = ["feed", "profile", "edit", "messages", "friends"];
const readView = () => {
  const hash = window.location.hash.slice(1);
  return VIEWS.includes(hash) ? hash : "feed";
};

function PageError({ onRetry }) {
  return (
    <div className="card error-screen" role="alert">
      <div className="error-screen__title">Не удалось показать страницу</div>
      <p className="error-screen__text">
        Произошла ошибка. Попробуйте ещё раз или откройте другой раздел в меню слева.
      </p>
      <button className="btn" onClick={onRetry}>
        Попробовать снова
      </button>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState(readView);
  const [theme, setTheme] = useState(readTheme);
  const [posts, setPosts] = useState(initialPosts);
  const [dialogs, setDialogs] = useState(initialDialogs);
  const [activeDialogId, setActiveDialogId] = useState(initialDialogs[0].id);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* noop */
    }
  }, [theme]);

  // Синхронизация страницы с адресом (#feed, #profile, #edit, #messages, #friends)
  useEffect(() => {
    const onHash = () => setView(readView());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (next) => {
    setView(next);
    window.location.hash = next;
    window.scrollTo(0, 0);
  };

  // ---------- Посты ----------
  const updatePost = (id, fn) =>
    setPosts((list) => list.map((p) => (p.id === id ? fn(p) : p)));

  const postActions = {
    onLike: (id) =>
      updatePost(id, (p) => ({
        ...p,
        liked: !p.liked,
        likes: p.likes + (p.liked ? -1 : 1),
      })),
    onShare: (id) => updatePost(id, (p) => ({ ...p, reposts: p.reposts + 1 })),
    onDelete: (id) => setPosts((list) => list.filter((p) => p.id !== id)),
    // Закреплённой может быть только одна запись
    onPin: (id) =>
      setPosts((list) =>
        list.map((p) => ({ ...p, pinned: p.id === id ? !p.pinned : false })),
      ),
    onComment: (id, text) =>
      updatePost(id, (p) => ({
        ...p,
        comments: [
          ...p.comments,
          { id: Date.now(), mine: true, text, time: nowTime(), likes: 0 },
        ],
      })),
    onPublish: (text) =>
      setPosts((list) => [
        {
          id: Date.now(),
          mine: true,
          time: "только что",
          text,
          image: null,
          likes: 0,
          liked: false,
          reposts: 0,
          views: "1",
          comments: [],
        },
        ...list,
      ]),
  };

  // ---------- Сообщения ----------
  const updateDialog = (id, fn) =>
    setDialogs((list) => list.map((d) => (d.id === id ? fn(d) : d)));

  const openDialog = (id) => {
    setActiveDialogId(id);
    updateDialog(id, (d) => ({ ...d, unread: 0 }));
  };

  const pushMessage = (id, out, text) => {
    const time = nowTime();
    updateDialog(id, (d) => ({
      ...d,
      time,
      messages: [
        ...d.messages,
        { id: Date.now() + Math.random(), out, text, time },
      ],
    }));
  };

  const sendMessage = (id, text) => {
    pushMessage(id, true, text);
    // Имитация ответа собеседника
    setTimeout(() => {
      pushMessage(
        id,
        false,
        autoReplies[Math.floor(Math.random() * autoReplies.length)],
      );
    }, 1200);
  };

  const messageFriend = (personId) => {
    navigate("messages");
    if (dialogs.some((d) => d.id === personId)) {
      openDialog(personId);
    } else {
      const person = people.find((p) => p.id === personId);
      setDialogs((list) => [
        { id: personId, person, unread: 0, time: nowTime(), messages: [] },
        ...list,
      ]);
      setActiveDialogId(personId);
    }
  };

  const unreadMessages = dialogs.reduce((sum, d) => sum + d.unread, 0);

  return (
    <>
      <Header
        onNavigate={navigate}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />
      <div className="layout">
        <Sidebar
          view={view}
          onNavigate={navigate}
          unreadMessages={unreadMessages}
        />
        <main className="main">
          <ErrorBoundary key={view} fallback={(reset) => <PageError onRetry={reset} />}>
            {view === "feed" && <Feed posts={posts} postActions={postActions} />}
            {view === "profile" && (
              <Profile
                posts={posts}
                postActions={postActions}
                onNavigate={navigate}
              />
            )}
            {view === "edit" && <EditProfile onNavigate={navigate} />}
            {view === "messages" && (
              <Messenger
                dialogs={dialogs}
                activeId={activeDialogId}
                onOpen={openDialog}
                onSend={sendMessage}
              />
            )}
            {view === "friends" && <Friends onMessage={messageFriend} />}
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}
