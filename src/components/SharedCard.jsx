import Avatar from "./Avatar";
import { useProfile } from "../context/ProfileContext";
import { useResource } from "../resources";
import { fetchPhoto, fetchPost, fetchProfile } from "../api";
import { fullName } from "../profile";
import { formatDate } from "../utils";

// Один и тот же пост в переписке могут прислать несколько раз — грузим его один раз
const cache = new Map();

function useShared(type, id, myId) {
  const key = `${type}:${id}`;
  return useResource(async () => {
    if (cache.has(key)) return cache.get(key);
    const value =
      type === "post" ? await fetchPost(id, myId) : type === "photo" ? await fetchPhoto(id) : await fetchProfile(id);
    cache.set(key, value);
    return value;
  }, [key]);
}

// Карточка того, чем поделились в чате: запись, фото или страница человека
export default function SharedCard({ shared }) {
  const { myId } = useProfile();
  const { data, loading, error, reload } = useShared(shared.type, shared.id, myId);

  if (loading && !data) {
    return (
      <div className="shared shared--state">
        <div className="chat-status__spinner" />
      </div>
    );
  }
  if (error) {
    return (
      <button type="button" className="shared shared--state" onClick={reload}>
        Не удалось загрузить. Нажмите, чтобы повторить
      </button>
    );
  }
  if (!data) {
    const what = { post: "Запись удалена", photo: "Фотография удалена", profile: "Страница удалена" }[shared.type];
    return <div className="shared shared--state">{what} или недоступна</div>;
  }

  if (shared.type === "post") {
    const post = data;
    return (
      <a className="shared" href={`#user/${post.ownerId}`}>
        <span className="shared__head">
          <Avatar name={post.author.name} color={post.author.color} src={post.author.avatar} size={32} />
          <span>
            <span className="shared__name">{post.author.name}</span>
            <span className="shared__meta">Запись · {formatDate(post.createdAt)}</span>
          </span>
        </span>
        {post.text && <span className="shared__text">{post.text}</span>}
        {post.image && <img className="shared__image" src={post.image} alt="" loading="lazy" />}
      </a>
    );
  }

  if (shared.type === "photo") {
    const photo = data;
    return (
      <a className="shared" href={`#user/${photo.owner.id}`}>
        <img className="shared__image shared__image--photo" src={photo.src} alt="" loading="lazy" />
        <span className="shared__meta">Фотография · {photo.owner.name}</span>
      </a>
    );
  }

  const profile = data;
  return (
    <a className="shared shared--profile" href={`#user/${profile.id}`}>
      <Avatar name={fullName(profile)} color={profile.color} src={profile.avatar} size={48} />
      <span>
        <span className="shared__name">{fullName(profile)}</span>
        <span className="shared__meta">{profile.contacts.city || "Страница ВКонтакте"}</span>
        <span className="shared__open">Открыть страницу</span>
      </span>
    </a>
  );
}
