import type { ReactNode } from "react";
import type { Icon as IconType } from "../Icons";

// Заглушка пустой вкладки: иконка + текст
export default function MediaEmpty({
  Icon,
  children,
}: {
  Icon: IconType;
  children: ReactNode;
}) {
  return (
    <div className="media__empty">
      <Icon size={32} />
      {children}
    </div>
  );
}
