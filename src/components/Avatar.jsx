import { useState } from "react";
import { initials } from "../utils";

// Аватар: фото, если есть, иначе градиент с инициалами — как у пользователей VK без фото
export default function Avatar({
  name,
  color,
  src,
  size = 40,
  online,
  children,
}) {
  // Если картинка не загрузилась (нет сети, битый файл) — показываем инициалы
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = src && src !== failedSrc;

  return (
    <span
      className="avatar"
      style={{
        "--c": color,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
      }}
    >
      {showImage ? (
        <img
          className="avatar__img"
          src={src}
          alt={name}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        (children ?? initials(name))
      )}
      {online && <span className="avatar__online" />}
    </span>
  );
}
