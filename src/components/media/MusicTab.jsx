import { useRef, useState } from "react";
import ConfirmModal from "../ConfirmModal";
import AddButton from "./AddButton";
import MediaEmpty from "./MediaEmpty";
import { CloseIcon, MusicIcon, PauseIcon, PlayIcon } from "../Icons";
import { useSnackbar } from "../Snackbar";

const formatDuration = (sec) =>
  Number.isFinite(sec) ? `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}` : "";

// tracks живут в MediaCard, чтобы не пропадать при переключении вкладок.
// Файлы — object URL, поэтому после перезагрузки страницы их нет
export default function MusicTab({ tracks, onChange }) {
  const showSnackbar = useSnackbar();
  const inputRef = useRef(null);
  const audioRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const add = (files) => {
    const audio = [...files].filter((f) => f.type.startsWith("audio/"));
    if (!audio.length) {
      showSnackbar("Выберите аудиофайл: MP3, M4A, OGG или WAV", "error");
      return;
    }
    const added = audio.map((file) => ({
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^.]+$/, ""),
      url: URL.createObjectURL(file),
      duration: null,
    }));
    onChange((list) => [...added, ...list]);

    // Длительность узнаём, когда браузер прочитает заголовок файла
    added.forEach((track) => {
      const probe = new Audio(track.url);
      probe.onloadedmetadata = () =>
        onChange((list) =>
          list.map((t) => (t.id === track.id ? { ...t, duration: probe.duration } : t)),
        );
    });
    showSnackbar(added.length > 1 ? `Добавлено аудиозаписей: ${added.length}` : "Аудиозапись добавлена");
  };

  const toggle = (track) => {
    const audio = audioRef.current;
    if (playingId === track.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    audio.src = track.url;
    audio.play().then(
      () => setPlayingId(track.id),
      () => showSnackbar("Не удалось воспроизвести файл", "error"),
    );
  };

  const remove = (track) => {
    if (playingId === track.id) {
      audioRef.current.pause();
      setPlayingId(null);
    }
    URL.revokeObjectURL(track.url);
    onChange((list) => list.filter((t) => t.id !== track.id));
    showSnackbar("Аудиозапись удалена");
  };

  return (
    <>
      {tracks.length > 0 ? (
        <div className="tracks">
          {tracks.map((t) => (
            <div key={t.id} className={`track ${playingId === t.id ? "track--playing" : ""}`}>
              <button
                className="track__play"
                onClick={() => toggle(t)}
                title={playingId === t.id ? "Пауза" : "Слушать"}
              >
                {playingId === t.id ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              </button>
              <div className="track__title">{t.title}</div>
              <div className="track__time">{formatDuration(t.duration)}</div>
              <button
                className="icon-btn icon-btn--sm track__delete"
                onClick={() => setToDelete(t)}
                title="Удалить аудиозапись"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          ))}
          <div className="media__hint">Аудиозаписи хранятся до перезагрузки страницы</div>
        </div>
      ) : (
        <MediaEmpty Icon={MusicIcon}>Аудиозаписей пока нет</MediaEmpty>
      )}

      <AddButton onClick={() => inputRef.current.click()}>Добавить аудиозапись</AddButton>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} hidden />

      {toDelete && (
        <ConfirmModal
          title="Удаление аудиозаписи"
          text={`Удалить «${toDelete.title}»?`}
          onConfirm={() => {
            remove(toDelete);
            setToDelete(null);
          }}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}
