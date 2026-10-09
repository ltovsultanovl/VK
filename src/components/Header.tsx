import { useState } from "react";
import MeAvatar from "./MeAvatar";
import { BellIcon, ChevronDownIcon, LogoutIcon, MoonIcon, SearchIcon } from "./Icons";
import HeaderPlayer from "./music/HeaderPlayer";
import { useSnackbar } from "./Snackbar";
import { useProfile } from "../context/ProfileContext";
import { useFriends } from "../context/FriendsContext";
import { useDropdown } from "../hooks";
import { explainError, signOut } from "../api";
import type { Navigate } from "../types";

export default function Header({
  onNavigate,
  theme,
  onToggleTheme,
}: {
  onNavigate: Navigate;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const { name } = useProfile();
  const { incoming } = useFriends();
  const showSnackbar = useSnackbar();
  const menu = useDropdown();
  const [query, setQuery] = useState("");

  const go = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    menu.close();
    onNavigate(path);
  };

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(`friends/search?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  };

  const logout = async () => {
    menu.close();
    try {
      await signOut();
    } catch (e) {
      showSnackbar(explainError(e), "error");
    }
  };

  return (
    <header className="header">
      <div className="header__inner">
        <a className="logo" href="#feed" onClick={go("feed")}>
          <span className="logo__mark">VK</span>
          <span className="logo__text">вконтакте</span>
        </a>

        <form className="search" role="search" onSubmit={search}>
          <SearchIcon size={16} />
          <input
            type="search"
            placeholder="Поиск: имя или почта"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="header__actions">
          <button
            className="icon-btn"
            title={incoming.length ? `Заявки в друзья: ${incoming.length}` : "Уведомления"}
            onClick={() => onNavigate("friends/requests")}
          >
            <BellIcon size={28} />
            {incoming.length > 0 && <span className="badge">{incoming.length}</span>}
          </button>
          <HeaderPlayer onNavigate={onNavigate} />
        </div>

        <div className="header__spacer" />

        <div className="profile-menu" ref={menu.ref}>
          <button className="header__user" onClick={menu.toggle}>
            <MeAvatar size={32} />
            <ChevronDownIcon size={16} />
          </button>

          {menu.open && (
            <div className="dropdown">
              <a href="#profile" className="dropdown__head" onClick={go("profile")}>
                <MeAvatar size={48} />
                <div>
                  <div className="dropdown__name">{name}</div>
                  <div className="muted">Перейти в профиль</div>
                </div>
              </a>
              <div className="separator" />
              <button className="dropdown__item" onClick={onToggleTheme}>
                <MoonIcon /> Тема
                <span className="muted">{theme === "dark" ? "Тёмная" : "Светлая"}</span>
              </button>
              <div className="separator" />
              <button className="dropdown__item" onClick={logout}>
                <LogoutIcon /> Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
