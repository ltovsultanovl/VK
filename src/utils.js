export const initials = (name) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const formatCount = (n) =>
  n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : n;

export const nowTime = () => new Date().toTimeString().slice(0, 5);

// Читает картинку из файла и ужимает её через canvas,
// чтобы dataURL поместился в localStorage.
// square: true — центрированная квадратная обрезка (для аватара)
export const readImage = (file, { max = 800, square = false, quality = 0.85 } = {}) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Выберите изображение в формате JPG, PNG или GIF'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (square) {
        const side = Math.min(sw, sh);
        sx = (sw - side) / 2;
        sy = (sh - side) / 2;
        sw = sh = side;
      }
      const scale = Math.min(1, max / Math.max(sw, sh));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = url;
  });

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// Дата как в VK: «сегодня в 14:32», «вчера в 9:05», «6 фев в 5:01», «6 фев 2024 в 5:01»
export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  const dayDiff = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (dayDiff === 0) return `сегодня в ${time}`;
  if (dayDiff === 1) return `вчера в ${time}`;
  const year = date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : '';
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}${year} в ${time}`;
};
