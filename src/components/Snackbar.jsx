import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircleIcon, InfoIcon } from "./Icons";

const SnackbarContext = createContext(() => {});

const ICONS = {
  success: CheckCircleIcon,
  error: InfoIcon,
  info: InfoIcon,
};

// Всплывашка снизу слева, как в VK: «Изменения сохранены».
// showSnackbar(text, "error" | "info") — для ошибок и подсказок без зелёной галочки
export function SnackbarProvider({ children }) {
  const [snack, setSnack] = useState(null);

  const show = useCallback(
    (text, type = "success") => setSnack({ text, type, id: Date.now() }),
    [],
  );

  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(() => setSnack(null), 4000);
    return () => clearTimeout(t);
  }, [snack]);

  const Icon = snack && (ICONS[snack.type] ?? ICONS.success);

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      {snack && (
        <div
          className={`snackbar snackbar--${snack.type}`}
          key={snack.id}
          role={snack.type === "error" ? "alert" : "status"}
        >
          <Icon size={24} />
          {snack.text}
        </div>
      )}
    </SnackbarContext.Provider>
  );
}

export const useSnackbar = () => useContext(SnackbarContext);
