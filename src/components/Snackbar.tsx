import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { CheckCircleIcon, InfoIcon } from "./Icons";

type SnackType = "success" | "error" | "info";
export type ShowSnackbar = (text: string, type?: SnackType) => void;

const SnackbarContext = createContext<ShowSnackbar>(() => {});

const ICONS: Record<SnackType, typeof InfoIcon> = {
  success: CheckCircleIcon,
  error: InfoIcon,
  info: InfoIcon,
};

// Всплывашка снизу слева, как в VK: «Изменения сохранены».
// showSnackbar(text, "error" | "info") — для ошибок и подсказок без зелёной галочки
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<{ text: string; type: SnackType; id: number } | null>(null);

  const show = useCallback(
    (text: string, type: SnackType = "success") => setSnack({ text, type, id: Date.now() }),
    [],
  );

  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(() => setSnack(null), 4000);
    return () => clearTimeout(t);
  }, [snack]);

  const Icon = snack ? (ICONS[snack.type] ?? ICONS.success) : null;

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      {snack && (
        <div
          className={`snackbar snackbar--${snack.type}`}
          key={snack.id}
          role={snack.type === "error" ? "alert" : "status"}
        >
          {Icon && <Icon size={24} />}
          {snack.text}
        </div>
      )}
    </SnackbarContext.Provider>
  );
}

export const useSnackbar = () => useContext(SnackbarContext);
