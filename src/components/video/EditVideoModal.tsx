import { useState } from "react";
import Modal from "../Modal";
import type { Video } from "../../types";

export default function EditVideoModal({
  video,
  onSave,
  onDelete,
  onClose,
}: {
  video: Video;
  onSave: (data: { title: string; description: string }) => Promise<boolean>;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [saving, setSaving] = useState(false);
  const valid = title.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    if (
      !(await onSave({ title: title.trim(), description: description.trim() }))
    )
      setSaving(false);
  };

  return (
    <Modal
      title="Редактирование видео"
      onClose={onClose}
      width={460}
      footer={
        <>
          <button
            className="btn btn--tertiary album-modal__delete"
            onClick={onDelete}
          >
            Удалить видео
          </button>
          <button className="btn btn--secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn" form="edit-video" disabled={!valid || saving}>
            Сохранить
          </button>
        </>
      }
    >
      <form id="edit-video" className="media-form" onSubmit={submit}>
        <label className="media-form__label">
          Название
          <input
            className="field"
            autoFocus
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="media-form__label">
          Описание
          <textarea
            className="field field--textarea"
            rows={4}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </form>
    </Modal>
  );
}
