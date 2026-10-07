import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  acceptFriendRequest,
  explainError,
  fetchFriendships,
  removeFriendship,
  sendFriendRequest,
} from "../api";
import { useProfile } from "./ProfileContext";
import { useSnackbar } from "../components/Snackbar";

const FriendsContext = createContext(null);

// Мои друзья и заявки. Обновляются в реальном времени: заявка от другого
// человека появляется без перезагрузки
export function FriendsProvider({ children }) {
  const { myId } = useProfile();
  const showSnackbar = useSnackbar();
  const [links, setLinks] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLinks(await fetchFriendships(myId));
      setStatus("ready");
    } catch (e) {
      setError(explainError(e));
      setStatus("error");
    }
  }, [myId]);

  useEffect(() => {
    reload();
    const channel = supabase
      .channel("friendships")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  // Действие с заявкой: запрос → перечитываем список; ошибка — в уведомление
  const run = useCallback(
    async (action, success) => {
      try {
        await action();
        await reload();
        if (success) showSnackbar(success);
        return true;
      } catch (e) {
        showSnackbar(explainError(e), "error");
        await reload();
        return false;
      }
    },
    [reload, showSnackbar],
  );

  const value = useMemo(() => {
    const byStatus = (s) => links.filter((l) => l.status === s).map((l) => l.person);
    const statusById = new Map(links.map((l) => [l.person.id, l.status]));
    return {
      status,
      error,
      reload,
      friends: byStatus("friend"),
      incoming: byStatus("incoming"),
      outgoing: byStatus("outgoing"),
      // friend | incoming | outgoing | none
      relationTo: (userId) => statusById.get(userId) ?? "none",
      sendRequest: (person) => run(() => sendFriendRequest(person.id), "Заявка отправлена"),
      accept: (person) => run(() => acceptFriendRequest(myId, person.id), `${person.firstName} теперь у вас в друзьях`),
      decline: (person) => run(() => removeFriendship(myId, person.id), "Заявка отклонена"),
      cancel: (person) => run(() => removeFriendship(myId, person.id), "Заявка отменена"),
      remove: (person) => run(() => removeFriendship(myId, person.id), `${person.firstName} удалён(а) из друзей`),
    };
  }, [links, status, error, reload, run, myId]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() {
  const context = useContext(FriendsContext);
  if (!context) throw new Error("useFriends нужно вызывать внутри <FriendsProvider>");
  return context;
}
