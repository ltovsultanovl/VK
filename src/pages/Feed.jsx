import { useState } from "react";
import Stories from "../components/Stories";
import Composer from "../components/Composer";
import Post from "../components/Post";

const tabs = ["Новости", "Рекомендации", "Поиск", "Понравилось"];
const extra = [{ label: "Обновления", counter: 4 }, { label: "Комментарии" }];

export default function Feed({ posts, postActions }) {
  const [tab, setTab] = useState(tabs[0]);
  const visible = tab === "Понравилось" ? posts.filter((p) => p.liked) : posts;

  return (
    <div className="columns">
      <div>
        <Stories />
        <Composer onPublish={postActions.onPublish} />
        {visible.map((post) => (
          <Post key={post.id} post={post} {...postActions} />
        ))}
        {visible.length === 0 && (
          <div className="card empty">Здесь пока пусто</div>
        )}
      </div>

      <aside className="columns__side">
        <div className="card side-menu">
          {tabs.map((label) => (
            <div
              key={label}
              className={`side-menu__item ${tab === label ? "active" : ""}`}
              onClick={() => setTab(label)}
            >
              {label}
            </div>
          ))}
          <div className="separator" />
          {extra.map(({ label, counter }) => (
            <div key={label} className="side-menu__item">
              {label}
              {counter && <span className="counter">{counter}</span>}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
