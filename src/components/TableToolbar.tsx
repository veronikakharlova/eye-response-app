import './table-toolbar.css'

export type ActiveChip = {
  key: string
  label: string
  onRemove: () => void
}

type Props = {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  /** Фильтр по дате — актуален не для всех страниц (например, у анонимной
      таблицы «Пациенты» даты обследования в данных попросту нет). */
  dateRange?: {
    from: string
    to: string
    onFromChange: (value: string) => void
    onToChange: (value: string) => void
  }
  onOpenFilter: () => void
  /** Сколько доп. фильтров сейчас применено — бэйдж на значке фильтра. */
  filterCount?: number
  chips?: ActiveChip[]
  addLabel: string
  onAdd: () => void
}

/**
 * Тулбар над таблицей: поиск + (опционально) дата + значок доп. фильтров +
 * кнопка добавления справа, чипы активных фильтров под строкой. Один
 * компонент переиспользуется на «Пациентах» и «Миопии» — какие блоки
 * показывать, решает страница через пропсы.
 */
export default function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  dateRange,
  onOpenFilter,
  filterCount = 0,
  chips = [],
  addLabel,
  onAdd,
}: Props) {
  return (
    <div className="table-toolbar">
      <div className="table-toolbar__row">
        <div className="table-toolbar__search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? 'Поиск…'}
          />
        </div>

        {dateRange && (
          <div className="table-toolbar__date">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => dateRange.onFromChange(e.target.value)}
              aria-label="Дата обследования от"
            />
            <span>—</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => dateRange.onToChange(e.target.value)}
              aria-label="Дата обследования до"
            />
          </div>
        )}

        <button
          type="button"
          className={`table-toolbar__filter-btn ${filterCount > 0 ? 'table-toolbar__filter-btn--active' : ''}`}
          onClick={onOpenFilter}
          title="Фильтры"
          aria-label="Открыть фильтры"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
          {filterCount > 0 && <span className="table-toolbar__filter-badge">{filterCount}</span>}
        </button>

        <div className="table-toolbar__spacer" />

        <button type="button" className="page-btn page-btn--primary" onClick={onAdd}>
          {addLabel}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="table-toolbar__chips">
          {chips.map((chip) => (
            <span key={chip.key} className="filter-chip">
              {chip.label}
              <button type="button" onClick={chip.onRemove} aria-label={`Убрать фильтр: ${chip.label}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
