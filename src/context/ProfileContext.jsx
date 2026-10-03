import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultProfile } from "../data";
import { fullName } from "../profile";

const STORAGE_KEY = "profile";
const ProfileContext = createContext(null);

const readProfile = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return defaultProfile;
    // Мержим с дефолтом, чтобы новые поля не ломали старые сохранения
    return {
      ...defaultProfile,
      ...saved,
      contacts: { ...defaultProfile.contacts, ...saved.contacts },
      interests: { ...defaultProfile.interests, ...saved.interests },
      education: { ...defaultProfile.education, ...saved.education },
      career: { ...defaultProfile.career, ...saved.career },
    };
  } catch {
    return defaultProfile;
  }
};

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(readProfile);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* переполнение хранилища — профиль живёт до перезагрузки */
    }
  }, [profile]);

  const value = useMemo(
    () => ({
      profile,
      name: fullName(profile),
      updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
    }),
    [profile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
