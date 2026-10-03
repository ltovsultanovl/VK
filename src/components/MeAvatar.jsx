import Avatar from "./Avatar";
import { useProfile } from "../context/ProfileContext";

// Аватар текущего пользователя — всегда актуальный из профиля
export default function MeAvatar(props) {
  const { profile, name } = useProfile();
  return (
    <Avatar name={name} color={profile.color} src={profile.avatar} {...props} />
  );
}
