import { useState } from "react";
import Modal from "../Modal";
import ConfirmModal from "../ConfirmModal";
import AddButton from "./AddButton";
import MediaEmpty from "./MediaEmpty";
import { AlbumsIcon, CloseIcon } from "../Icons";
import { useSnackbar } from "../Snackbar";
import { useStoredState } from "../../hooks";
import { useProfile } from "../../context/ProfileContext";
import { formatDate } from "../../utils";

const TITLE_LIMIT = 64;

function NewAlbumModal({ onCreate, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const valid = title.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onCreate({ title: title.trim(), description: description.trim() });
  };

  return (
    <Modal
      title="Новый альбом"
      onClose={onClose}
      width={440}
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn" form="new-album" disabled={!valid}>
            Создать альбом
          </button>
        </>
      }
    >
      <form id="new-album" className="media-form" onSubmit={submit}>
        <label className="media-form__label">
          Название
          <input
            className="field"
            autoFocus
            maxLength={TITLE_LIMIT}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, «Лето 2026»"
          />
        </label>
        <label className="media-form__label">
          Описание
          <textarea
            className="field field--textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Необязательно"
          />
        </label>
      </form>
    </Modal>
  );
}

export default function AlbumsTab() {
  const showSnackbar = useSnackbar();
  const { myId } = useProfile();
  const [albums, setAlbums] = useStoredState(`albums:${myId}`, []);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const create = (data) => {
    setAlbums((list) => [
      { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data },
      ...list,
    ]);
    setCreating(false);
    showSnackbar("Альбом создан");
  };

  return (
    <>
      {albums.length > 0 ? (
        <div className="albums">
          {albums.map((a) => (
            <div key={a.id} className="album">
              <div className="album__cover">
                <AlbumsIcon size={36} />
                <button
                  className="media__photo-delete"
                  onClick={() => setToDelete(a)}
                  title="Удалить альбом"
                  aria-label="Удалить альбом"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <div className="album__title">{a.title}</div>
              <div className="album__meta">{a.description || formatDate(a.createdAt)}</div>
            </div>
          ))}
        </div>
      ) : (
        <MediaEmpty Icon={AlbumsIcon}>Альбомов пока нет</MediaEmpty>
      )}

      <AddButton onClick={() => setCreating(true)}>Создать альбом</AddButton>

      {creating && <NewAlbumModal onCreate={create} onClose={() => setCreating(false)} />}

      {toDelete && (
        <ConfirmModal
          title="Удаление альбома"
          text={`Удалить альбом «${toDelete.title}»?`}
          onConfirm={() => {
            setAlbums((list) => list.filter((a) => a.id !== toDelete.id));
            setToDelete(null);
            showSnackbar("Альбом удалён");
          }}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}
