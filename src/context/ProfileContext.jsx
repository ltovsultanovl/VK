import { createContext, useContext, useMemo } from "react";
import { defaultProfile } from "../data";
import { fullName } from "../profile";
import { useStoredState } from "../hooks";

const ProfileContext = createContext(null);

// Мержим с дефолтом, чтобы новые поля не ломали старые сохранения
const reviveProfile = (saved) => ({
  ...defaultProfile,
  ...saved,
  contacts: { ...defaultProfile.contacts, ...saved.contacts },
  interests: { ...defaultProfile.interests, ...saved.interests },
  education: { ...defaultProfile.education, ...saved.education },
  career: { ...defaultProfile.career, ...saved.career },
});

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useStoredState("profile", defaultProfile, {
    revive: reviveProfile,
  });

  const value = useMemo(
    () => ({
      profile,
      name: fullName(profile),
      updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
    }),
    [profile, setProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile нужно вызывать внутри <ProfileProvider>");
  return context;
}
