import { useNavigate } from 'react-router-dom'
import Modal from './Modal'
import { EmptyState } from './StateViews'
import { PATHOLOGY_LABELS } from '../data/csfModel'
import { usePatientsData } from '../lib/PatientsDataContext'
import { computeMismatches, computeRecentlyAdded } from '../lib/notifications'
import { formatRelativeRu } from '../lib/dates'
import './notifications.css'

type Props = {
  onClose: () => void
}

/**
 * Уведомления — не выдуманная лента, а то, что реально можно посчитать по
 * текущим данным пациентов (см. lib/notifications.ts): расхождение
 * авто-классификации с диагнозом и недавно добавленные записи. Собрано на
 * общем Modal, как фильтры и форма добавления пациента — тот же визуальный
 * язык, что и везде в приложении.
 */
export default function NotificationsModal({ onClose }: Props) {
  const navigate = useNavigate()
  const { patients } = usePatientsData()

  const mismatches = computeMismatches(patients)
  const recent = computeRecentlyAdded(patients)
  const isEmpty = mismatches.length === 0 && recent.length === 0

  const goTo = (code: string) => {
    navigate(`/patients/${code}`)
    onClose()
  }

  return (
    <Modal title="Уведомления" onClose={onClose} width={440}>
      {isEmpty ? (
        <EmptyState
          icon="inbox"
          title="Пока нечего показать"
          description="Ни расхождений с диагнозом, ни новых пациентов за последние две недели."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-22)' }}>
          {mismatches.length > 0 && (
            <section>
              <span className="panel__label">Расхождение с диагнозом ({mismatches.length})</span>
              <div className="notification-list">
                {mismatches.map((m) => (
                  <button key={m.code} type="button" className="notification-item" onClick={() => goTo(m.code)}>
                    <span className="data-table__avatar">{m.code.slice(0, 2)}</span>
                    <span className="notification-item__text">
                      <span className="notification-item__title">
                        {m.code} · {PATHOLOGY_LABELS[m.pathology]}
                      </span>
                      <span className="notification-item__sub">
                        {m.matchCount}/{m.totalCount} согласуется, стоит посмотреть
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <span className="panel__label">Недавно добавленные</span>
              <div className="notification-list">
                {recent.map((r) => (
                  <button key={r.code} type="button" className="notification-item" onClick={() => goTo(r.code)}>
                    <span className="data-table__avatar">{r.code.slice(0, 2)}</span>
                    <span className="notification-item__text">
                      <span className="notification-item__title">
                        {r.code} · {PATHOLOGY_LABELS[r.pathology]}
                      </span>
                      <span className="notification-item__sub">{formatRelativeRu(r.createdAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}
