// Заглушка пустой вкладки: иконка + текст
export default function MediaEmpty({ Icon, children }) {
  return (
    <div className="media__empty">
      <Icon size={32} />
      {children}
    </div>
  );
}
