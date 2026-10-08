import {
  BookmarkIcon,
  FriendsIcon,
  GroupsIcon,
  HelpIcon,
  MessageIcon,
  MusicIcon,
  NewsIcon,
  PhotoIcon,
  StickersIcon,
  UserIcon,
  VideoIcon,
} from "./Icons";

const groups = [
  [
    { view: "profile", Icon: UserIcon, label: "Профиль" },
    { view: "feed", Icon: NewsIcon, label: "Лента" },
    { view: "messages", Icon: MessageIcon, label: "Мессенджер" },
    { view: "friends", Icon: FriendsIcon, label: "Друзья" },
    { Icon: GroupsIcon, label: "Сообщества" },
    { Icon: PhotoIcon, label: "Фото" },
    { Icon: MusicIcon, label: "Музыка" },
    { Icon: VideoIcon, label: "Видео" },
    { Icon: StickersIcon, label: "Стикеры", dot: true },
  ],
  [
    { Icon: BookmarkIcon, label: "Закладки" },
    { Icon: HelpIcon, label: "Помощь" },
  ],
];

const FOOTER_LINKS = ["Блог", "Разработчикам", "Для бизнеса", "Ещё"];

// counters — числа у пунктов по их view: { messages: 3, friends: 1 }
export default function Sidebar({ view, onNavigate, counters = {} }) {
  // Редактирование профиля — подраздел профиля
  const activeView = view === "edit" ? "profile" : view;

  const renderItem = ({ view: target, Icon, label, dot }) => {
    const value = counters[target];
    return (
      <a
        key={label}
        href="#"
        className={`nav-item ${target && target === activeView ? "active" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          if (target) onNavigate(target);
        }}
      >
        <span className="nav-item__icon">
          <Icon size={24} />
          {dot && <span className="nav-item__dot" />}
        </span>
        <span className="nav-item__label">{label}</span>
        {value > 0 && <span className="counter">{value}</span>}
      </a>
    );
  };

  return (
    <nav className="sidebar">
      {groups.map((items, i) => (
        <div key={i}>
          {i > 0 && <div className="separator" />}
          {items.map(renderItem)}
        </div>
      ))}
      <div className="sidebar__footer">
        {FOOTER_LINKS.map((label) => (
          <a key={label} href="#" onClick={(e) => e.preventDefault()}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
