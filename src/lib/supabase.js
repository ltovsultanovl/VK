import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Без ключей в .env.local онлайн-чат выключен, мессенджер работает в демо-режиме
export const supabase = url && key ? createClient(url, key) : null;
export const chatEnabled = Boolean(supabase);
