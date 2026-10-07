import { useState } from "react";
import Modal from "../Modal";
import ConfirmModal from "../ConfirmModal";
import AddButton from "./AddButton";
import MediaEmpty from "./MediaEmpty";
import { ArticlesIcon, TrashIcon } from "../Icons";
import { useSnackbar } from "../Snackbar";
import { useStoredState } from "../../hooks";
import { useProfile } from "../../context/ProfileContext";
import { formatDate } from "../../utils";

function NewArticleModal({ onCreate, onClose }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const valid = title.trim() && text.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onCreate({ title: title.trim(), text: text.trim() });
  };

  return (
    <Modal
      title="Новая статья"
      onClose={onClose}
      width={600}
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn" form="new-article" disabled={!valid}>
            Опубликовать
          </button>
        </>
      }
    >
      <form id="new-article" className="media-form" onSubmit={submit}>
        <input
          className="field media-form__title"
          autoFocus
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок"
        />
        <textarea
          className="field field--textarea media-form__text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Текст статьи"
        />
      </form>
    </Modal>
  );
}

export default function ArticlesTab() {
  const showSnackbar = useSnackbar();
  const { myId } = useProfile();
  const [articles, setArticles] = useStoredState(`articles:${myId}`, []);
  const [creating, setCreating] = useState(false);
  const [reading, setReading] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const create = (data) => {
    setArticles((list) => [
      { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data },
      ...list,
    ]);
    setCreating(false);
    showSnackbar("Статья опубликована");
  };

  return (
    <>
      {articles.length > 0 ? (
        <div className="articles">
          {articles.map((a) => (
            <button key={a.id} className="article-row" onClick={() => setReading(a)}>
              <span className="article-row__icon">
                <ArticlesIcon size={24} />
              </span>
              <span className="article-row__body">
                <span className="article-row__title">{a.title}</span>
                <span className="article-row__meta">
                  {formatDate(a.createdAt)} · {a.text.slice(0, 80)}
                  {a.text.length > 80 ? "…" : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <MediaEmpty Icon={ArticlesIcon}>Статей пока нет</MediaEmpty>
      )}

      <AddButton onClick={() => setCreating(true)}>Написать статью</AddButton>

      {creating && <NewArticleModal onCreate={create} onClose={() => setCreating(false)} />}

      {reading && (
        <Modal
          title={reading.title}
          onClose={() => setReading(null)}
          width={640}
          footer={
            <button
              className="btn btn--secondary"
              onClick={() => {
                setToDelete(reading);
              }}
            >
              <TrashIcon size={18} /> Удалить статью
            </button>
          }
        >
          <div className="article__date">{formatDate(reading.createdAt)}</div>
          <div className="article__text">{reading.text}</div>
        </Modal>
      )}

      {toDelete && (
        <ConfirmModal
          title="Удаление статьи"
          text={`Удалить статью «${toDelete.title}»?`}
          onConfirm={() => {
            setArticles((list) => list.filter((a) => a.id !== toDelete.id));
            setToDelete(null);
            setReading(null);
            showSnackbar("Статья удалена");
          }}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}
