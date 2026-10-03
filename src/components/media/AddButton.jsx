import { PlusIcon } from "../Icons";

// Кнопка «Добавить …» внизу вкладки, на всю ширину
export default function AddButton({ children, onClick, disabled }) {
  return (
    <div className="media__actions media__actions--single">
      <button className="btn btn--neutral" onClick={onClick} disabled={disabled}>
        <PlusIcon size={20} />
        {children}
      </button>
    </div>
  );
}
