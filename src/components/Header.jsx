import { useEffect, useRef, useState } from "react";
import MeAvatar from "./MeAvatar";
import {
  BellIcon,
  ChevronDownIcon,
  HelpIcon,
  LogoutIcon,
  MoonIcon,
  MusicIcon,
  SearchIcon,
  SettingsIcon,
} from "./Icons";
import { useProfile } from "../context/ProfileContext";

export default function Header({ onNavigate, theme, onToggleTheme }) {
  const { name } = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Закрываем меню по клику снаружи
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const go = (view) => (e) => {
    e.preventDefault();
    setMenuOpen(false);
    onNavigate(view);
  };

  return (
    <header className="header">
      <div className="header__inner">
        <a className="logo" href="#" onClick={go("feed")}>
          <span className="logo__mark">VK</span>
          <span className="logo__text">вконтакте</span>
        </a>

        <label className="search">
          <SearchIcon size={16} />
          <input type="search" placeholder="Поиск" />
        </label>

        <div className="header__actions">
          <button className="icon-btn" title="Уведомления">
            <BellIcon size={28} />
            <span className="badge">1</span>
          </button>
          <button className="icon-btn" title="Музыка">
            <MusicIcon size={28} />
          </button>
        </div>

        <div className="header__spacer" />

        <div className="profile-menu" ref={menuRef}>
          <button
            className="header__user"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MeAvatar size={32} />
            <ChevronDownIcon size={16} />
          </button>

          {menuOpen && (
            <div className="dropdown">
              <a href="#" className="dropdown__head" onClick={go("profile")}>
                <MeAvatar size={48} />
                <div>
                  <div className="dropdown__name">{name}</div>
                  <div className="muted">Перейти в профиль</div>
                </div>
              </a>
              <div className="separator" />
              <button className="dropdown__item">
                <SettingsIcon /> Настройки
              </button>
              <button className="dropdown__item" onClick={onToggleTheme}>
                <MoonIcon /> Тема
                <span className="muted">
                  {theme === "dark" ? "Тёмная" : "Светлая"}
                </span>
              </button>
              <button className="dropdown__item">
                <HelpIcon /> Помощь
              </button>
              <div className="separator" />
              <button className="dropdown__item">
                <LogoutIcon /> Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
