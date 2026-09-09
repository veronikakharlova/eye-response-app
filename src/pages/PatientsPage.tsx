import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../layout/Header'
import Pagination from '../components/Pagination'
import TableToolbar, { ActiveChip } from '../components/TableToolbar'
import PatientFilterModal, { DEFAULT_PATIENT_FILTERS, PatientFilters } from '../components/PatientFilterModal'
import AddPatientModal from '../components/AddPatientModal'
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews'
import { PATHOLOGY_LABELS, Pathology, classifyPatient } from '../data/csfModel'
import { usePatientsData } from '../lib/PatientsDataContext'
import { FullPatient } from '../lib/backend'
import { toPatientRecord } from '../lib/patientRecord'
import { formatIsoToRu } from '../lib/dates'
import '../layout/layout.css'

const PAGE_SIZE = 8

const FILTERS: Array<{ key: Pathology | 'all'; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'norm', label: 'Норма' },
  { key: 'myopia', label: 'Миопия' },
  { key: 'glaucoma', label: 'Глаукома' },
  { key: 'amd', label: 'ВМД' },
]

type Row = {
  code: string
  pathology: Pathology
  eyes: string[]
  matchCount: number
  totalCount: number
  fio?: string
  dob?: string | null
  /** Комментарий врача — то, что видно в столбце «Примечание» (придуманный
      для демо-записей, настоящий для 8 реальных кодов группы «Миопия»). */
  comment?: string | null
}

function buildRows(patients: FullPatient[]): Row[] {
  return patients.map((p) => {
    let matchCount = 0
    for (const r of p.records) {
      if (classifyPatient(toPatientRecord(r, p.pathology)).nearest === p.pathology) matchCount += 1
    }
    return {
      code: p.code,
      pathology: p.pathology,
      eyes: p.records.map((r) => r.eye),
      matchCount,
      totalCount: p.records.length,
      fio: p.identity?.fio,
      dob: p.identity?.dob,
      comment: p.identity?.doctor_comment,
    }
  })
}

export default function PatientsPage() {
  const navigate = useNavigate()
  const { patients, loading, error, addPatient } = usePatientsData()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Pathology | 'all'>('all')
  const [page, setPage] = useState(1)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [patientFilters, setPatientFilters] = useState<PatientFilters>(DEFAULT_PATIENT_FILTERS)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)

  const allRows = useMemo(() => buildRows(patients), [patients])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter((r) => {
      if (filter !== 'all' && r.pathology !== filter) return false
      if (q && !r.code.toLowerCase().includes(q) && !(r.fio && r.fio.toLowerCase().includes(q))) return false
      if (patientFilters.matchState === 'match' && r.matchCount !== r.totalCount) return false
      if (patientFilters.matchState === 'mismatch' && r.matchCount === r.totalCount) return false
      if (patientFilters.eyesState === 'both' && r.totalCount < 2) return false
      if (patientFilters.eyesState === 'one' && r.totalCount !== 1) return false
      return true
    })
  }, [allRows, query, filter, patientFilters])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleCheck = (code: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  const activeFilterCount =
    (patientFilters.matchState !== 'all' ? 1 : 0) + (patientFilters.eyesState !== 'all' ? 1 : 0)

  const chips: ActiveChip[] = []
  if (patientFilters.matchState !== 'all') {
    chips.push({
      key: 'match',
      label: patientFilters.matchState === 'match' ? 'Классификация совпадает' : 'Классификация не совпадает',
      onRemove: () => setPatientFilters((f) => ({ ...f, matchState: 'all' })),
    })
  }
  if (patientFilters.eyesState !== 'all') {
    chips.push({
      key: 'eyes',
      label: patientFilters.eyesState === 'both' ? 'Оба глаза в базе' : 'Только один глаз',
      onRemove: () => setPatientFilters((f) => ({ ...f, eyesState: 'all' })),
    })
  }

  return (
    <div>
      <Header title="Пациенты" />

      <p className="page-subtitle">
        {rows.length} пациент{rows.length === 1 ? '' : rows.length < 5 ? 'а' : 'ов'} в базе исследования
      </p>

      <div className="page-toolbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`page-btn ${filter === f.key ? 'page-btn--primary' : ''}`}
            onClick={() => {
              setFilter(f.key)
              setPage(1)
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <TableToolbar
        searchValue={query}
        onSearchChange={(v) => {
          setQuery(v)
          setPage(1)
        }}
        searchPlaceholder="Поиск по ФИО или коду…"
        onOpenFilter={() => setFilterModalOpen(true)}
        filterCount={activeFilterCount}
        chips={chips}
        addLabel="+ Добавить пациента"
        onAdd={() => setAddModalOpen(true)}
      />

      <div className="data-card">
        {error ? (
          <ErrorState title="Не удалось загрузить пациентов" description={error} />
        ) : loading ? (
          <TableSkeleton rows={PAGE_SIZE} cols={8} />
        ) : (
          <>
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Код</th>
                    <th>ФИО</th>
                    <th>Дата рождения</th>
                    <th>Диагноз</th>
                    <th>Глаза в базе</th>
                    <th>Классификация</th>
                    <th>Примечание</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.code} onClick={() => navigate(`/patients/${r.code}`)}>
                      <td onClick={(e) => toggleCheck(r.code, e)}>
                        <input
                          type="checkbox"
                          className="data-table__checkbox"
                          checked={checked.has(r.code)}
                          onChange={() => {}}
                        />
                      </td>
                      <td>
                        <div className="data-table__name-cell">
                          <span className="data-table__avatar">{r.code.slice(0, 2)}</span>
                          <span className="data-table__name-main">{r.code}</span>
                        </div>
                      </td>
                      {/* ФИО и дата рождения — такой же факт из базы, как код или
                          диагноз, а не второстепенный текст, поэтому обычным
                          цветом и размером, без .data-table__name-sub — эту
                          приглушённую роль в строке несёт только примечание. */}
                      <td>{r.fio ?? '—'}</td>
                      <td>{formatIsoToRu(r.dob) ?? '—'}</td>
                      <td>
                        <span className="chip">{PATHOLOGY_LABELS[r.pathology]}</span>
                      </td>
                      <td>{r.eyes.map((e) => (e === 'R' ? 'Правый' : 'Левый')).join(', ')}</td>
                      <td>
                        {r.matchCount}/{r.totalCount} согласуется
                      </td>
                      <td className="data-table__name-sub" style={{ maxWidth: 280 }}>
                        {r.comment ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          title="Пациенты не найдены"
                          description={
                            query || activeFilterCount > 0
                              ? 'Ничего не совпало. Проверьте код или уберите часть фильтров.'
                              : 'В этой группе пока нет ни одного пациента.'
                          }
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="data-card__footer">
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                Страница {page} из {pageCount}
              </span>
              <Pagination page={page} pageCount={pageCount} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {filterModalOpen && (
        <PatientFilterModal
          value={patientFilters}
          onChange={setPatientFilters}
          onClose={() => setFilterModalOpen(false)}
        />
      )}

      {addModalOpen && (
        <AddPatientModal
          onClose={() => setAddModalOpen(false)}
          onAdd={async (record) => {
            await addPatient({
              code: record.code,
              pathology: record.pathology,
              eye: record.eye,
              phase1: record.phase1,
              slopePfc: record.slopePFC,
              nf: record.nf,
              vf: record.vf,
              note: record.note,
            })
          }}
        />
      )}
    </div>
  )
}
