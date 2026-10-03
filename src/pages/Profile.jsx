import { useCallback, useRef, useState } from "react";
import Avatar from "../components/Avatar";
import MeAvatar from "../components/MeAvatar";
import Composer from "../components/Composer";
import Post from "../components/Post";
import Modal from "../components/Modal";
import AvatarUploadModal from "../components/AvatarUploadModal";
import ProfileDetailsModal from "../components/ProfileDetailsModal";
import PhotoViewer from "../components/PhotoViewer";
import ConfirmModal from "../components/ConfirmModal";
import AlbumsTab from "../components/media/AlbumsTab";
import MusicTab from "../components/media/MusicTab";
import VideoTab from "../components/media/VideoTab";
import ArticlesTab from "../components/media/ArticlesTab";
import { useSnackbar } from "../components/Snackbar";
import {
  AlbumsIcon,
  ArticlesIcon,
  CameraIcon,
  ChevronDownIcon,
  ClipsIcon,
  CloseIcon,
  EducationIcon,
  InfoIcon,
  MapPinIcon,
  MusicIcon,
  PhotoIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  VideoIcon,
} from "../components/Icons";
import { useProfile } from "../context/ProfileContext";
import { useMedia } from "../context/MediaContext";
import { bg, communities, people } from "../data";
import { formatEducation } from "../profile";
import { useDismiss, useDropdown, useFileDrop, useFilePicker, usePhotos } from "../hooks";
import { readImage } from "../utils";

const DEFAULT_COVER = "var(--cover-empty)";
const STATUS_LIMIT = 140;

// ---------- Обложка ----------
function Cover() {
  const { profile, updateProfile } = useProfile();
  const showSnackbar = useSnackbar();
  const menu = useDropdown();
  const picker = useFilePicker({ accept: "image/*", onPick: ([file]) => upload(file) });

  const upload = async (file) => {
    try {
      updateProfile({ cover: await readImage(file, { max: 1600 }) });
      showSnackbar("Обложка обновлена");
    } catch (e) {
      showSnackbar(e.message, "error");
    }
  };

  return (
    <div
      className="profile-cover"
      style={{
        background: profile.cover
          ? bg(profile.cover, DEFAULT_COVER)
          : DEFAULT_COVER,
      }}
    >
      <div className="profile-cover__action" ref={menu.ref}>
        <button className="btn btn--overlay" onClick={menu.toggle}>
          <CameraIcon size={20} /> Изменить обложку
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
                  updateProfile({ cover: null });
                  showSnackbar("Обложка удалена");
                }}
              >
                <TrashIcon /> Удалить обложку
              </button>
            )}
          </div>
        )}
        {picker.input}
      </div>
    </div>
  );
}

// ---------- Аватар с меню при наведении ----------
function ProfileAvatar() {
  const { profile, updateProfile } = useProfile();
  const showSnackbar = useSnackbar();
  const menu = useDropdown();
  const [modal, setModal] = useState(null); // 'upload' | 'delete'

  const open = (name) => {
    menu.close();
    setModal(name);
  };

  return (
    <div className="profile-info__avatar" ref={menu.ref}>
      <button className="avatar-edit" onClick={menu.toggle} title="Изменить фотографию">
        <MeAvatar size={148} />
        <span className="avatar-edit__overlay">
          <CameraIcon size={28} />
        </span>
      </button>
      <button
        className="avatar-add"
        onClick={() => open("upload")}
        title="Обновить фотографию"
        aria-label="Обновить фотографию"
      >
        <PlusIcon size={16} />
      </button>

      {menu.open && (
        <div className="dropdown dropdown--left">
          <button className="dropdown__item" onClick={() => open("upload")}>
            <PhotoIcon /> Обновить фотографию
          </button>
          {profile.avatar && (
            <button className="dropdown__item" onClick={() => open("delete")}>
              <TrashIcon /> Удалить фотографию
            </button>
          )}
        </div>
      )}

      {modal === "upload" && (
        <AvatarUploadModal onClose={() => setModal(null)} />
      )}

      {modal === "delete" && (
        <ConfirmModal
          title="Удаление фотографии"
          text="Вы действительно хотите удалить фотографию?"
          onConfirm={() => {
            updateProfile({ avatar: null });
            setModal(null);
            showSnackbar("Фотография удалена");
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ---------- Статус: редактирование по клику ----------
function Status() {
  const { profile, updateProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(profile.status);
  const ref = useRef(null);
  const cancel = useCallback(() => setEditing(false), []);
  useDismiss(ref, editing, cancel);

  const start = () => {
    setValue(profile.status);
    setEditing(true);
  };

  const save = (e) => {
    e.preventDefault();
    updateProfile({ status: value.trim() });
    setEditing(false);
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

// ---------- Медиа: фото, альбомы, музыка… ----------
const MEDIA_TABS = [
  { id: "photos", label: "Фото", Icon: PhotoIcon },
  { id: "albums", label: "Альбомы", Icon: AlbumsIcon },
  { id: "music", label: "Музыка", Icon: MusicIcon },
  { id: "video", label: "Видео", Icon: VideoIcon },
  { id: "articles", label: "Статьи", Icon: ArticlesIcon },
];
const PHOTOS_PREVIEW = 6;

// Плитка фото: клик открывает просмотр, ✕ в углу — удаление
function PhotoTile({ photo, onOpen, onDelete }) {
  return (
    <div className="media__photo">
      <button
        className="media__photo-open"
        style={{ background: bg(photo.src, "var(--field-bg)") }}
        onClick={onOpen}
        aria-label="Открыть фотографию"
      />
      <button
        className="media__photo-delete"
        onClick={onDelete}
        title="Удалить фотографию"
        aria-label="Удалить фотографию"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}

function MediaCard() {
  const showSnackbar = useSnackbar();
  const { photos, addPhotos, removePhoto, updatePhoto } = usePhotos();
  const [tab, setTab] = useState("photos");
  const [allOpen, setAllOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const { tracks, setTracks, videos, setVideos } = useMedia();
  const visible = photos.slice(0, PHOTOS_PREVIEW);

  const upload = async (files) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) {
      showSnackbar("Выберите изображение в формате JPG, PNG или GIF", "error");
      return;
    }
    setUploading(true);
    const results = await Promise.allSettled(
      images.map((file) => readImage(file, { max: 1000, quality: 0.8 })),
    );
    setUploading(false);

    const added = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const failed = results.length - added.length;
    if (added.length) {
      addPhotos(added);
      setTab("photos");
    }
    if (failed && added.length) {
      showSnackbar(`Загружено ${added.length} из ${results.length}: часть файлов не удалось прочитать`, "error");
    } else if (failed) {
      showSnackbar(results[0].reason.message, "error");
    } else {
      showSnackbar(
        added.length > 1 ? `Загружено фотографий: ${added.length}` : "Фотография загружена",
      );
    }
  };

  const remove = (id) => {
    removePhoto(id);
    showSnackbar("Фотография удалена");
  };

  const picker = useFilePicker({ accept: "image/*", multiple: true, onPick: upload });
  const [dragOver, dropProps] = useFileDrop(upload);
  const uploadLabel = uploading ? "Загрузка…" : "Загрузить фото";

  return (
    <section className={`card media ${dragOver ? "media--drag" : ""}`} {...dropProps}>
      <div className="media__tabs" role="tablist">
        {MEDIA_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`seg media__tab ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            <Icon size={20} />
            {label}
            {id === "photos" && photos.length > 0 && (
              <span className="media__count">{photos.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "photos" ? (
        <>
          {photos.length > 0 ? (
            <div className="media__photos">
              {visible.map((p, i) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  onOpen={() => setViewerIndex(i)}
                  onDelete={() => setToDelete(p.id)}
                />
              ))}
            </div>
          ) : (
            <div className="media__empty">
              <PhotoIcon size={32} />
              Здесь пока нет фотографий — загрузите первую или перетащите файлы сюда
            </div>
          )}

          <div className="media__actions">
            <button className="btn btn--neutral" onClick={picker.open} disabled={uploading}>
              {uploadLabel}
            </button>
            <button className="btn btn--neutral" onClick={() => setAllOpen(true)}>
              Показать всё
            </button>
          </div>
          {picker.input}
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

      {dragOver && <div className="media__drop">Отпустите, чтобы загрузить фото</div>}

      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          onDelete={remove}
          onUpdate={updatePhoto}
        />
      )}

      {allOpen && (
        <Modal
          title={
            <>
              Фотографии <span className="muted">{photos.length}</span>
            </>
          }
          onClose={() => setAllOpen(false)}
          width={760}
          footer={
            <button className="btn" onClick={picker.open} disabled={uploading}>
              {uploadLabel}
            </button>
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
                  onDelete={() => setToDelete(p.id)}
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
            remove(toDelete);
            setToDelete(null);
          }}
          onClose={() => setToDelete(null)}
        />
      )}
    </section>
  );
}

// ---------- «Создать пост»: свёрнутая кнопка раскрывается в редактор ----------
function CreatePost({ onPublish }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <Composer
        autoFocus
        onPublish={(text) => {
          onPublish(text);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    );
  }

  return (
    <div className="card create-post">
      <button className="create-post__main" onClick={() => setOpen(true)}>
        <PlusIcon size={22} />
        Создать пост
      </button>
      <span className="create-post__divider" />
      <button className="icon-btn" title="Клип">
        <ClipsIcon />
      </button>
      <button className="icon-btn" title="Статья">
        <ArticlesIcon />
      </button>
    </div>
  );
}

// ---------- Стена ----------
const WALL_TABS = [
  { id: "all", label: "Все записи" },
  { id: "mine", label: "Мои записи" },
];

function Wall({ posts, postActions }) {
  const [tab, setTab] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // На стене — мои записи и записи друзей; закреплённая всегда первая
  const wallPosts = posts
    .filter((p) => p.mine || p.wall)
    .filter((p) => tab === "all" || p.mine)
    .filter((p) => !q || p.text?.toLowerCase().includes(q))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

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
                  {t.label}
                </button>
              ))}
            </div>
            <button
              className="icon-btn"
              title="Поиск по записям"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon size={20} />
            </button>
          </>
        )}
      </div>

      {wallPosts.length > 0 ? (
        wallPosts.map((post) => <Post key={post.id} post={post} {...postActions} />)
      ) : (
        <div className="card empty">
          {q ? "По вашему запросу ничего не найдено" : "На стене пока нет ни одной записи"}
        </div>
      )}
    </>
  );
}

// ---------- Страница ----------

export default function Profile({ posts, postActions, onNavigate }) {
  const { profile, name } = useProfile();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const education = formatEducation(profile.education);

  return (
    <>
      <div className="card profile-head">
        <Cover />
        <div className="profile-info">
          <ProfileAvatar />
          <div className="profile-info__meta">
            <h1 className="profile-info__name">{name}</h1>
            <Status />
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
            <button className="btn btn--neutral" onClick={() => onNavigate("edit")}>
              Редактировать профиль
            </button>
            <button className="btn btn--neutral">
              Ещё
              <ChevronDownIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {detailsOpen && (
        <ProfileDetailsModal
          onClose={() => setDetailsOpen(false)}
          onEdit={() => {
            setDetailsOpen(false);
            onNavigate("edit");
          }}
        />
      )}

      <div className="columns columns--profile">
        <div>
          <MediaCard />
          <CreatePost onPublish={postActions.onPublish} />

          <Wall posts={posts} postActions={postActions} />
        </div>

        <aside className="columns__side">
          <section className="card">
            <div className="card__header">
              Друзья <span className="muted">{people.length}</span>
            </div>
            <div className="friends-mini friends-mini--wide">
              {people.slice(0, 8).map((p) => (
                <a key={p.id} href="#friends">
                  <Avatar name={p.name} color={p.color} size={64} />
                  <span>{p.name.split(" ")[0]}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card__header">
              Подписки <span className="muted">{communities.length}</span>
            </div>
            <div className="subs-list">
              {communities.map((c) => (
                <div key={c.id} className="subs-item">
                  <Avatar name={c.name} color={c.color} size={40} />
                  <div>
                    <div className="subs-item__name">{c.name}</div>
                    <div className="subs-item__desc">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
