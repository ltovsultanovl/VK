import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Без ключей в .env.local приложение показывает инструкцию по подключению и не обращается к серверу.
// Клиент создаём всегда (с заглушкой), чтобы в коде не проверять его на null
export const supabaseConfigured = Boolean(url && key);
export const supabase = createClient(url || "http://localhost", key || "not-configured");
