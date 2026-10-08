import { useCallback, useMemo, useRef, useState } from "react";
import Avatar from "../components/Avatar";
import Composer from "../components/Composer";
import PostList from "../components/PostList";
import Modal from "../components/Modal";
import AvatarUploadModal from "../components/AvatarUploadModal";
import ProfileDetailsModal from "../components/ProfileDetailsModal";
import PhotoViewer from "../components/PhotoViewer";
import ConfirmModal from "../components/ConfirmModal";
import FriendButton from "../components/FriendButton";
import ShareModal from "../components/ShareModal";
import AlbumsTab from "../components/media/AlbumsTab";
import MusicTab from "../components/media/MusicTab";
import VideoTab from "../components/media/VideoTab";
import ArticlesTab from "../components/media/ArticlesTab";
import { useSnackbar } from "../components/Snackbar";
import {
  AlbumsIcon,
  ArticlesIcon,
  CameraIcon,
  CloseIcon,
  EducationIcon,
  InfoIcon,
  MapPinIcon,
  MessageIcon,
  MusicIcon,
  ShareIcon,
  PhotoIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  VideoIcon,
} from "../components/Icons";
import { useProfile } from "../context/ProfileContext";
import { useFriends } from "../context/FriendsContext";
import { useChat } from "../context/ChatContext";
import { useMedia } from "../context/MediaContext";
import { bg } from "../data";
import { formatEducation, fullName } from "../profile";
import { useDismiss, useDropdown, useFileDrop, useFilePicker } from "../hooks";
import { useFriendsOf, usePhotos, usePosts, useUserProfile } from "../resources";
import { explainError, removeImage, uploadImage } from "../api";
import { readImage } from "../utils";

const DEFAULT_COVER = "var(--cover-empty)";
const STATUS_LIMIT = 140;

// Удаляем старый файл аватара/обложки, только если он лежит в своей папке
// (аватаром может быть фото из альбома — его трогать нельзя)
const removeOld = (url, folder) => url?.includes(`/${folder}/`) && removeImage(url).catch(() => {});

// ---------- Обложка ----------
function Cover({ profile, editable }) {
  const { myId, updateProfile } = useProfile();
  const showSnackbar = useSnackbar();
  const menu = useDropdown();
  const [uploading, setUploading] = useState(false);
  const picker = useFilePicker({ accept: "image/*", onPick: ([file]) => upload(file) });

  const upload = async (file) => {
    setUploading(true);
    try {
      const dataUrl = await readImage(file, { max: 1600 });
      const { url } = await uploadImage(myId, dataUrl, "covers");
      const old = profile.cover;
      if (await updateProfile({ cover: url })) {
        removeOld(old, "covers");
        showSnackbar("Обложка обновлена");
      }
    } catch (e) {
      showSnackbar(explainError(e), "error");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    const old = profile.cover;
    if (await updateProfile({ cover: null })) {
      removeOld(old, "covers");
      showSnackbar("Обложка удалена");
    }
  };

  return (
    <div
      className="profile-cover"
      style={{ background: profile.cover ? bg(profile.cover, DEFAULT_COVER) : DEFAULT_COVER }}
    >
      {editable && (
        <div className="profile-cover__action" ref={menu.ref}>
          <button className="btn btn--overlay" onClick={menu.toggle} disabled={uploading}>
            <CameraIcon size={20} /> {uploading ? "Загрузка…" : "Изменить обложку"}
          </button>
          {menu.open && (
            <div className="dropdown dropdown--right">
              <button
                className="dropdown__item"
                onClick={() => {
                  menu.close();
                  picker.open();
                }}
              >
                <PhotoIcon /> Загрузить изображение
              </button>
              {profile.cover && (
                <button
                  className="dropdown__item"
                  onClick={() => {
                    menu.close();
                    remove();
                  }}
                >
                  <TrashIcon /> Удалить обложку
                </button>
              )}
            </div>
          )}
          {picker.input}
        </div>
      )}
    </div>
  );
}

// ---------- Аватар как в VK: клик открывает фото, у своего при наведении — «Обновить / Удалить» ----------
function ProfileAvatar({ profile, editable, owner, album }) {
  const { updateProfile } = useProfile();
  const { onlineIds } = useChat();
  const showSnackbar = useSnackbar();
  const [modal, setModal] = useState(null); // 'upload' | 'delete'
  const [viewerIndex, setViewerIndex] = useState(null);

  // Аватар — это одно из фото со страницы: открываем просмотр на нём и даём листать остальные.
  // Старый аватар без записи в «Фото» показываем отдельно, без лайков и комментариев
  const avatarIndex = album.photos.findIndex((p) => p.src === profile.avatar);
  const viewerPhotos =
    avatarIndex >= 0
      ? album.photos
      : [{ id: "avatar", src: profile.avatar, createdAt: null, likes: 0, liked: false, comments: [], readOnly: true }];

  const open = () => {
    if (profile.avatar) setViewerIndex(avatarIndex >= 0 ? avatarIndex : 0);
    else if (editable) setModal("upload");
  };

  return (
    <div className="profile-info__avatar">
      <div className={`avatar-frame ${editable && profile.avatar ? "avatar-frame--editable" : ""}`}>
        <button
          className="avatar-open"
          onClick={open}
          disabled={!profile.avatar && !editable}
          title={profile.avatar ? "Открыть фотографию" : editable ? "Загрузить фотографию" : undefined}
        >
          <Avatar
            name={fullName(profile)}
            color={profile.color}
            src={profile.avatar}
            size={148}
            online={!editable && onlineIds.has(profile.id)}
          />
          {editable && !profile.avatar && (
            <span className="avatar-edit__overlay">
              <CameraIcon size={28} />
            </span>
          )}
        </button>

        {editable && profile.avatar && (
          <div className="avatar-actions">
            <button onClick={() => setModal("upload")}>Обновить фотографию</button>
            <button onClick={() => setModal("delete")}>Удалить</button>
          </div>
        )}
      </div>

      {editable && (
        <button
          className="avatar-add"
          onClick={() => setModal("upload")}
          title="Обновить фотографию"
          aria-label="Обновить фотографию"
        >
          <PlusIcon size={16} />
        </button>
      )}

      {viewerIndex !== null && viewerPhotos[viewerIndex] && (
        <PhotoViewer
          photos={viewerPhotos}
          index={viewerIndex}
          owner={owner}
          album="Фотографии со страницы"
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          onDelete={album.remove}
          onToggleLike={album.toggleLike}
          onComment={album.comment}
          onDeleteComment={album.deleteComment}
        />
      )}

      {modal === "upload" && <AvatarUploadModal onClose={() => setModal(null)} onSaved={album.addLocal} />}

      {modal === "delete" && (
        <ConfirmModal
          title="Удаление фотографии"
          text="Фотография исчезнет с аватара. В разделе «Фото» она останется — удалить её совсем можно там."
          onConfirm={async () => {
            setModal(null);
            const old = profile.avatar;
            if (await updateProfile({ avatar: null })) {
              removeOld(old, "avatars"); // файл удаляем, только если это старый отдельный аватар
              showSnackbar("Фотография убрана с аватара");
            }
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ---------- Статус: свой редактируется по клику ----------
function Status({ profile, editable }) {
  const { updateProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(profile.status);
  const ref = useRef(null);
  const cancel = useCallback(() => setEditing(false), []);
  useDismiss(ref, editing, cancel);

  if (!editable) {
    return profile.status ? <div className="profile-info__status">{profile.status}</div> : null;
  }

  const start = () => {
    setValue(profile.status);
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setEditing(false);
    await updateProfile({ status: value.trim() });
  };

  if (!editing) {
    return (
      <div
        className={`profile-info__status status ${profile.status ? "" : "status--empty"}`}
        onClick={start}
        title="Изменить статус"
      >
        {profile.status || "Установить статус"}
      </div>
    );
  }

  return (
    <form className="status-editor" ref={ref} onSubmit={save}>
      <input
        className="field"
        autoFocus
        value={value}
        maxLength={STATUS_LIMIT}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Введите статус"
      />
      <div className="status-editor__footer">
        <span className="muted">{STATUS_LIMIT - value.length}</span>
        <button type="button" className="btn btn--tertiary" onClick={cancel}>
          Отмена
        </button>
        <button className="btn">Сохранить</button>
      </div>
    </form>
  );
}

// ---------- Медиа: фото (с сервера) и личные вкладки (только на своей странице) ----------
const MEDIA_TABS = [
  { id: "photos", label: "Фото", Icon: PhotoIcon },
  { id: "albums", label: "Альбомы", Icon: AlbumsIcon, own: true },
  { id: "music", label: "Музыка", Icon: MusicIcon, own: true },
  { id: "video", label: "Видео", Icon: VideoIcon, own: true },
  { id: "articles", label: "Статьи", Icon: ArticlesIcon, own: true },
];
const PHOTOS_PREVIEW = 6;

// Плитка фото: клик открывает просмотр, ✕ в углу — удаление (только своих)
function PhotoTile({ photo, onOpen, onDelete }) {
  return (
    <div className="media__photo">
      <button
        className="media__photo-open"
        style={{ background: bg(photo.src, "var(--field-bg)") }}
        onClick={onOpen}
        aria-label="Открыть фотографию"
      />
      {onDelete && (
        <button
          className="media__photo-delete"
          onClick={onDelete}
          title="Удалить фотографию"
          aria-label="Удалить фотографию"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}

function MediaCard({ owner, isMe, album }) {
  const showSnackbar = useSnackbar();
  const { photos } = album;
  const [tab, setTab] = useState("photos");
  const [allOpen, setAllOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const { tracks, setTracks, videos, setVideos } = useMedia();
  const tabs = MEDIA_TABS.filter((t) => isMe || !t.own);
  const visible = photos.slice(0, PHOTOS_PREVIEW);

  const upload = async (files) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) {
      showSnackbar("Выберите изображение в формате JPG, PNG или GIF", "error");
      return;
    }
    setUploading(true);
    setTab("photos");
    const { added, failed, error } = await album.upload(images);
    setUploading(false);

    if (failed && added) {
      showSnackbar(`Загружено ${added} из ${images.length}: ${error}`, "error");
    } else if (failed) {
      showSnackbar(error, "error");
    } else {
      showSnackbar(added > 1 ? `Загружено фотографий: ${added}` : "Фотография загружена");
    }
  };

  const picker = useFilePicker({ accept: "image/*", multiple: true, onPick: upload });
  const [dragOver, dropProps] = useFileDrop(upload);
  const uploadLabel = uploading ? "Загрузка…" : "Загрузить фото";
  const askDelete = isMe ? (photo) => () => setToDelete(photo) : () => null;

  return (
    <section
      className={`card media ${dragOver && isMe ? "media--drag" : ""}`}
      {...(isMe ? dropProps : {})}
    >
      <div className="media__tabs" role="tablist">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`seg media__tab ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            <Icon size={20} />
            {label}
            {id === "photos" && photos.length > 0 && <span className="media__count">{photos.length}</span>}
          </button>
        ))}
      </div>

      {tab === "photos" ? (
        <>
          {album.loading && !album.data ? (
            <div className="media__empty" role="status">
              <div className="chat-status__spinner" />
            </div>
          ) : album.error && !album.data ? (
            <div className="media__empty" role="alert">
              Не удалось загрузить фото: {album.error}
              <button className="btn btn--neutral" onClick={album.reload}>
                Повторить
              </button>
            </div>
          ) : photos.length > 0 ? (
            <div className="media__photos">
              {visible.map((p, i) => (
                <PhotoTile key={p.id} photo={p} onOpen={() => setViewerIndex(i)} onDelete={askDelete(p)} />
              ))}
            </div>
          ) : (
            <div className="media__empty">
              <PhotoIcon size={32} />
              {isMe
                ? "Здесь пока нет фотографий — загрузите первую или перетащите файлы сюда"
                : `${owner.firstName} пока не добавил(а) фотографии`}
            </div>
          )}

          {(isMe || photos.length > PHOTOS_PREVIEW) && (
            <div className={`media__actions ${isMe ? "" : "media__actions--single"}`}>
              {isMe && (
                <button className="btn btn--neutral" onClick={picker.open} disabled={uploading}>
                  {uploadLabel}
                </button>
              )}
              <button className="btn btn--neutral" onClick={() => setAllOpen(true)}>
                Показать всё
              </button>
            </div>
          )}
          {isMe && picker.input}
        </>
      ) : tab === "albums" ? (
        <AlbumsTab />
      ) : tab === "music" ? (
        <MusicTab tracks={tracks} onChange={setTracks} />
      ) : tab === "video" ? (
        <VideoTab videos={videos} onChange={setVideos} />
      ) : (
        <ArticlesTab />
      )}

      {dragOver && isMe && <div className="media__drop">Отпустите, чтобы загрузить фото</div>}

      {viewerIndex !== null && photos[viewerIndex] && (
        <PhotoViewer
          photos={photos}
          index={viewerIndex}
          owner={owner}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          onDelete={album.remove}
          onToggleLike={album.toggleLike}
          onComment={album.comment}
          onDeleteComment={album.deleteComment}
        />
      )}

      {allOpen && (
        <Modal
          title={
            <>
              Фотографии · {owner.name} <span className="muted">{photos.length}</span>
            </>
          }
          onClose={() => setAllOpen(false)}
          width={760}
          footer={
            isMe && (
              <button className="btn" onClick={picker.open} disabled={uploading}>
                {uploadLabel}
              </button>
            )
          }
        >
          {photos.length > 0 ? (
            <div className="photos-all">
              {photos.map((p, i) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  onOpen={() => {
                    setAllOpen(false);
                    setViewerIndex(i);
                  }}
                  onDelete={askDelete(p)}
                />
              ))}
            </div>
          ) : (
            <div className="media__empty">
              <PhotoIcon size={32} />
              Здесь пока нет фотографий
            </div>
          )}
        </Modal>
      )}

      {toDelete && (
        <ConfirmModal
          title="Удаление фотографии"
          text="Вы действительно хотите удалить эту фотографию?"
          onConfirm={() => {
            album.remove(toDelete);
            setToDelete(null);
          }}
          onClose={() => setToDelete(null)}
        />
      )}
    </section>
  );
}

// ---------- «Создать пост»: свёрнутая кнопка раскрывается в редактор ----------
function CreatePost({ owner, isMe, onPublish }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <Composer
        autoFocus
        placeholder={isMe ? "Что у вас нового?" : "Напишите что-нибудь на стене…"}
        onPublish={async (data) => {
          const ok = await onPublish({ ownerId: owner.id, ...data });
          if (ok) setOpen(false);
          return ok;
        }}
        onCancel={() => setOpen(false)}
      />
    );
  }

  return (
    <div className="card create-post">
      <button className="create-post__main" onClick={() => setOpen(true)}>
        <PlusIcon size={22} />
        {isMe ? "Создать пост" : "Написать на стене"}
      </button>
    </div>
  );
}

// ---------- Стена ----------
const WALL_TABS = [
  { id: "all", label: "Все записи" },
  { id: "own", label: "Записи владельца" },
];

function Wall({ owner, isMe, feed }) {
  const [tab, setTab] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // Фильтры по вкладке и поиску — поверх загруженной стены
  const view = useMemo(
    () => ({
      ...feed,
      posts: feed.posts
        .filter((p) => tab === "all" || p.author.id === owner.id)
        .filter((p) => !q || p.text.toLowerCase().includes(q)),
    }),
    [feed, tab, q, owner.id],
  );

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <>
      <div className="card wall-head">
        {searchOpen ? (
          <div className="wall-search">
            <SearchIcon size={20} />
            <input
              autoFocus
              placeholder="Поиск по записям"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && closeSearch()}
            />
            <button className="btn btn--tertiary" onClick={closeSearch}>
              Отмена
            </button>
          </div>
        ) : (
          <>
            <div className="wall-tabs">
              {WALL_TABS.map((t) => (
                <button
                  key={t.id}
                  className={`seg ${tab === t.id ? "active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.id === "own" && isMe ? "Мои записи" : t.label}
                </button>
              ))}
            </div>
            <button className="icon-btn" title="Поиск по записям" onClick={() => setSearchOpen(true)}>
              <SearchIcon size={20} />
            </button>
          </>
        )}
      </div>

      <PostList
        feed={view}
        emptyText={q ? "По вашему запросу ничего не найдено" : "На стене пока нет ни одной записи"}
      />
    </>
  );
}

// ---------- Друзья человека (правая колонка) ----------
function FriendsCard({ owner, isMe }) {
  const mine = useFriends();
  const theirs = useFriendsOf(isMe ? null : owner.id);
  const friends = isMe ? mine.friends : theirs.data ?? [];
  const loading = isMe ? mine.status === "loading" : theirs.loading && !theirs.data;

  return (
    <section className="card">
      <a className="card__header card__header--link" href={isMe ? "#friends" : undefined}>
        Друзья <span className="muted">{loading ? "" : friends.length}</span>
      </a>
      {loading ? (
        <div className="media__empty" role="status">
          <div className="chat-status__spinner" />
        </div>
      ) : friends.length ? (
        <div className="friends-mini friends-mini--wide">
          {friends.slice(0, 8).map((p) => (
            <a key={p.id} href={`#user/${p.id}`}>
              <Avatar name={p.name} color={p.color} src={p.avatar} size={64} />
              <span>{p.firstName}</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="friends-empty">
          {isMe ? (
            <>
              Пока нет друзей. <a href="#friends/search">Найти знакомых</a>
            </>
          ) : (
            "Пока нет друзей"
          )}
        </div>
      )}
    </section>
  );
}

// ---------- Страница ----------
export default function Profile({ userId, onNavigate }) {
  const { myId, profile: myProfile } = useProfile();
  const { relationTo } = useFriends();
  const { openChat } = useChat();
  const isMe = userId === myId;
  const other = useUserProfile(isMe ? myId : userId);
  const profile = isMe ? myProfile : other.data;
  const feed = usePosts({ wall: userId });
  const album = usePhotos(userId); // общий для аватара и блока «Фото»
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!isMe && other.loading && !other.data) {
    return (
      <div className="card list-state" role="status">
        <div className="chat-status__spinner" />
        Загружаем страницу…
      </div>
    );
  }

  if (!isMe && other.error) {
    return (
      <div className="card list-state" role="alert">
        Не удалось загрузить страницу: {other.error}
        <button className="btn" onClick={other.reload}>
          Повторить
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card list-state">
        Такой страницы нет — возможно, пользователь удалил аккаунт.
        <a className="btn" href="#feed">
          В ленту
        </a>
      </div>
    );
  }

  const name = fullName(profile);
  const person = { id: profile.id, name, firstName: profile.firstName, color: profile.color, avatar: profile.avatar };
  const education = formatEducation(profile.education);
  const canPost = isMe || relationTo(userId) === "friend";

  return (
    <>
      <div className="card profile-head">
        <Cover profile={profile} editable={isMe} />
        <div className="profile-info">
          <ProfileAvatar profile={profile} editable={isMe} owner={person} album={album} />
          <div className="profile-info__meta">
            <h1 className="profile-info__name">{name}</h1>
            <Status profile={profile} editable={isMe} />
            <div className="profile-info__details">
              {profile.contacts.city && (
                <span className="profile-info__chip">
                  <MapPinIcon size={20} />
                  {profile.contacts.city}
                </span>
              )}
              {education && (
                <span className="profile-info__chip">
                  <EducationIcon size={20} />
                  {education}
                </span>
              )}
              <button
                className="profile-info__chip profile-info__more"
                onClick={() => setDetailsOpen(true)}
              >
                <InfoIcon size={20} />
                Подробнее
              </button>
            </div>
          </div>
          <div className="profile-info__actions">
            {isMe ? (
              <button className="btn btn--neutral" onClick={() => onNavigate("edit")}>
                Редактировать профиль
              </button>
            ) : (
              <>
                <FriendButton person={person} />
                <button
                  className="btn btn--neutral"
                  onClick={() => {
                    openChat(person);
                    onNavigate("messages");
                  }}
                >
                  <MessageIcon size={18} />
                  Сообщение
                </button>
              </>
            )}
            <button className="btn btn--neutral btn--icon" title="Поделиться страницей" onClick={() => setSharing(true)}>
              <ShareIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {sharing && (
        <ShareModal
          shared={{ type: "profile", id: profile.id }}
          link={`#user/${profile.id}`}
          onClose={() => setSharing(false)}
        />
      )}

      {detailsOpen && (
        <ProfileDetailsModal
          profile={profile}
          onClose={() => setDetailsOpen(false)}
          onEdit={
            isMe &&
            (() => {
              setDetailsOpen(false);
              onNavigate("edit");
            })
          }
        />
      )}

      <div className="columns columns--profile">
        <div>
          <MediaCard owner={person} isMe={isMe} album={album} />
          {canPost && <CreatePost owner={person} isMe={isMe} onPublish={feed.publish} />}
          <Wall owner={person} isMe={isMe} feed={feed} />
        </div>

        <aside className="columns__side">
          <FriendsCard owner={person} isMe={isMe} />
        </aside>
      </div>
    </>
  );
}
