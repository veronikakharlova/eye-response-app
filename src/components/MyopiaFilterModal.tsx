import Modal from './Modal'

export type MyopiaFilters = {
  stages: string[]
  operators: string[]
  inApp: 'all' | 'yes' | 'no'
}

export const DEFAULT_MYOPIA_FILTERS: MyopiaFilters = { stages: [], operators: [], inApp: 'all' }

type Props = {
  value: MyopiaFilters
  onChange: (value: MyopiaFilters) => void
  onClose: () => void
  allStages: string[]
  allOperators: string[]
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

/** Доп. фильтры для страницы «Миопия»: стадия, оператор прибора, наличие в основном приложении. */
export default function MyopiaFilterModal({ value, onChange, onClose, allStages, allOperators }: Props) {
  return (
    <Modal
      title="Фильтры"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="page-btn" onClick={() => onChange(DEFAULT_MYOPIA_FILTERS)}>
            Сбросить
          </button>
          <button type="button" className="page-btn page-btn--primary" onClick={onClose}>
            Готово
          </button>
        </>
      }
    >
      <div className="form-field form-field--full" style={{ marginBottom: 'var(--space-18)' }}>
        <label>Стадия</label>
        <div className="form-check-group">
          {allStages.map((stage) => (
            <label key={stage}>
              <input
                type="checkbox"
                checked={value.stages.includes(stage)}
                onChange={() => onChange({ ...value, stages: toggle(value.stages, stage) })}
              />
              {stage}
            </label>
          ))}
        </div>
      </div>

      <div className="form-field form-field--full" style={{ marginBottom: 'var(--space-18)' }}>
        <label>Оператор</label>
        <div className="form-check-group">
          {allOperators.map((op) => (
            <label key={op}>
              <input
                type="checkbox"
                checked={value.operators.includes(op)}
                onChange={() => onChange({ ...value, operators: toggle(value.operators, op) })}
              />
              {op}
            </label>
          ))}
        </div>
      </div>

      <div className="form-field form-field--full">
        <label>Есть в основном приложении («Пациенты»)</label>
        <div className="form-radio-group">
          {[
            { key: 'all', label: 'Не важно' },
            { key: 'yes', label: 'Да' },
            { key: 'no', label: 'Нет' },
          ].map((opt) => (
            <label key={opt.key}>
              <input
                type="radio"
                name="inApp"
                checked={value.inApp === opt.key}
                onChange={() => onChange({ ...value, inApp: opt.key as MyopiaFilters['inApp'] })}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}
