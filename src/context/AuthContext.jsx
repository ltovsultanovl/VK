import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

// Сессия Supabase: undefined — ещё проверяем, null — не вошёл, объект — вошёл.
// recovering — пользователь пришёл по ссылке «Восстановить пароль» и должен задать новый
export function AuthProvider({ children }) {
  const [session, setSession] = useState(supabase ? undefined : null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setRecovering(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ session, recovering, finishRecovery: () => setRecovering(false) }),
    [session, recovering],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
