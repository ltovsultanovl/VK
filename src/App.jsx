import { useEffect, useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Splash from "./components/Splash";
import ErrorBoundary from "./components/ErrorBoundary";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import OnlineMessenger from "./pages/OnlineMessenger";
import Friends from "./pages/Friends";
import EditProfile from "./pages/EditProfile";
import AuthPage from "./pages/AuthPage";
import SetupNeeded from "./pages/SetupNeeded";
import NewPassword from "./pages/NewPassword";
import { useAuth } from "./context/AuthContext";
import { ProfileProvider, useProfile } from "./context/ProfileContext";
import { FriendsProvider, useFriends } from "./context/FriendsContext";
import { ChatProvider, useChat } from "./context/ChatContext";
import { MediaProvider } from "./context/MediaContext";
import { supabaseConfigured } from "./lib/supabase";
import { useStoredState } from "./hooks";

// Тему до отрисовки уже поставил скрипт в index.html (с учётом системной)
const readTheme = () => document.documentElement.dataset.theme || "light";

// Адрес → экран: #feed, #profile, #user/<id>, #edit, #messages, #friends[/requests|/search?q=…]
const VIEWS = ["feed", "profile", "user", "edit", "messages", "friends"];
const readRoute = () => {
  const [path, search = ""] = decodeURIComponent(window.location.hash.slice(1)).split("?");
  const [view, param = ""] = path.split("/");
  return {
    view: VIEWS.includes(view) ? view : "feed",
    param,
    query: new URLSearchParams(search).get("q") ?? "",
  };
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

// Приложение для вошедшего пользователя
function Shell({ theme, onToggleTheme }) {
  const { myId } = useProfile();
  const { incoming } = useFriends();
  const chat = useChat();
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (path) => {
    if (window.location.hash === `#${path}`) setRoute(readRoute());
    else window.location.hash = path;
  };

  const { view, param, query } = route;
  // Своя страница по адресу #user/<мой id> — то же, что #profile
  const profileId = view === "profile" || (view === "user" && param === myId) ? myId : view === "user" ? param : null;

  return (
    <>
      <Header onNavigate={navigate} theme={theme} onToggleTheme={onToggleTheme} />
      <div className="layout">
        <Sidebar
          view={profileId === myId ? "profile" : view}
          onNavigate={navigate}
          counters={{ messages: chat.unreadTotal, friends: incoming.length }}
        />
        <main className="main">
          <ErrorBoundary key={`${view}/${param}`} fallback={(reset) => <PageError onRetry={reset} />}>
            {view === "feed" && <Feed />}
            {profileId && <Profile key={profileId} userId={profileId} onNavigate={navigate} />}
            {view === "edit" && <EditProfile onNavigate={navigate} />}
            {view === "messages" && <OnlineMessenger />}
            {view === "friends" && <Friends section={param} query={query} onNavigate={navigate} />}
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}

export default function App() {
  const { session, recovering, finishRecovery } = useAuth();
  const [theme, setTheme] = useStoredState("theme", readTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (!supabaseConfigured) return <SetupNeeded />;
  if (session === undefined) return <Splash />;
  if (!session) return <AuthPage />;
  if (recovering) return <NewPassword onDone={finishRecovery} />;

  // key — при смене аккаунта все данные предыдущего пользователя сбрасываются
  return (
    <ProfileProvider key={session.user.id} userId={session.user.id}>
      <FriendsProvider>
        <ChatProvider>
          <MediaProvider>
            <Shell theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />
          </MediaProvider>
        </ChatProvider>
      </FriendsProvider>
    </ProfileProvider>
  );
}
