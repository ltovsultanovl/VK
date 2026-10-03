import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircleIcon } from "./Icons";

const SnackbarContext = createContext(() => {});

// Всплывашка снизу слева, как в VK: «Изменения сохранены»
export function SnackbarProvider({ children }) {
  const [snack, setSnack] = useState(null);

  const show = useCallback((text) => setSnack({ text, id: Date.now() }), []);

  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(() => setSnack(null), 4000);
    return () => clearTimeout(t);
  }, [snack]);

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      {snack && (
        <div className="snackbar" key={snack.id} role="status">
          <CheckCircleIcon size={24} />
          {snack.text}
        </div>
      )}
    </SnackbarContext.Provider>
  );
}

export const useSnackbar = () => useContext(SnackbarContext);
