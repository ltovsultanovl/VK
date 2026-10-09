import { useState } from "react";
import Modal from "../Modal";
import { useMusic } from "../../context/MusicContext";
import type { Track } from "../../types";

export default function EditTrackModal({
  track,
  onClose,
}: {
  track: Track;
  onClose: () => void;
}) {
  const { edit } = useMusic();
  const [artist, setArtist] = useState(track.artist);
  const [title, setTitle] = useState(track.title);
  const [saving, setSaving] = useState(false);
  const valid = title.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    if (await edit(track, { artist: artist.trim(), title: title.trim() }))
      onClose();
    else setSaving(false);
  };

  return (
    <Modal
      title="Редактирование аудиозаписи"
      onClose={onClose}
      width={420}
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn" form="edit-track" disabled={!valid || saving}>
            Сохранить
          </button>
        </>
      }
    >
      <form id="edit-track" className="media-form" onSubmit={submit}>
        <label className="media-form__label">
          Исполнитель
          <input
            className="field"
            maxLength={100}
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            autoFocus
          />
        </label>
        <label className="media-form__label">
          Название
          <input
            className="field"
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      </form>
    </Modal>
  );
}
