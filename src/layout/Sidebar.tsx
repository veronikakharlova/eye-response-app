import { NavLink } from 'react-router-dom'
import './layout.css'

type NavItem = {
  to: string
  label: string
  icon: JSX.Element
}

const ICONS = {
  patients: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="4.5" rx="1.5" />
      <rect x="3" y="10.5" width="18" height="4.5" rx="1.5" />
      <rect x="3" y="17" width="18" height="4.5" rx="1.5" />
    </svg>
  ),
  myopia: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <circle cx="9" cy="11" r="1.8" />
      <path d="M6 16c0.6-1.8 2.1-2.6 3-2.6s2.4 0.8 3 2.6" />
      <path d="M15 10h3M15 13h3" />
    </svg>
  ),
  analytics: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  ),
  reports: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13.5h7M8.5 16.5h5" />
    </svg>
  ),
  about: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 8v.01" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.2 12a7.2 7.2 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.1-1.2L14.3 3h-4.6l-.4 2.6a7.5 7.5 0 0 0-2.1 1.2l-2.3-.9-2 3.4 2 1.5A7.2 7.2 0 0 0 4.8 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2.1 1.2l.4 2.6h4.6l.4-2.6c.8-.3 1.5-.7 2.1-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
    </svg>
  ),
  help: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.5 2.5 0 0 1 4.9.8c0 1.6-2.4 1.9-2.4 3.6" strokeLinecap="round" />
      <path d="M12 17v.01" strokeLinecap="round" />
    </svg>
  ),
}

// Пункт «Миопия» ведёт на страницу с реальными ФИО пациентов — она
// существует только в dev-сборке (см. App.tsx), поэтому и ссылку в меню
// показываем только там, иначе в проде вела бы на несуществующий роут.
const TOP_ITEMS: NavItem[] = [
  { to: '/patients', label: 'Пациенты', icon: ICONS.patients },
  ...(import.meta.env.DEV ? [{ to: '/myopia', label: 'Миопия (ФИО)', icon: ICONS.myopia }] : []),
  { to: '/analytics', label: 'Аналитика', icon: ICONS.analytics },
  { to: '/reports', label: 'Отчёты', icon: ICONS.reports },
  { to: '/about', label: 'О проекте', icon: ICONS.about },
]

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__logo" title="Частотная характеристика зрения">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" stroke="white" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3" fill="white" />
        </svg>
      </div>

      <nav className="app-sidebar__nav">
        {TOP_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) => `app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
          >
            {item.icon}
          </NavLink>
        ))}
      </nav>

      <div className="app-sidebar__bottom">
        <NavLink
          to="/help"
          title="Помощь"
          className={({ isActive }) => `app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
        >
          {ICONS.help}
        </NavLink>
        <NavLink
          to="/settings"
          title="Настройки"
          className={({ isActive }) => `app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
        >
          {ICONS.settings}
        </NavLink>
      </div>
    </aside>
  )
}
