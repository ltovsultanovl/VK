import { useState } from "react";
import Modal from "./Modal";
import { useProfile } from "../context/ProfileContext";
import { useSnackbar } from "./Snackbar";
import { readImage } from "../utils";
import { useFileDrop, useFilePicker } from "../hooks";

// Двухшаговая загрузка, как в VK:
// 1) «Загрузка новой фотографии» — выбор файла / drag&drop
// 2) «Фотография на вашей странице» — предпросмотр миниатюр
export default function AvatarUploadModal({ onClose }) {
  const { updateProfile } = useProfile();
  const showSnackbar = useSnackbar();
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = async (file) => {
    setError("");
    setLoading(true);
    try {
      setImage(await readImage(file, { max: 400, square: true }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const picker = useFilePicker({
    accept: "image/jpeg,image/png,image/gif,image/webp",
    onPick: ([file]) => handleFile(file),
  });
  const [dragging, dropProps] = useFileDrop(([file]) => handleFile(file));

  const save = () => {
    updateProfile({ avatar: image });
    showSnackbar("Фотография обновлена");
    onClose();
  };

  if (image) {
    return (
      <Modal
        title="Фотография на вашей странице"
        onClose={onClose}
        width={560}
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setImage(null)}>
              Вернуться назад
            </button>
            <button className="btn" onClick={save}>
              Сохранить и продолжить
            </button>
          </>
        }
      >
        <p className="modal__text">
          Выбранная область будет показываться на вашей странице, в новостях, сообщениях и комментариях.
        </p>
        <div className="upload-preview">
          <img className="upload-preview__main" src={image} alt="" />
          <div className="upload-preview__thumbs">
            <img src={image} alt="" style={{ width: 100, height: 100 }} />
            <img src={image} alt="" style={{ width: 50, height: 50 }} />
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Загрузка новой фотографии" onClose={onClose} width={560}>
      <div className={`dropzone ${dragging ? "dropzone--active" : ""}`} {...dropProps}>
        <p className="modal__text">
          Друзьям будет проще узнать вас, если вы загрузите свою настоящую фотографию.
          <br />
          Вы можете загрузить изображение в формате JPG, GIF или PNG.
        </p>
        <button className="btn" onClick={picker.open} disabled={loading}>
          {loading ? "Загрузка…" : "Выбрать файл"}
        </button>
        {picker.input}
        {error && <div className="form-row__error">{error}</div>}
        <p className="dropzone__hint">
          Можно перетащить фотографию сюда. Если у вас возникают проблемы с загрузкой, попробуйте выбрать
          фотографию меньшего размера.
        </p>
      </div>
    </Modal>
  );
}
