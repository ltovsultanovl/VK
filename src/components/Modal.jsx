import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./Icons";

// Открытые окна по порядку: Esc закрывает только верхнее
const openModals = [];

export default function Modal({
  title,
  onClose,
  footer,
  width = 480,
  children,
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Esc закрывает окно, прокрутка страницы блокируется
  useEffect(() => {
    const token = {};
    openModals.push(token);
    const onKey = (e) => {
      if (e.key === "Escape" && openModals.at(-1) === token) onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      openModals.splice(openModals.indexOf(token), 1);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ width }} role="dialog" aria-modal="true">
        <div className="modal__head">
          <div className="modal__title">{title}</div>
          <button className="icon-btn" onClick={onClose} title="Закрыть">
            <CloseIcon />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
