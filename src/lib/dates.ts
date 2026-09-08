/**
 * Даты в приложении показываются в привычном ДД.ММ.ГГГГ (как в исходных
 * файлах прибора и в интерфейсе), а в Supabase хранятся как обычный
 * Postgres `date` (ГГГГ-ММ-ДД). Эти две функции — единственное место, где
 * форматы конвертируются друг в друга.
 */

export function parseRuDateToIso(value: string | undefined | null): string | null {
  if (!value) return null
  const m = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  return `${yyyy}-${mm}-${dd}`
}

export function formatIsoToRu(value: string | undefined | null): string | null {
  if (!value) return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return value
  const [, yyyy, mm, dd] = m
  return `${dd}.${mm}.${yyyy}`
}

/** "сегодня" / "вчера" / "N дней назад" по timestamptz из Supabase (created_at и т.п.). */
export function formatRelativeRu(isoTimestamp: string): string {
  const then = new Date(isoTimestamp)
  const diffDays = Math.floor((Date.now() - then.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays <= 0) return 'сегодня'
  if (diffDays === 1) return 'вчера'
  if (diffDays < 7) return `${diffDays} дн. назад`
  const weeks = Math.round(diffDays / 7)
  if (diffDays < 30) return `${weeks} нед. назад`
  return then.toLocaleDateString('ru-RU')
}
