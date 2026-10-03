import { Component } from "react";

// Ловит ошибки отрисовки: вместо белого экрана — карточка с выходом из ситуации.
// fallback(reset) — свой экран; без него показывается стандартный
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Ошибка отрисовки:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);

    return (
      <div className="card error-screen" role="alert">
        <div className="error-screen__title">Что-то пошло не так</div>
        <p className="error-screen__text">
          Страница не смогла загрузиться. Попробуйте обновить её — ваши данные сохранены.
        </p>
        <button className="btn" onClick={() => location.reload()}>
          Обновить страницу
        </button>
      </div>
    );
  }
}
