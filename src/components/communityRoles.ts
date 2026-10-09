import type { CommunityRole } from "../types";

export const ROLE_LABELS: Record<CommunityRole, string> = {
  owner: "Владелец",
  admin: "Администратор",
  editor: "Редактор",
  member: "Участник",
};

// Руководители сообщества: их показываем в «Контактах» и с подписью роли
export const isLeader = (role: CommunityRole) => role !== "member";

// Подпись роли руководителя; у обычного участника — пусто
export const leaderLabel = (role: CommunityRole) => (isLeader(role) ? ROLE_LABELS[role] : "");
