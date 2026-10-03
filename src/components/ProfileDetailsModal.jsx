import Modal from "./Modal";
import {
  BriefcaseIcon,
  EducationIcon,
  GiftIcon,
  GlobeIcon,
  HeartIcon,
  HomeIcon,
  LinkIcon,
  MapPinIcon,
  PhoneIcon,
} from "./Icons";
import { useProfile } from "../context/ProfileContext";
import { formatBirthday, relationLabel } from "../profile";

const INTEREST_LABELS = {
  activities: "Деятельность",
  interests: "Интересы",
  music: "Любимая музыка",
  movies: "Любимые фильмы",
  books: "Любимые книги",
  games: "Любимые игры",
  quotes: "Любимые цитаты",
  about: "О себе",
};

const join = (...parts) => parts.filter(Boolean).join(", ");

export default function ProfileDetailsModal({ onClose, onEdit }) {
  const { profile: p } = useProfile();
  const { contacts: c, education: e, career: w } = p;

  const site = c.site.trim();
  const career = join(
    w.company,
    w.position,
    w.city,
    (w.from || w.to) && `${w.from || "…"}–${w.to || "н. в."}`,
  );

  // Показываем только заполненные поля — как в VK
  const main = [
    [GiftIcon, "День рождения", formatBirthday(p)],
    [MapPinIcon, "Город", c.city],
    [HomeIcon, "Родной город", p.hometown],
    [GlobeIcon, "Языки", p.languages],
    [HeartIcon, "Семейное положение", relationLabel(p.gender, p.relation)],
    [
      EducationIcon,
      "Образование",
      join(e.university, e.faculty, e.graduation && `${e.graduation} г.`),
    ],
    [EducationIcon, "Школа", e.school],
    [BriefcaseIcon, "Карьера", career],
    [PhoneIcon, "Телефон", join(c.phone, c.phone2)],
    [
      LinkIcon,
      "Сайт",
      site && (
        <a
          className="link"
          href={/^https?:\/\//.test(site) ? site : `https://${site}`}
          target="_blank"
          rel="noreferrer"
        >
          {site}
        </a>
      ),
    ],
  ].filter(([, , value]) => value);

  const interests = Object.entries(p.interests).filter(([, v]) => v.trim());

  return (
    <Modal
      title="Подробная информация"
      onClose={onClose}
      width={520}
      footer={
        <button className="btn btn--secondary" onClick={onEdit}>
          Редактировать
        </button>
      }
    >
      {main.length === 0 && interests.length === 0 && (
        <div className="empty">Информация не заполнена</div>
      )}

      {main.length > 0 && (
        <div className="details">
          {main.map(([Icon, label, value]) => (
            <div className="details__row" key={label}>
              <Icon size={20} />
              <span className="details__label">{label}</span>
              <span className="details__value">{value}</span>
            </div>
          ))}
        </div>
      )}

      {interests.length > 0 && (
        <>
          <div className="details__group">Личная информация</div>
          <div className="details">
            {interests.map(([key, value]) => (
              <div className="details__row details__row--text" key={key}>
                <span className="details__label">{INTEREST_LABELS[key]}</span>
                <span className="details__value">{value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
