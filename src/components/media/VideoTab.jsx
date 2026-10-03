import { useRef, useState } from "react";
import ConfirmModal from "../ConfirmModal";
import AddButton from "./AddButton";
import MediaEmpty from "./MediaEmpty";
import { CloseIcon, VideoIcon } from "../Icons";
import { useSnackbar } from "../Snackbar";

// videos живут в MediaCard; файлы — object URL, до перезагрузки страницы
export default function VideoTab({ videos, onChange }) {
  const showSnackbar = useSnackbar();
  const inputRef = useRef(null);
  const [toDelete, setToDelete] = useState(null);

  const add = (files) => {
    const list = [...files].filter((f) => f.type.startsWith("video/"));
    if (!list.length) {
      showSnackbar("Выберите видеофайл: MP4, MOV или WEBM");
      return;
    }
    onChange((prev) => [
      ...list.map((file) => ({
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, ""),
        url: URL.createObjectURL(file),
      })),
      ...prev,
    ]);
    showSnackbar(list.length > 1 ? `Добавлено видео: ${list.length}` : "Видео добавлено");
  };

  return (
    <>
      {videos.length > 0 ? (
        <>
          <div className="videos">
            {videos.map((v) => (
              <div key={v.id} className="video">
                <div className="video__player">
                  <video src={v.url} controls preload="metadata" />
                  <button
                    className="media__photo-delete"
                    onClick={() => setToDelete(v)}
                    title="Удалить видео"
                    aria-label="Удалить видео"
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>
                <div className="video__title">{v.title}</div>
              </div>
            ))}
          </div>
          <div className="media__hint">Видео хранятся до перезагрузки страницы</div>
        </>
      ) : (
        <MediaEmpty Icon={VideoIcon}>Видеозаписей пока нет</MediaEmpty>
      )}

      <AddButton onClick={() => inputRef.current.click()}>Добавить видео</AddButton>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />

      {toDelete && (
        <ConfirmModal
          title="Удаление видео"
          text={`Удалить видео «${toDelete.title}»?`}
          onConfirm={() => {
            URL.revokeObjectURL(toDelete.url);
            onChange((list) => list.filter((v) => v.id !== toDelete.id));
            setToDelete(null);
            showSnackbar("Видео удалено");
          }}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}
