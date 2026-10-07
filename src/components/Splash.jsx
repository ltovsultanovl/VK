// Заставка на весь экран: загрузка или ошибка с кнопкой «Повторить»
export default function Splash({ error, onRetry, children }) {
  return (
    <div className="splash">
      <div className="splash__logo">
        <span className="logo__mark">VK</span>
        <span className="logo__text">вконтакте</span>
      </div>
      {children ??
        (error ? (
          <div className="splash__error" role="alert">
            <p>{error}</p>
            {onRetry && (
              <button className="btn" onClick={onRetry}>
                Повторить
              </button>
            )}
          </div>
        ) : (
          <div className="chat-status__spinner" role="status" aria-label="Загрузка" />
        ))}
    </div>
  );
}
