import { useState } from "react";
import { initials } from "../utils";

// Силуэт человека, как у страниц VK без фотографии. Низ обрезает круг аватара
const Silhouette = () => (
  <svg className="avatar__silhouette" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="39" r="17" />
    <ellipse cx="50" cy="94" rx="33" ry="28" />
  </svg>
);

// Аватар: фото, если есть, иначе серый кружок с силуэтом, как у страниц VK без фото.
// empty={false} — цветной кружок с инициалами (или children)
export default function Avatar({
  name,
  color,
  src,
  size = 40,
  online,
  empty = true,
  children,
}) {
  // Если картинка не загрузилась (нет сети, битый файл) — показываем инициалы
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = src && src !== failedSrc;

  return (
    <span
      className={`avatar ${empty && !showImage ? "avatar--empty" : ""}`}
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
      ) : empty ? (
        <Silhouette />
      ) : (
        (children ?? initials(name))
      )}
      {online && <span className="avatar__online" />}
    </span>
  );
}
