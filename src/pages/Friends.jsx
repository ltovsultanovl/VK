import { useState } from "react";
import Avatar from "../components/Avatar";
import SideMenu from "../components/SideMenu";
import { MoreIcon, SearchIcon } from "../components/Icons";
import { people } from "../data";

const menu = [
  { label: "Мои друзья" },
  { label: "Заявки в друзья", counter: 2 },
  { label: "Поиск друзей" },
  { label: "Списки друзей" },
];

export default function Friends({ onMessage }) {
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [query, setQuery] = useState("");
  const onlineCount = people.filter((p) => p.online).length;

  const list = people.filter(
    (p) =>
      (!onlineOnly || p.online) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="columns">
      <div className="card">
        <div className="wall-tabs">
          <button
            className={`seg ${!onlineOnly ? "active" : ""}`}
            onClick={() => setOnlineOnly(false)}
          >
            Все друзья <span className="muted">{people.length}</span>
          </button>
          <button
            className={`seg ${onlineOnly ? "active" : ""}`}
            onClick={() => setOnlineOnly(true)}
          >
            Друзья онлайн <span className="muted">{onlineCount}</span>
          </button>
        </div>

        <div className="friends-search">
          <label className="search">
            <SearchIcon size={16} />
            <input
              type="search"
              placeholder="Поиск друзей"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        {list.map((p) => (
          <div className="friend" key={p.id}>
            <Avatar name={p.name} color={p.color} size={80} online={p.online} />
            <div className="friend__info">
              <div className="friend__name">{p.name}</div>
              <div className="friend__city">{p.city}</div>
              <span className="friend__write" onClick={() => onMessage(p.id)}>
                Написать сообщение
              </span>
            </div>
            <button className="icon-btn" title="Действия">
              <MoreIcon size={20} />
            </button>
          </div>
        ))}
        {list.length === 0 && <div className="empty">Никого не нашлось</div>}
      </div>

      <aside className="columns__side">
        <SideMenu items={menu.map((item, i) => ({ ...item, active: i === 0, accent: true }))} />
      </aside>
    </div>
  );
}
