import { createContext, useContext, useMemo, useState } from "react";

const MediaContext = createContext(null);

// Загруженные музыка и видео. Файлы — object URL, в localStorage не влезают,
// поэтому живут до перезагрузки страницы. Провайдер стоит над всем приложением,
// чтобы уход со страницы профиля их не терял
export function MediaProvider({ children }) {
  const [tracks, setTracks] = useState([]);
  const [videos, setVideos] = useState([]);

  const value = useMemo(
    () => ({ tracks, setTracks, videos, setVideos }),
    [tracks, videos],
  );

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

export function useMedia() {
  const context = useContext(MediaContext);
  if (!context) throw new Error("useMedia нужно вызывать внутри <MediaProvider>");
  return context;
}
