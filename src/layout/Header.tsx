import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { usePatientsData } from '../lib/PatientsDataContext'
import { computeMismatches, computeRecentlyAdded } from '../lib/notifications'
import NotificationsModal from '../components/NotificationsModal'
import './layout.css'

type Props = {
  title: string
}

function initialsFromEmail(email: string | undefined): string {
  if (!email) return 'Вр'
  const local = email.split('@')[0]
  const parts = local.split(/[._-]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2)
  return letters.toUpperCase()
}

/**
 * Хедер страницы: заголовок + уведомления/профиль справа — как в референсе
 * Вероники. Настроек здесь больше нет — они уже есть в левом меню, дублировать
 * не стали. Иконка профиля — рабочая ссылка на страницу настроек/врача.
 *
 * Уведомления — не выдуманная лента, а честный вывод того, что уже посчитано
 * по текущим данным (см. lib/notifications.ts): расхождение классификации с
 * диагнозом и недавно добавленные пациенты.
 *
 * Число на бейдже — только недавние добавления: это настоящие события,
 * которые «случились» и рано или поздно будут просмотрены. Расхождения
 * классификации почти всегда есть (метод и в оригинальной ВКР давал
 * согласие меньше чем в половине случаев) — навсегда висящее большое число
 * выглядело бы как накопленные непрочитанные уведомления, а не как факт про
 * метод. Поэтому для них — просто точка, если такие пациенты есть.
 */
export default function Header({ title }: Props) {
  const { session } = useAuth()
  const { patients } = usePatientsData()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const label = isSupabaseConfigured && session ? initialsFromEmail(session.user.email) : 'Вр'
  const recentCount = computeRecentlyAdded(patients).length
  const hasMismatches = computeMismatches(patients).length > 0

  return (
    <header className="app-header">
      <h1 className="app-header__title">{title}</h1>

      <div className="app-header__actions">
        <button
          type="button"
          className="app-header__icon-btn"
          title="Уведомления"
          aria-label="Уведомления"
          onClick={() => setNotificationsOpen(true)}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
            <path d="M10 19a2 2 0 0 0 4 0" />
          </svg>
          {recentCount > 0 ? (
            <span className="app-header__icon-badge">{recentCount}</span>
          ) : (
            hasMismatches && <span className="app-header__icon-badge app-header__icon-badge--dot" />
          )}
        </button>
        <Link to="/settings" className="app-header__avatar" title="Профиль врача" aria-label="Профиль врача">
          {label}
        </Link>
      </div>

      {notificationsOpen && <NotificationsModal onClose={() => setNotificationsOpen(false)} />}
    </header>
  )
}
