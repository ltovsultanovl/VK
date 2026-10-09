import type { ProfileInfo } from "./types";

// Фон-картинка с запасным цветом/градиентом на время загрузки или при ошибке
// Адрес экранируем: кавычка или скобка в нём не должны «выйти» из url(...) и сломать стили
const CSS_URL_ESCAPES: Record<string, string> = { "(": "%28", ")": "%29", "'": "%27" };
const cssUrl = (src: string) => src.replace(/["'()\\\s]/g, (ch) => CSS_URL_ESCAPES[ch] ?? encodeURIComponent(ch));
export const bg = (src: string, fallback: string) => `url("${cssUrl(src)}") center / cover no-repeat, ${fallback}`;

// Поля профиля из «Редактировать профиль» (хранятся в profiles.info на сервере)
export const emptyProfileInfo: ProfileInfo = {
  gender: 'male', // male | female
  relation: '0',
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  birthVisibility: 'show', // show | month | hide
  hometown: '',
  languages: '',

  contacts: {
    country: '',
    city: '',
    phone: '',
    phone2: '',
    site: '',
  },

  interests: {
    activities: '',
    interests: '',
    music: '',
    movies: '',
    books: '',
    games: '',
    quotes: '',
    about: '',
  },

  education: {
    university: '',
    faculty: '',
    graduation: '',
    school: '',
  },

  career: {
    company: '',
    city: '',
    position: '',
    from: '',
    to: '',
  },
};

// Цвета для аватаров без фото — выбирается случайно при регистрации
export const avatarColors = ['#5181b8', '#e64646', '#4bb34b', '#a06ee6', '#ffa000', '#00a6b6', '#e6457a', '#6e8fcc'];
