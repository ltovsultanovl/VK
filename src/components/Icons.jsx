// Контурные иконки в стиле VK Icons (24×24, stroke 1.8)
const Svg = ({ size = 24, children, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

const Dot = ({ cx, cy, r = 1 }) => (
  <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
);

// ---------- Навигация ----------
export const UserIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" />
  </Svg>
);

export const NewsIcon = (p) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </Svg>
);

export const MessageIcon = (p) => (
  <Svg {...p}>
    <path d="M12 4c4.97 0 9 3.36 9 7.5S16.97 19 12 19c-1.1 0-2.15-.16-3.12-.46L4.5 20l1.2-3.3C4.03 15.33 3 13.5 3 11.5 3 7.36 7.03 4 12 4Z" />
  </Svg>
);

export const PhoneIcon = (p) => (
  <Svg {...p}>
    <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" />
  </Svg>
);

export const FriendsIcon = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 19c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14c2.1.6 3.5 2.4 3.5 5" />
  </Svg>
);

export const GroupsIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3" />
    <circle cx="5" cy="10" r="2" />
    <circle cx="19" cy="10" r="2" />
    <path d="M6.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M2 18c0-2 1.3-3.5 3-3.8M22 18c0-2-1.3-3.5-3-3.8" />
  </Svg>
);

export const PhotoIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="4" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m21 15-4.5-4.5L8 19" />
  </Svg>
);

export const MusicIcon = (p) => (
  <Svg {...p}>
    <path d="M9 18V6l11-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </Svg>
);

export const VideoIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="4" />
    <path d="m10 9 5 3-5 3V9Z" />
  </Svg>
);

export const ClipsIcon = (p) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="4" />
    <path d="m10.5 9.5 4 2.5-4 2.5v-5Z" />
  </Svg>
);

export const GamesIcon = (p) => (
  <Svg {...p}>
    <path d="M7 7h10a4 4 0 0 1 4 4v2a4 4 0 0 1-7 2.6h-4A4 4 0 0 1 3 13v-2a4 4 0 0 1 4-4Z" />
    <path d="M8 10.5v3M6.5 12h3" />
    <Dot cx="15.5" cy="11" />
    <Dot cx="17" cy="13" />
  </Svg>
);

export const MarketIcon = (p) => (
  <Svg {...p}>
    <path d="M5 8h14l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8Z" />
    <path d="M9 8a3 3 0 0 1 6 0" />
  </Svg>
);

export const ServicesIcon = (p) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </Svg>
);

export const BookmarkIcon = (p) => (
  <Svg {...p}>
    <path d="M6 5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15l-6-4-6 4V5Z" />
  </Svg>
);

export const FilesIcon = (p) => (
  <Svg {...p}>
    <path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5" />
  </Svg>
);

export const HelpIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4" />
    <Dot cx="12" cy="16.8" />
  </Svg>
);

// ---------- Шапка ----------
export const SearchIcon = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);

export const BellIcon = (p) => (
  <Svg {...p}>
    <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </Svg>
);

export const PlayIcon = (p) => (
  <Svg {...p}>
    <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" />
  </Svg>
);

export const ChevronDownIcon = (p) => (
  <Svg {...p}>
    <path d="m7 10 5 5 5-5" />
  </Svg>
);

export const MoonIcon = (p) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </Svg>
);

export const SettingsIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </Svg>
);

export const LogoutIcon = (p) => (
  <Svg {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10" />
  </Svg>
);

// ---------- Пост ----------
export const LikeIcon = ({ filled, ...p }) => (
  <Svg {...p}>
    <path
      d="M12 20s-7.5-4.6-9-9.3C2 7.4 4.3 4.5 7.4 4.5c2 0 3.4 1.1 4.6 2.8 1.2-1.7 2.6-2.8 4.6-2.8 3.1 0 5.4 2.9 4.4 6.2C19.5 15.4 12 20 12 20Z"
      fill={filled ? "currentColor" : "none"}
    />
  </Svg>
);

export const CommentIcon = MessageIcon;

export const ShareIcon = (p) => (
  <Svg {...p}>
    <path d="M13.5 5v3.8C7 9.4 3.8 13.6 3 19c2.4-3.2 5.6-4.7 10.5-4.7V18l7.5-6.5L13.5 5Z" />
  </Svg>
);

export const EyeIcon = (p) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const MoreIcon = (p) => (
  <Svg {...p}>
    <Dot cx="5" cy="12" r="1.7" />
    <Dot cx="12" cy="12" r="1.7" />
    <Dot cx="19" cy="12" r="1.7" />
  </Svg>
);

// ---------- Сообщения ----------
export const AttachIcon = (p) => (
  <Svg {...p}>
    <path d="m20 11.5-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 7" />
  </Svg>
);

export const SmileIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
    <Dot cx="9" cy="10" />
    <Dot cx="15" cy="10" />
  </Svg>
);

export const MicIcon = (p) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </Svg>
);

export const SendIcon = (p) => (
  <Svg {...p}>
    <path d="M4.5 4.5 20 12 4.5 19.5 6.5 12l-2-7.5Z" fill="currentColor" />
    <path d="M6.5 12H12" stroke="var(--card)" />
  </Svg>
);

export const WriteIcon = (p) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m13 7 4 4" />
  </Svg>
);

export const PlusIcon = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const InfoIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <Dot cx="12" cy="8" />
  </Svg>
);

// ---------- Профиль ----------
export const CloseIcon = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const CheckCircleIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" fill="var(--online)" stroke="none" />
    <path d="m8 12.5 2.8 2.8L16.5 9.5" stroke="#fff" strokeWidth="2" />
  </Svg>
);

export const CameraIcon = (p) => (
  <Svg {...p}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.5-2h5L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </Svg>
);

export const TrashIcon = (p) => (
  <Svg {...p}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
  </Svg>
);

export const GiftIcon = (p) => (
  <Svg {...p}>
    <rect x="4" y="9" width="16" height="11" rx="2" />
    <path d="M3 9h18M12 9v11M12 9S10.5 4 8 4.5 7 9 12 9Zm0 0s1.5-5 4-4.5S17 9 12 9Z" />
  </Svg>
);

export const HomeIcon = (p) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" />
  </Svg>
);

export const GlobeIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" />
  </Svg>
);

export const BriefcaseIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="7" width="18" height="13" rx="3" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" />
  </Svg>
);

export const EducationIcon = (p) => (
  <Svg {...p}>
    <path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9Z" />
    <path d="M6.5 11v5c1.5 1.5 3.5 2.5 5.5 2.5s4-1 5.5-2.5v-5M21.5 9v5" />
  </Svg>
);

export const MapPinIcon = (p) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);

export const LinkIcon = (p) => (
  <Svg {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Svg>
);

export const HeartIcon = (p) => <LikeIcon {...p} />;

// ---------- Профиль ----------
export const StatsIcon = (p) => (
  <Svg {...p}>
    <path d="M4 19h16" />
    <path d="m5 15 5-5 3 3 6-6" />
    <path d="M15 7h4v4" />
  </Svg>
);

export const AlbumsIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="7" width="15" height="13" rx="3" />
    <path d="M7 4h11a3 3 0 0 1 3 3v9" />
    <path d="m3 17 4-4 4 4 2-2 5 5" />
  </Svg>
);

export const ArticlesIcon = (p) => (
  <Svg {...p}>
    <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />
  </Svg>
);

export const SparkleIcon = (p) => (
  <Svg {...p}>
    <path d="M10 3.5 11.6 8a3 3 0 0 0 1.9 1.9L18 11.5l-4.5 1.6a3 3 0 0 0-1.9 1.9L10 19.5 8.4 15a3 3 0 0 0-1.9-1.9L2 11.5l4.5-1.6A3 3 0 0 0 8.4 8L10 3.5Z" />
    <path d="M18.5 2.5v4M16.5 4.5h4" />
  </Svg>
);

export const ChevronRightIcon = (p) => (
  <Svg {...p}>
    <path d="m10 7 5 5-5 5" />
  </Svg>
);

// ---------- Левое меню: дополнительные разделы ----------
export const StickersIcon = (p) => (
  <Svg {...p}>
    <path d="M20.5 12A8.5 8.5 0 1 1 12 3.5" />
    <path d="M20.5 12c-4.7 0-8.5-3.8-8.5-8.5" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 6.5.7" />
    <Dot cx="9" cy="10" />
  </Svg>
);

export const VoicesIcon = (p) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6.5" rx="7" ry="3" />
    <path d="M5 6.5v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
    <path d="M5 11.5v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
  </Svg>
);

export const AdsIcon = (p) => (
  <Svg {...p}>
    <path d="M4 10v4a1 1 0 0 0 1 1h3l7 4V5L8 9H5a1 1 0 0 0-1 1Z" />
    <path d="M8 15v4M18.5 9.5a3.5 3.5 0 0 1 0 5" />
  </Svg>
);

// Цветная иконка браузера — не наследует цвет меню
export const BrowserIcon = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#fc3f1d" />
    <circle cx="12" cy="12" r="8" fill="#fff" />
    <path d="M12.6 17h1.6V7h-2.3c-2.3 0-3.5 1.2-3.5 2.9 0 1.4.7 2.3 2 3.2L8 17h1.8l2.6-3.6-.9-.6c-1.1-.7-1.6-1.3-1.6-2.5 0-1 .7-1.8 2-1.8h.7V17Z" fill="#fc3f1d" />
  </svg>
);

// ---------- Пост ----------
export const PinIcon = (p) => (
  <Svg {...p}>
    <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3-1-5Z" />
    <path d="M12 14v6" />
  </Svg>
);

export const FlagIcon = (p) => (
  <Svg {...p}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Svg>
);

export const ChevronLeftIcon = (p) => (
  <Svg {...p}>
    <path d="m14 7-5 5 5 5" />
  </Svg>
);

export const DownloadIcon = (p) => (
  <Svg {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </Svg>
);

export const TagUserIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="9" r="3.5" />
    <path d="M5.5 19c.8-2.9 3.4-4.5 6.5-4.5s5.7 1.6 6.5 4.5" />
    <rect x="3" y="3" width="18" height="18" rx="5" />
  </Svg>
);

export const PauseIcon = (p) => (
  <Svg {...p}>
    <path d="M8 5.5v13M16 5.5v13" strokeWidth="3" />
  </Svg>
);
