// Картинки-заглушки: picsum.photos по seed (стабильные), градиент — фолбэк без сети
const photo = (seed, w = 800, h = 500) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
export const bg = (src, fallback) => `url("${src}") center / cover no-repeat, ${fallback}`;

export const defaultCover = photo('vk-cover', 1200, 400);

// Профиль текущего пользователя (редактируется на странице #edit)
export const defaultProfile = {
  firstName: 'Shamkhan',
  lastName: 'Tovsultanov',
  color: '#5181b8',
  avatar: null, // dataURL загруженной фотографии
  cover: null, // URL или dataURL; null — пустая обложка
  status: 'дабы ликовал мой дом.',

  // Основное
  gender: 'male', // male | female
  relation: '1',
  birthDay: '12',
  birthMonth: '4',
  birthYear: '2002',
  birthVisibility: 'show', // show | month | hide
  hometown: 'Тула',
  languages: 'Русский, English',

  contacts: {
    country: 'Россия',
    city: '',
    phone: '',
    phone2: '',
    site: '',
  },

  interests: {
    activities: '',
    interests: 'Программирование, горы, фотография',
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

export const people = [
  { id: 1, name: 'Анна Смирнова', color: '#e64646', online: true, city: 'Москва' },
  { id: 2, name: 'Дмитрий Петров', color: '#4bb34b', online: false, city: 'Санкт-Петербург' },
  { id: 3, name: 'Мария Козлова', color: '#a06ee6', online: true, city: 'Казань' },
  { id: 4, name: 'Алексей Волков', color: '#ffa000', online: false, city: 'Новосибирск' },
  { id: 5, name: 'Елена Новикова', color: '#00a6b6', online: true, city: 'Екатеринбург' },
  { id: 6, name: 'Сергей Морозов', color: '#e6457a', online: false, city: 'Сочи' },
  { id: 7, name: 'Ольга Лебедева', color: '#6e8fcc', online: true, city: 'Москва' },
];

export const gradients = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#30cfd0,#330867)',
  'linear-gradient(135deg,#a8edea,#fed6e3)',
  'linear-gradient(135deg,#ff9a9e,#fecfef)',
];

export const stories = people.map((p, i) => ({
  id: p.id,
  person: p,
  seen: i > 3,
  preview: bg(photo(`story-${p.id}`, 180, 300), gradients[i % gradients.length]),
}));

// Фото профиля по умолчанию; загруженные хранятся как dataURL
const defaultPhotoDates = ['2026-02-06T05:01', '2025-12-31T23:40', '2025-09-14T18:22', '2025-07-02T12:10'];
export const defaultPhotos = defaultPhotoDates.map((createdAt, i) => ({
  id: `default-${i}`,
  src: photo(`me-photo-${i}`, 800, 1000),
  createdAt,
  likes: [12, 7, 23, 4][i],
  liked: false,
  comments: [],
}));

export const communities = [
  { id: 'c1', name: 'Типичный программист', color: '#2a5885', desc: 'IT-сообщество' },
  { id: 'c2', name: 'Наука и техника', color: '#00a6b6', desc: 'Научпоп' },
  { id: 'c3', name: 'Музыка каждый день', color: '#e6457a', desc: 'Музыка' },
];

export const initialPosts = [
  // Записи на стене профиля: mine — мои, wall — оставленные друзьями
  {
    id: 101, mine: true, pinned: true, time: '28 сен в 19:20',
    text: 'Собрал свой ВКонтакте на React 🚀 Профиль, лента, мессенджер и друзья — всё работает.',
    image: bg(photo('me-wall-1'), gradients[3]), likes: 24, liked: false, reposts: 1, views: '312',
    comments: [
      { id: 1, author: people[0], text: 'Выглядит как настоящий!', time: '19:31', likes: 2 },
      { id: 2, author: people[3], text: '🔥🔥🔥', time: '19:40', likes: 0 },
      { id: 3, author: people[1], text: 'Скинь ссылку на код', time: '20:02', likes: 1 },
    ],
  },
  {
    id: 102, wall: true, author: people[4].name, color: people[4].color, time: '25 сен в 12:00',
    text: 'Привет! Заходи в гости на выходных 🙂',
    image: null, likes: 3, liked: false, reposts: 0, views: '58', comments: [],
  },
  {
    id: 103, mine: true, time: '20 сен в 09:15',
    text: 'дабы ликовал мой дом.',
    image: null, likes: 11, liked: false, reposts: 0, views: '140', comments: [],
  },
  {
    id: 1, author: communities[0].name, color: communities[0].color, time: 'сегодня в 14:32',
    text: 'Когда код заработал с первого раза, и ты не понимаешь почему 🤔',
    image: bg(photo('vk-post-1'), gradients[0]), likes: 1243, liked: false, reposts: 87, views: '24K',
    comments: [{ id: 1, author: people[1], text: 'Подозрительно 😅', time: '14:40', likes: 12 }],
  },
  {
    id: 2, author: people[0].name, color: people[0].color, time: 'сегодня в 12:05',
    text: 'Наконец-то выбралась в горы! Погода просто сказочная ⛰️☀️',
    image: bg(photo('mountains-42'), gradients[2]), likes: 58, liked: false, reposts: 2, views: '412', comments: [],
  },
  {
    id: 3, author: communities[1].name, color: communities[1].color, time: 'вчера в 21:17',
    text: 'Учёные обнаружили новую экзопланету в зоне обитаемости. Расстояние до неё — всего 40 световых лет.\n\nПланета примерно в 1,3 раза больше Земли и делает оборот вокруг своей звезды за 37 дней. Следующий шаг — изучить её атмосферу с помощью космического телескопа.',
    image: bg(photo('space-7'), gradients[5]), likes: 3891, liked: false, reposts: 412, views: '98K', comments: [],
  },
  {
    id: 4, author: people[2].name, color: people[2].color, time: 'вчера в 18:44',
    text: 'Кто идёт на концерт в субботу? Есть лишний билет 🎶',
    image: null, likes: 12, liked: false, reposts: 0, views: '230',
    comments: [
      { id: 1, author: people[4], text: 'Я! Напишу в личку', time: '18:50', likes: 1 },
      { id: 2, author: people[3], text: 'А что за группа?', time: '19:02', likes: 0 },
    ],
  },
];

const lastMessages = [
  'Тоже хорошо. Встретимся завтра?', 'Скинь фотки с поездки', 'Спасибо за помощь!',
  'Ок, договорились', 'Ты видел новый фильм?', 'До связи 👋',
];

export const initialDialogs = people.slice(0, 6).map((person, i) => ({
  id: person.id,
  person,
  unread: [2, 0, 1, 0, 2, 0][i],
  time: ['14:52', '13:10', 'вчера', 'вчера', 'пн', 'вс'][i],
  messages: [
    { id: 1, out: false, text: 'Привет! Как дела?', time: '14:40' },
    { id: 2, out: true, text: 'Привет, всё отлично, а у тебя?', time: '14:41' },
    { id: 3, out: false, text: lastMessages[i], time: '14:52' },
  ],
}));

export const autoReplies = ['Ага 👍', 'Интересно!', 'Хорошо, понял(а)', 'Ахаха 😄', 'Давай позже обсудим'];
