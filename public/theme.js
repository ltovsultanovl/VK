// Тему ставим до загрузки React, чтобы тёмная тема не мигала светлой.
// Отдельный файл, а не встроенный скрипт: так строгая политика безопасности (CSP) не мешает
{
  let saved = null;
  try {
    const raw = localStorage.getItem("theme");
    saved = raw && raw.startsWith('"') ? JSON.parse(raw) : raw;
  } catch {}
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = saved || (prefersDark ? "dark" : "light");
}
