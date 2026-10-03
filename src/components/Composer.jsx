import { useRef, useState } from "react";
import MeAvatar from "./MeAvatar";
import { ClipsIcon, MusicIcon, PhotoIcon, VideoIcon } from "./Icons";

export default function Composer({ onPublish, autoFocus = false, onCancel }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const expanded = focused || text.length > 0;

  const resize = () => {
    const el = ref.current;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const publish = () => {
    const value = text.trim();
    if (!value) return ref.current.focus();
    onPublish(value);
    setText("");
    setFocused(false);
    ref.current.style.height = "auto";
  };

  return (
    <div className={`card composer ${expanded ? "composer--expanded" : ""}`}>
      <MeAvatar size={28} />
      <textarea
        ref={ref}
        rows={1}
        autoFocus={autoFocus}
        placeholder="Что у вас нового?"
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (!text.trim()) onCancel?.();
        }}
        onChange={(e) => {
          setText(e.target.value);
          resize();
        }}
      />
      <div className="composer__tools">
        <button className="icon-btn" title="Фотография">
          <PhotoIcon />
        </button>
        <button className="icon-btn" title="Видео">
          <VideoIcon />
        </button>
        <button className="icon-btn" title="Музыка">
          <MusicIcon />
        </button>
        <button className="icon-btn" title="Клип">
          <ClipsIcon />
        </button>
      </div>
      {expanded && (
        <div className="composer__footer">
          <button
            className="btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={publish}
            disabled={!text.trim()}
          >
            Опубликовать
          </button>
        </div>
      )}
    </div>
  );
}
