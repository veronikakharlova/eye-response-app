import { useMemo, useState } from 'react'
import Header from '../layout/Header'
import { EmptyState } from '../components/StateViews'
import TableToolbar, { ActiveChip } from '../components/TableToolbar'
import MyopiaFilterModal, { DEFAULT_MYOPIA_FILTERS, MyopiaFilters } from '../components/MyopiaFilterModal'
import AddMyopiaPatientModal from '../components/AddMyopiaPatientModal'
// @ts-ignore — файл с реальными ФИО есть только локально (см. .gitignore
// и App.tsx): в CI-сборке для деплоя его физически нет, и tsc иначе не
// соберёт проект вообще. Сама эта страница в проде не бандлится (App.tsx
// подключает её только за import.meta.env.DEV), так что ошибка резолва
// здесь безопасно подавляется, а не прячет реальный баг.
import { MYOPIA_IDENTITY, MyopiaIdentity } from '../data/myopiaIdentity'
import '../layout/layout.css'

/** «ДД.ММ.ГГГГ[ ЧЧ:ММ:СС]» → «ГГГГ-ММ-ДД» (для сравнения с <input type="date">). */
function ruDateToIso(ruDate: string): string | null {
  const match = ruDate.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
  if (!match) return null
  const [, d, m, y] = match
  return `${y}-${m}-${d}`
}

export default function MyopiaPage() {
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filters, setFilters] = useState<MyopiaFilters>(DEFAULT_MYOPIA_FILTERS)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [extra, setExtra] = useState<MyopiaIdentity[]>([])

  const allRows = useMemo(() => [...MYOPIA_IDENTITY, ...extra], [extra])
  const allStages = useMemo(() => Array.from(new Set(allRows.map((r) => r.stage))), [allRows])
  const allOperators = useMemo(() => Array.from(new Set(allRows.map((r) => r.operator))), [allRows])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter((r) => {
      if (q && !r.code.toLowerCase().includes(q) && !r.fio.toLowerCase().includes(q) && !r.dob.includes(q)) {
        return false
      }
      const testIso = ruDateToIso(r.testDate)
      if (dateFrom && testIso && testIso < dateFrom) return false
      if (dateTo && testIso && testIso > dateTo) return false
      if (filters.stages.length > 0 && !filters.stages.includes(r.stage)) return false
      if (filters.operators.length > 0 && !filters.operators.includes(r.operator)) return false
      if (filters.inApp === 'yes' && !r.inApp) return false
      if (filters.inApp === 'no' && r.inApp) return false
      return true
    })
  }, [allRows, query, dateFrom, dateTo, filters])

  const activeFilterCount =
    filters.stages.length + filters.operators.length + (filters.inApp !== 'all' ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)

  const chips: ActiveChip[] = [
    ...filters.stages.map((s) => ({
      key: `stage-${s}`,
      label: `Стадия: ${s}`,
      onRemove: () => setFilters((f) => ({ ...f, stages: f.stages.filter((x) => x !== s) })),
    })),
    ...filters.operators.map((op) => ({
      key: `op-${op}`,
      label: `Оператор: ${op}`,
      onRemove: () => setFilters((f) => ({ ...f, operators: f.operators.filter((x) => x !== op) })),
    })),
    ...(filters.inApp !== 'all'
      ? [
          {
            key: 'inApp',
            label: filters.inApp === 'yes' ? 'Есть в приложении' : 'Нет в приложении',
            onRemove: () => setFilters((f) => ({ ...f, inApp: 'all' as const })),
          },
        ]
      : []),
    ...(dateFrom || dateTo
      ? [
          {
            key: 'date',
            label: `Дата: ${dateFrom || '…'} — ${dateTo || '…'}`,
            onRemove: () => {
              setDateFrom('')
              setDateTo('')
            },
          },
        ]
      : []),
  ]

  return (
    <div>
      <Header title="Миопия: реальные данные" />

      <div className="privacy-note">
        <span aria-hidden="true">⚠️</span>
        <span>
          На этой странице настоящие ФИО и даты рождения 9 пациентов (заголовки CSV-экспорта прибора RETIport32). Файл с этими данными не включён в git-репозиторий (см. .gitignore), поэтому страница работает только локально, у вас на компьютере. Если решите публиковать приложение, перед деплоем эту страницу нужно будет либо убрать, либо защитить отдельно: одного git-игнора мало, код страницы всё равно попадёт в публичный репозиторий и будет ссылаться на файл, которого там нет. Скажите, когда дойдёте до деплоя, сделаем это аккуратно.
        </span>
      </div>

      <TableToolbar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Поиск по ФИО, коду, дате рождения…"
        dateRange={{ from: dateFrom, to: dateTo, onFromChange: setDateFrom, onToChange: setDateTo }}
        onOpenFilter={() => setFilterModalOpen(true)}
        filterCount={activeFilterCount}
        chips={chips}
        addLabel="+ Добавить пациента"
        onAdd={() => setAddModalOpen(true)}
      />

      <div className="data-card">
        {rows.length === 0 ? (
          <EmptyState
            title="Пациенты не найдены"
            description="Ничего не совпало по поиску, дате или выбранным фильтрам."
          />
        ) : (
          <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Код</th>
                <th>ФИО</th>
                <th>Пол</th>
                <th>Дата рождения</th>
                <th>Возраст (файл)</th>
                <th>Дата записи</th>
                <th>Клиника / оператор</th>
                <th>Стадия</th>
                <th>Есть в приложении</th>
                <th>Примечание</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} style={{ cursor: 'default' }}>
                  <td>
                    <div className="data-table__name-cell">
                      <span className="data-table__avatar">{r.code.slice(0, 2)}</span>
                      <span className="data-table__name-main">{r.code}</span>
                    </div>
                  </td>
                  <td>{r.fio}</td>
                  <td>{r.sex}</td>
                  <td>{r.dob}</td>
                  <td>{r.ageFile}</td>
                  <td>{r.testDate}</td>
                  <td className="data-table__name-sub">
                    {r.clinic.split(' ').slice(0, 2).join(' ')}… / {r.operator}
                  </td>
                  <td>{r.stage}</td>
                  <td>
                    <span
                      className="chip"
                      style={!r.inApp ? { background: 'var(--warn-bg)', color: 'var(--warn-text)' } : undefined}
                    >
                      {r.inApp ? 'Да' : 'Нет'}
                    </span>
                  </td>
                  <td className="data-table__name-sub" style={{ maxWidth: 260 }}>
                    {r.note ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {filterModalOpen && (
        <MyopiaFilterModal
          value={filters}
          onChange={setFilters}
          onClose={() => setFilterModalOpen(false)}
          allStages={allStages}
          allOperators={allOperators}
        />
      )}

      {addModalOpen && (
        <AddMyopiaPatientModal
          onClose={() => setAddModalOpen(false)}
          onAdd={(record) => setExtra((prev) => [...prev, record])}
        />
      )}
    </div>
  )
}
