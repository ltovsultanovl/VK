import { useState } from "react";
import Stories from "../components/Stories";
import Composer from "../components/Composer";
import Post from "../components/Post";
import SideMenu from "../components/SideMenu";

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
        <SideMenu
          items={[
            ...tabs.map((label) => ({
              label,
              active: tab === label,
              onClick: () => setTab(label),
            })),
            "separator",
            ...extra,
          ]}
        />
      </aside>
    </div>
  );
}
