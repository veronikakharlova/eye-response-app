import Modal from './Modal'

export type PatientFilters = {
  /** 'all' | 'match' (классификация совпала с диагнозом) | 'mismatch' */
  matchState: 'all' | 'match' | 'mismatch'
  /** 'all' | 'both' (оба глаза в базе) | 'one' (только один) */
  eyesState: 'all' | 'both' | 'one'
}

export const DEFAULT_PATIENT_FILTERS: PatientFilters = { matchState: 'all', eyesState: 'all' }

type Props = {
  value: PatientFilters
  onChange: (value: PatientFilters) => void
  onClose: () => void
}

/** Доп. фильтры для страницы «Пациенты» — то, чего нет среди быстрых кнопок диагноза сверху. */
export default function PatientFilterModal({ value, onChange, onClose }: Props) {
  return (
    <Modal
      title="Фильтры"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="page-btn" onClick={() => onChange(DEFAULT_PATIENT_FILTERS)}>
            Сбросить
          </button>
          <button type="button" className="page-btn page-btn--primary" onClick={onClose}>
            Готово
          </button>
        </>
      }
    >
      <div className="form-field form-field--full" style={{ marginBottom: 'var(--space-18)' }}>
        <label>Совпадение классификации с диагнозом</label>
        <div className="form-radio-group">
          {[
            { key: 'all', label: 'Все' },
            { key: 'match', label: 'Только совпадающие' },
            { key: 'mismatch', label: 'Только несовпадающие' },
          ].map((opt) => (
            <label key={opt.key}>
              <input
                type="radio"
                name="matchState"
                checked={value.matchState === opt.key}
                onChange={() => onChange({ ...value, matchState: opt.key as PatientFilters['matchState'] })}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-field form-field--full">
        <label>Глаза в базе</label>
        <div className="form-radio-group">
          {[
            { key: 'all', label: 'Не важно' },
            { key: 'both', label: 'Оба глаза' },
            { key: 'one', label: 'Только один глаз' },
          ].map((opt) => (
            <label key={opt.key}>
              <input
                type="radio"
                name="eyesState"
                checked={value.eyesState === opt.key}
                onChange={() => onChange({ ...value, eyesState: opt.key as PatientFilters['eyesState'] })}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}
