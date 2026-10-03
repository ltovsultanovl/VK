import Modal from "./Modal";

// Подтверждение опасного действия: «Удалить фотографию?»
export default function ConfirmModal({
  title,
  text,
  confirmLabel = "Удалить",
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="modal__text">{text}</p>
    </Modal>
  );
}
