import { useMemo, useState } from "react";
import Composer from "../components/Composer";
import PostList from "../components/PostList";
import SideMenu from "../components/SideMenu";
import { useProfile } from "../context/ProfileContext";
import { useFriends } from "../context/FriendsContext";
import { usePosts } from "../resources";

const TABS = [
  { id: "news", label: "Новости" },
  { id: "all", label: "Все записи" },
  { id: "liked", label: "Понравилось" },
];

const EMPTY = {
  news: "В ленте пока пусто. Добавьте друзей — здесь появятся их записи",
  all: "Пока никто ничего не написал. Будьте первым!",
  liked: "Вы ещё не отметили ни одной записи",
};

export default function Feed() {
  const { myId } = useProfile();
  const { friends } = useFriends();
  const [tab, setTab] = useState("news");

  // Новости — записи на стенах друзей и на моей
  const ownerIds = useMemo(() => [myId, ...friends.map((f) => f.id)].sort(), [myId, friends]);
  const source = tab === "news" ? { feed: ownerIds } : tab === "all" ? { feed: null } : { liked: true };
  const feed = usePosts(source);

  return (
    <div className="columns">
      <div>
        {tab !== "liked" && <Composer onPublish={(data) => feed.publish({ ownerId: myId, ...data })} />}
        <PostList
          feed={feed}
          emptyText={EMPTY[tab]}
          emptyAction={
            tab === "news" && (
              <a className="btn" href="#friends/search">
                Найти друзей
              </a>
            )
          }
        />
      </div>

      <aside className="columns__side">
        <SideMenu
          items={TABS.map((t) => ({
            label: t.label,
            active: tab === t.id,
            onClick: () => setTab(t.id),
          }))}
        />
      </aside>
    </div>
  );
}
