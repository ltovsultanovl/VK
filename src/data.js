// Фон-картинка с запасным цветом/градиентом на время загрузки или при ошибке
export const bg = (src, fallback) => `url("${src}") center / cover no-repeat, ${fallback}`;

// Поля профиля из «Редактировать профиль» (хранятся в profiles.info на сервере)
export const emptyProfileInfo = {
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
