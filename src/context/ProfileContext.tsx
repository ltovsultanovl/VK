import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Profile } from "../types";
import { createProfile, explainError, fetchProfile, saveProfile } from "../api";
import { fullName } from "../profile";
import { useSnackbar } from "../components/Snackbar";
import Onboarding from "../pages/Onboarding";
import Splash from "../components/Splash";

interface ProfileValue {
  profile: Profile;
  name: string;
  myId: string;
  updateProfile: (patch: Partial<Profile>) => Promise<boolean>;
}

export interface NewProfile {
  firstName: string;
  lastName: string;
  color: string;
}

const ProfileContext = createContext<ProfileValue | null>(null);

// Профиль вошедшего пользователя с сервера. Пока грузится — заставка,
// если профиля ещё нет (первый вход) — форма «Как вас зовут?»
export function ProfileProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const showSnackbar = useSnackbar();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined); // undefined — грузим, null — нет профиля
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  });

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetchProfile(userId)
      .then((p) => !cancelled && setProfile(p))
      .catch((e) => !cancelled && setError(explainError(e)));
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  // Оптимистично меняем профиль, при ошибке откатываем. Возвращает true, если сохранилось
  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      const previous = profileRef.current;
      if (!previous) return false;
      const next: Profile = { ...previous, ...patch };
      profileRef.current = next; // следующий вызов подряд должен видеть уже новые данные
      setProfile(next);
      try {
        await saveProfile(next);
        return true;
      } catch (e) {
        profileRef.current = previous;
        setProfile(previous);
        showSnackbar(`Не удалось сохранить: ${explainError(e)}`, "error");
        return false;
      }
    },
    [showSnackbar],
  );

  const register = useCallback(
    async (data: NewProfile) => setProfile(await createProfile(userId, data)),
    [userId],
  );

  const value = useMemo(
    () => (profile ? { profile, name: fullName(profile), myId: userId, updateProfile } : null),
    [profile, userId, updateProfile],
  );

  if (error) {
    return <Splash error={error} onRetry={() => setAttempt((n) => n + 1)} />;
  }
  if (profile === undefined) return <Splash />;
  if (profile === null) return <Onboarding onSubmit={register} />;

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile нужно вызывать внутри <ProfileProvider>");
  return context;
}
