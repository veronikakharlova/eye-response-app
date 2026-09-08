import './state-views.css'

/** Один "пульсирующий" прямоугольник-заглушка. */
export function SkeletonBlock({ width, height, radius = 8 }: { width?: string | number; height: number; radius?: number }) {
  return <div className="skeleton-block" style={{ width, height, borderRadius: radius }} />
}

/** Заглушка для таблицы: несколько строк-полосок вместо реальных данных. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <table className="data-table">
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r} style={{ cursor: 'default' }}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}>
                <SkeletonBlock height={14} width={c === 0 ? '70%' : `${55 + ((r + c) % 3) * 12}%`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Заглушка для графика — держит место ровно той же высоты, что и сам Plotly-график. */
export function ChartSkeleton({ height = 760 }: { height?: number }) {
  return (
    <div className="chart-skeleton" style={{ height }}>
      <div className="chart-skeleton__panel">
        <SkeletonBlock height={14} width="30%" />
        <SkeletonBlock height={200} radius={12} />
      </div>
      <div className="chart-skeleton__panel">
        <SkeletonBlock height={14} width="24%" />
        <SkeletonBlock height={140} radius={12} />
      </div>
      <div className="chart-skeleton__panel">
        <SkeletonBlock height={14} width="26%" />
        <SkeletonBlock height={140} radius={12} />
      </div>
    </div>
  )
}

type EmptyStateProps = {
  title: string
  description?: string
  icon?: 'search' | 'inbox'
}

/** Пустое состояние: ничего не найдено / список пуст. Не ошибка — просто нечего показать. */
export function EmptyState({ title, description, icon = 'search' }: EmptyStateProps) {
  return (
    <div className="state-view">
      <div className="state-view__icon state-view__icon--muted">
        {icon === 'search' ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 12h4l2 3h4l2-3h4" />
            <path d="M6 5h12l2 7v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7Z" />
          </svg>
        )}
      </div>
      <p className="state-view__title">{title}</p>
      {description && <p className="state-view__desc">{description}</p>}
    </div>
  )
}

type ErrorStateProps = {
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

/** Состояние ошибки: что-то не найдено/не получилось — с внятным текстом и действием. */
export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <div className="state-view">
      <div className="state-view__icon state-view__icon--warn">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 9v4.5M12 17v.01" strokeLinecap="round" />
          <path d="M10.3 4.5 2.9 17.2a1.6 1.6 0 0 0 1.4 2.4h15.4a1.6 1.6 0 0 0 1.4-2.4L13.7 4.5a1.6 1.6 0 0 0-2.8 0Z" />
        </svg>
      </div>
      <p className="state-view__title">{title}</p>
      {description && <p className="state-view__desc">{description}</p>}
      {action && (
        <button type="button" className="page-btn page-btn--primary" style={{ marginTop: 14 }} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
