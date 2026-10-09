import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Track } from "../types";
import { useSnackbar } from "../components/Snackbar";
import { useStoredState } from "../hooks";

// Сквозной плеер как в VK: очередь, вперёд/назад, перемешать, повтор, громкость.
// Время воспроизведения — в отдельном контексте, чтобы каждые 250 мс
// перерисовывались только полоска прогресса и таймер, а не всё приложение
export type RepeatMode = "off" | "all" | "one";

interface PlayerValue {
  current: Track | null;
  queue: Track[];
  playing: boolean;
  loading: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  hasNext: boolean;
  play: (tracks: Track[], index?: number) => void;
  playShuffled: (tracks: Track[]) => void;
  toggle: (track?: Track, tracks?: Track[], index?: number) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  isCurrent: (track: Track | null | undefined) => boolean;
  forget: (track: Track) => void;
  patchTrack: (track: Pick<Track, "id"> & Partial<Track>) => void;
}

const PlayerContext = createContext<PlayerValue | null>(null);
const PlayerTimeContext = createContext({ time: 0, duration: 0 });

const shuffled = (length: number, first: number) => {
  const rest = [...Array(length).keys()].filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [first, ...rest];
};

export function PlayerProvider({ children }: { children: ReactNode }) {
  const showSnackbar = useSnackbar();
  const [queue, setQueue] = useState<Track[]>([]);
  const [order, setOrder] = useState<number[]>([]); // порядок индексов очереди (при перемешивании — случайный)
  const [position, setPosition] = useState(0); // место в order
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shuffle, setShuffle] = useStoredState("player:shuffle", false);
  const [repeat, setRepeat] = useStoredState<RepeatMode>("player:repeat", "off");
  const [volume, setVolumeState] = useStoredState("player:volume", 0.8);
  const [time, setTime] = useState({ time: 0, duration: 0 });

  const current = queue[order[position]] ?? null;

  // Один <audio> на всё приложение
  const [audio] = useState(() => new Audio());

  useEffect(() => {
    audio.volume = volume;
  }, [audio, volume]);

  const startAt = useCallback(
    (track: Track | undefined) => {
      if (!track) return;
      if (audio.src !== track.url) audio.src = track.url;
      audio.currentTime = 0;
      setLoading(true);
      audio.play().then(
        () => setLoading(false),
        (e: Error) => {
          setLoading(false);
          if (e.name !== "AbortError") showSnackbar("Не удалось воспроизвести аудиозапись", "error");
        },
      );
    },
    [audio, showSnackbar],
  );

  // Включить список треков с позиции index
  const play = useCallback(
    (tracks: Track[], index = 0) => {
      if (!tracks.length) return;
      const nextOrder = shuffle ? shuffled(tracks.length, index) : [...tracks.keys()];
      setQueue(tracks);
      setOrder(nextOrder);
      setPosition(shuffle ? 0 : index);
      startAt(tracks[index]);
    },
    [shuffle, startAt],
  );

  // Перемешать и включить
  const playShuffled = useCallback(
    (tracks: Track[]) => {
      if (!tracks.length) return;
      const first = Math.floor(Math.random() * tracks.length);
      setShuffle(true);
      setQueue(tracks);
      setOrder(shuffled(tracks.length, first));
      setPosition(0);
      startAt(tracks[first]);
    },
    [setShuffle, startAt],
  );

  const isCurrent = useCallback(
    (track: Track | null | undefined) => !!current && !!track && current.id === track.id,
    [current],
  );

  const pause = useCallback(() => audio.pause(), [audio]);
  const resume = useCallback(() => {
    if (current) audio.play().catch(() => {});
  }, [audio, current]);

  // Клик по треку в списке: свой — пауза/продолжить, другой — включить список с него
  const toggle = useCallback(
    (track?: Track, tracks?: Track[], index?: number) => {
      if (!track || isCurrent(track)) return audio.paused ? resume() : pause();
      play(tracks ?? [track], index ?? 0);
    },
    [audio, isCurrent, pause, play, resume],
  );

  const goTo = useCallback(
    (nextPosition: number) => {
      setPosition(nextPosition);
      startAt(queue[order[nextPosition]]);
    },
    [order, queue, startAt],
  );

  const next = useCallback(
    (auto = false) => {
      if (!queue.length) return;
      if (position + 1 < order.length) return goTo(position + 1);
      if (repeat === "all" || !auto) return goTo(0); // кнопкой «вперёд» с последнего — на первый
      audio.pause();
      audio.currentTime = 0;
    },
    [audio, goTo, order.length, position, queue.length, repeat],
  );

  const prev = useCallback(() => {
    if (!queue.length) return;
    if (audio.currentTime > 3 || position === 0) {
      audio.currentTime = 0;
      return;
    }
    goTo(position - 1);
  }, [audio, goTo, position, queue.length]);

  const seek = useCallback(
    (seconds: number) => {
      if (Number.isFinite(seconds)) audio.currentTime = Math.max(0, seconds);
    },
    [audio],
  );

  const setVolume = useCallback((v: number) => setVolumeState(Math.min(1, Math.max(0, v))), [setVolumeState]);

  const toggleShuffle = useCallback(() => {
    setShuffle((on) => {
      const index = order[position] ?? 0;
      if (queue.length) {
        setOrder(on ? [...queue.keys()] : shuffled(queue.length, index));
        setPosition(on ? index : 0);
      }
      return !on;
    });
  }, [order, position, queue, setShuffle]);

  const cycleRepeat = useCallback(
    () => setRepeat((r) => ({ off: "all", all: "one", one: "off" } as const)[r] ?? "off"),
    [setRepeat],
  );

  // Трек удалили / убрали — убираем из очереди
  const forget = useCallback(
    (track: Track) => {
      if (isCurrent(track)) {
        audio.pause();
        audio.removeAttribute("src");
        setQueue([]);
        setOrder([]);
        setPosition(0);
        return;
      }
      setQueue((q) => q.map((t) => (t.id === track.id ? { ...t, removed: true } : t)));
    },
    [audio, isCurrent],
  );

  // Обновить название/исполнителя у трека в очереди
  const patchTrack = useCallback((track: Pick<Track, "id"> & Partial<Track>) => setQueue((q) => q.map((t) => (t.id === track.id ? { ...t, ...track } : t))), []);

  // События <audio>
  const nextRef = useRef(next);
  const repeatRef = useRef(repeat);
  useEffect(() => {
    nextRef.current = next;
    repeatRef.current = repeat;
  });
  useEffect(() => {
    let last = 0;
    const onTime = () => {
      const now = performance.now();
      if (now - last < 250 && !audio.paused) return;
      last = now;
      setTime({ time: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : 0 });
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onEnded = () => {
      if (repeatRef.current === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else nextRef.current(true);
    };
    const onError = () => {
      setLoading(false);
      if (audio.getAttribute("src")) showSnackbar("Не удалось загрузить аудиозапись", "error");
    };
    const events = { timeupdate: onTime, loadedmetadata: onTime, seeked: onTime, play: onPlay, pause: onPause, waiting: onWaiting, playing: onPlaying, ended: onEnded, error: onError };
    Object.entries(events).forEach(([e, f]) => audio.addEventListener(e, f));
    return () => Object.entries(events).forEach(([e, f]) => audio.removeEventListener(e, f));
  }, [audio, showSnackbar]);

  // Кнопки на клавиатуре и в системе (Media Session)
  useEffect(() => {
    const session = navigator.mediaSession;
    if (!session || !current) return;
    session.metadata = new MediaMetadata({ title: current.title, artist: current.artist || "Неизвестный исполнитель" });
    const handlers: [MediaSessionAction, () => void][] = [
      ["play", resume],
      ["pause", pause],
      ["previoustrack", prev],
      ["nexttrack", () => next()],
    ];
    handlers.forEach(([action, handler]) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* браузер не поддерживает это действие */
      }
    });
  }, [current, next, pause, prev, resume]);

  useEffect(() => () => audio.pause(), [audio]);

  const value = useMemo<PlayerValue>(
    () => ({
      current,
      queue,
      playing,
      loading,
      shuffle,
      repeat,
      volume,
      hasNext: position + 1 < order.length || repeat === "all",
      play,
      playShuffled,
      toggle,
      pause,
      resume,
      next: () => next(),
      prev,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat,
      isCurrent,
      forget,
      patchTrack,
    }),
    [current, queue, playing, loading, shuffle, repeat, volume, position, order.length, play, playShuffled, toggle, pause, resume, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, isCurrent, forget, patchTrack],
  );

  return (
    <PlayerContext.Provider value={value}>
      <PlayerTimeContext.Provider value={time}>{children}</PlayerTimeContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer нужно вызывать внутри <PlayerProvider>");
  return context;
}

export const usePlayerTime = () => useContext(PlayerTimeContext);
