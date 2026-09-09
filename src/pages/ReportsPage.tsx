import { useEffect, useState } from 'react'
import Header from '../layout/Header'
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews'
import { PATHOLOGY_LABELS } from '../data/csfModel'
import { usePatientsData } from '../lib/PatientsDataContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { fetchChartExports, ChartExportRow } from '../lib/backend'
import { formatRelativeRu } from '../lib/dates'
import '../layout/layout.css'

/** RFC4180: оборачиваем в кавычки только то, что реально содержит запятую,
    кавычку или перенос строки — большинство полей так и остаются простыми числами/кодами. */
function csvField(value: string | number): string {
  const str = String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export default function ReportsPage() {
  const { patients } = usePatientsData()
  const [exportsRows, setExportsRows] = useState<ChartExportRow[] | null>(null)
  const [exportsError, setExportsError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    fetchChartExports()
      .then(setExportsRows)
      .catch((e) => setExportsError(e instanceof Error ? e.message : 'Не удалось загрузить журнал.'))
  }, [])

  const totalRecords = patients.reduce((sum, p) => sum + p.records.length, 0)

  // Экспорт в CSV — целиком на клиенте, без бэкенда: берём то же самое
  // usePatientsData(), которым уже пользуются Пациенты/Аналитика, так что
  // выгрузка всегда честно совпадает с тем, что сейчас реально показано в
  // приложении (демо-данные в демо-режиме, реальные — при настроенном Supabase).
  const handleDownloadCsv = () => {
    const header = [
      'Код',
      'Диагноз',
      'Глаз',
      'Дата визита',
      'Фаза 1-й гармоники',
      'Наклон ФЧХ',
      'НЧ',
      'ВЧ',
      'НЧ/ВЧ',
      'Примечание',
    ]
    const rows = patients.flatMap((p) =>
      p.records.map((r) => [
        p.code,
        PATHOLOGY_LABELS[p.pathology],
        r.eye,
        r.visit_date || '',
        r.phase1,
        r.slope_pfc,
        r.nf,
        r.vf,
        r.nf_hf,
        r.research_note ?? '',
      ]),
    )
    const csv = [header, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n')
    // BOM в начале — иначе Excel на Windows показывает кириллицу как кракозябры.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `patients-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Header title="Отчёты" />

      <div className="data-card" style={{ padding: 'var(--space-24) var(--space-32)', maxWidth: 720, marginBottom: 'var(--space-20)' }}>
        <span className="panel__label">Экспорт пациентов</span>
        <p style={{ margin: '0 0 var(--space-16)', fontSize: 14.5, color: 'var(--muted)' }}>
          Выгружает всю таблицу «Пациенты» в CSV: код, диагноз и признаки по каждому визиту обоих глаз. Пригодится для дальнейшего анализа в Excel или Python. Сейчас это {patients.length} пациентов, {totalRecords} визитов.
        </p>
        <button type="button" className="page-btn page-btn--primary" onClick={handleDownloadCsv}>
          Скачать CSV
        </button>
      </div>

      <div className="data-card" style={{ padding: 'var(--space-24) var(--space-32)', maxWidth: 720 }}>
        <span className="panel__label">Журнал скачиваний PDF-графиков</span>
        {!isSupabaseConfigured ? (
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--muted)' }}>
            Журнал ведётся только при настроенном Supabase. Сейчас приложение работает на статичных данных, писать некуда.
          </p>
        ) : exportsError ? (
          <ErrorState title="Не удалось загрузить журнал" description={exportsError} />
        ) : exportsRows === null ? (
          <TableSkeleton rows={4} cols={3} />
        ) : exportsRows.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Пока пусто"
            description="Ещё никто не скачивал график ни одного пациента."
          />
        ) : (
          <div className="data-table-scroll" style={{ marginTop: 'var(--space-10)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Пациент</th>
                  <th>Глаз</th>
                  <th>Когда</th>
                </tr>
              </thead>
              <tbody>
                {exportsRows.map((row) => (
                  <tr key={row.id} style={{ cursor: 'default' }}>
                    <td>{row.code}</td>
                    <td>{row.eye === 'R' ? 'Правый' : 'Левый'}</td>
                    <td>{formatRelativeRu(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
