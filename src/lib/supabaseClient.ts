import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Vite подхватывает .env / .env.local сам — переменная должна начинаться
// с VITE_, иначе она не попадёт в собранный фронтенд-бандл.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * true, если в .env.local прописаны настоящие ключи проекта. Пока их нет,
 * приложение продолжает работать на статичных данных (csfModel.ts и
 * т.д.) — ничего не ломается, просто новые функции (реальное сохранение,
 * история визитов, вход врача) остаются недоступны до подключения.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

// anon key — это НЕ секрет: он специально рассчитан на то, чтобы быть
// видимым в коде фронтенда (это подтверждено в переписке — см. .env.local.example).
// Настоящая защита данных — это RLS-политики в supabase/schema.sql,
// которые требуют авторизации для любого чтения/записи.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы — ' +
      'приложение работает на статичных данных. См. .env.local.example.',
  )
}
