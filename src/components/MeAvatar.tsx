import Avatar, { type AvatarProps } from "./Avatar";
import { useProfile } from "../context/ProfileContext";

// Аватар текущего пользователя — всегда актуальный из профиля.
// Пока фото не загружено — серый кружок с силуэтом, как в VK
export default function MeAvatar(props: Omit<AvatarProps, "name" | "color" | "src">) {
  const { profile, name } = useProfile();
  return (
    <Avatar name={name} color={profile.color} src={profile.avatar} {...props} />
  );
}
