import { useState } from "react";
import { SmileIcon } from "./Icons";
import { useDropdown, useStoredState } from "../hooks";

const RECENT_LIMIT = 24;

// Разделы как в VK. Наборы — обычные эмодзи Unicode, отображаются шрифтом системы
const CATEGORIES = [
  {
    id: "smiles",
    icon: "😀",
    label: "Смайлы",
    emoji: "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👻 👽 🤖",
  },
  {
    id: "gestures",
    icon: "👍",
    label: "Жесты",
    emoji: "👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐 🖖 👋 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💪 🦾 🫶 👀 🧠 💅 🤳",
  },
  {
    id: "hearts",
    icon: "❤️",
    label: "Сердца",
    emoji: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ❤️‍🔥 💋 💯 💢 💥 💫 💦 💨 🔥 ✨ ⭐ 🌟",
  },
  {
    id: "animals",
    icon: "🐶",
    label: "Животные",
    emoji: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🦅 🦉 🐺 🐴 🦄 🐝 🦋 🐢 🐍 🐙 🐬 🐳 🦈 🌸 🌹 🌻 🌷 🌲 🍀 🌈 ☀️ 🌙 ⛄",
  },
  {
    id: "food",
    icon: "🍔",
    label: "Еда",
    emoji: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🌽 🥕 🥐 🍞 🧀 🍳 🥞 🍔 🍟 🍕 🌭 🥪 🌮 🍝 🍜 🍣 🍰 🎂 🧁 🍩 🍪 🍫 🍬 🍿 ☕ 🍵 🧃 🥤",
  },
  {
    id: "activities",
    icon: "🎉",
    label: "Праздник",
    emoji: "🎉 🎊 🎁 🎈 🎄 🎃 🏆 🥇 ⚽ 🏀 🏐 🎾 🥊 🎮 🎲 🎯 🎵 🎶 🎤 🎧 🎸 🎬 📸 💻 📱 ⏰ 💡 📚 ✏️ 💰 🚗 ✈️ 🚀 🏠 🌍 ✅ ❌ ❓ ❗ 🆗",
  },
].map((c) => ({ ...c, emoji: c.emoji.split(" ") }));

// Вставляет текст в поле на место курсора и ставит курсор после вставки
export function insertAtCursor(input, value, onChange, text) {
  const start = input?.selectionStart ?? value.length;
  const end = input?.selectionEnd ?? value.length;
  const next = value.slice(0, start) + text + value.slice(end);
  if (input?.maxLength > 0 && next.length > input.maxLength) return;
  onChange(next);
  requestAnimationFrame(() => {
    if (!input) return;
    input.focus();
    const caret = start + text.length;
    input.setSelectionRange(caret, caret);
  });
}

// Кнопка 😊 с панелью эмодзи. inputRef — поле, куда вставлять; панель не закрывается
// после выбора, чтобы можно было поставить несколько смайликов подряд.
// placement: "top" — панель над кнопкой (поле внизу экрана), "bottom" — под ней
export default function EmojiPicker({ inputRef, value, onChange, placement = "top", align = "right", size = 22 }) {
  const menu = useDropdown();
  const [recent, setRecent] = useStoredState("emoji:recent", []);
  const [tab, setTab] = useState(() => (recent.length ? "recent" : "smiles"));

  const tabs = recent.length
    ? [{ id: "recent", icon: "🕘", label: "Недавние", emoji: recent }, ...CATEGORIES]
    : CATEGORIES;
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  const pick = (emoji) => {
    insertAtCursor(inputRef.current, value, onChange, emoji);
    setRecent((list) => [emoji, ...list.filter((e) => e !== emoji)].slice(0, RECENT_LIMIT));
  };

  return (
    <div className="emoji" ref={menu.ref}>
      <button
        type="button"
        className={`icon-btn emoji__trigger ${menu.open ? "emoji__trigger--open" : ""}`}
        title="Смайлики"
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        // mousedown не забирает фокус у поля — курсор остаётся на месте
        onMouseDown={(e) => e.preventDefault()}
        onClick={menu.toggle}
      >
        <SmileIcon size={size} />
      </button>

      {menu.open && (
        <div className={`emoji__panel emoji__panel--${placement} emoji__panel--${align}`} role="dialog" aria-label="Смайлики">
          <div className="emoji__title">{current.label}</div>
          <div className="emoji__grid" onMouseDown={(e) => e.preventDefault()}>
            {current.emoji.map((emoji) => (
              <button key={emoji} type="button" className="emoji__item" onClick={() => pick(emoji)} title={emoji}>
                {emoji}
              </button>
            ))}
          </div>
          <div className="emoji__tabs" onMouseDown={(e) => e.preventDefault()}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`emoji__tab ${t.id === current.id ? "emoji__tab--active" : ""}`}
                onClick={() => setTab(t.id)}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
