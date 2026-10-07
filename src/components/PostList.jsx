import Post from "./Post";

// Список записей из usePosts: загрузка, ошибка с «Повторить», пусто, записи
export default function PostList({ feed, emptyText, emptyAction }) {
  const { posts, data, loading, error, reload } = feed;

  if (loading && !data) {
    return (
      <div className="card list-state" role="status">
        <div className="chat-status__spinner" />
        Загружаем записи…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card list-state" role="alert">
        Не удалось загрузить записи: {error}
        <button className="btn" onClick={reload}>
          Повторить
        </button>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="card list-state">
        {emptyText}
        {emptyAction}
      </div>
    );
  }

  return posts.map((post) => (
    <Post
      key={post.id}
      post={post}
      onLike={feed.toggleLike}
      onComment={feed.comment}
      onDeleteComment={feed.deleteComment}
      onDelete={feed.remove}
      onTogglePin={feed.togglePin}
    />
  ));
}
