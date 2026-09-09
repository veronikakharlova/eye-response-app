import { useMemo } from 'react'
import Plot from 'react-plotly.js'
import Header from '../layout/Header'
import { ChartSkeleton, ErrorState } from '../components/StateViews'
import { PATHOLOGY_LABELS, PATHOLOGY_STATS, Pathology, classifyPatient } from '../data/csfModel'
import { usePatientsData } from '../lib/PatientsDataContext'
import { toPatientRecord } from '../lib/patientRecord'
import '../layout/layout.css'
import '../App.css'

const ORDER: Pathology[] = ['norm', 'myopia', 'amd', 'glaucoma']

// Один цвет на группу патологии, одинаковый везде на странице (столбцы,
// точки пациентов, подписи статистики) — так что цвет один раз выучивается
// и потом читается сам, без обращения к легенде каждый раз заново.
const PATHOLOGY_COLORS: Record<Pathology, string> = {
  norm: '#2f9e6b',
  myopia: '#3b82f6',
  amd: '#d6336c',
  glaucoma: '#f59e0b',
}

// На точечной диаграмме 4 группы отличаются только по цвету — для дальтоника
// (особенно при путанице зелёный/оранжевый) это ненадёжно. Форма маркера —
// второй, независимый от цвета канал: те же фигуры пригодятся и в легенде,
// и на скриншотах в кейсе для датавиз-раздела.
const PATHOLOGY_SYMBOLS: Record<Pathology, string> = {
  norm: 'circle',
  myopia: 'square',
  amd: 'triangle-up',
  glaucoma: 'cross',
}

type FeatureKey = 'phase1' | 'slopePFC' | 'nfHf' | 'nf' | 'vf'

const FEATURES: { key: FeatureKey; title: string }[] = [
  { key: 'phase1', title: 'Фаза 1-й гармоники, рад' },
  { key: 'slopePFC', title: 'Наклон ФЧХ, рад/Гц' },
  { key: 'nfHf', title: 'НЧ / ВЧ' },
  { key: 'nf', title: 'НЧ (20-50 Гц)' },
  { key: 'vf', title: 'ВЧ (51-81 Гц)' },
]

export default function AnalyticsPage() {
  const { patients, loading, error } = usePatientsData()

  // Все реальные визиты (глаз = один визит), а не только 4 средних по
  // группам — нужно для точечной диаграммы и для честного пересчёта
  // точности классификации на текущих данных, а не на цитате из ВКР.
  const records = useMemo(
    () => patients.flatMap((p) => p.records.map((r) => toPatientRecord(r, p.pathology))),
    [patients],
  )

  const accuracy = useMemo(() => {
    if (records.length === 0) return null
    const withMatch = records.map((r) => ({ pathology: r.pathology, match: classifyPatient(r).nearest === r.pathology }))
    const overall = withMatch.filter((r) => r.match).length / withMatch.length
    const byGroup = ORDER.map((pathology) => {
      const group = withMatch.filter((r) => r.pathology === pathology)
      const matchCount = group.filter((r) => r.match).length
      return { pathology, matchCount, total: group.length, pct: group.length ? matchCount / group.length : 0 }
    })
    return { overallPct: overall, overallMatch: withMatch.filter((r) => r.match).length, total: withMatch.length, byGroup }
  }, [records])

  const barTraces = FEATURES.map((f, i) => ({
    x: ORDER.map((p) => PATHOLOGY_LABELS[p]),
    y: ORDER.map((p) => PATHOLOGY_STATS[p].mean[f.key]),
    type: 'bar' as const,
    marker: { color: ORDER.map((p) => PATHOLOGY_COLORS[p]) },
    xaxis: i === 0 ? 'x' : `x${i + 1}`,
    yaxis: i === 0 ? 'y' : `y${i + 1}`,
    showlegend: false,
    hovertemplate: '%{x}: %{y}<extra></extra>',
  }))

  const barLayout: Record<string, unknown> = {
    grid: { rows: 2, columns: 3, pattern: 'independent' as const },
    height: 460,
    margin: { t: 10, r: 16, b: 40, l: 50 },
    font: { family: 'Inter, system-ui, sans-serif', size: 12 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  }
  FEATURES.forEach((f, i) => {
    const n = i === 0 ? '' : String(i + 1)
    barLayout[`yaxis${n}`] = { title: f.title, titlefont: { size: 11 } }
    barLayout[`xaxis${n}`] = { tickfont: { size: 10.5 } }
  })

  const scatterTraces = [
    ...ORDER.map((pathology) => {
      const points = records.filter((r) => r.pathology === pathology)
      return {
        x: points.map((r) => r.phase1),
        y: points.map((r) => r.slopePFC),
        type: 'scatter' as const,
        mode: 'markers' as const,
        name: PATHOLOGY_LABELS[pathology],
        marker: {
          color: PATHOLOGY_COLORS[pathology],
          symbol: PATHOLOGY_SYMBOLS[pathology],
          size: pathology === 'amd' ? 9 : 8,
          opacity: 0.75,
        },
        hovertemplate: '%{text}<br>фаза 1: %{x}<br>наклон ФЧХ: %{y}<extra></extra>',
        text: points.map((r) => `${r.code} ${r.eye}`),
      }
    }),
    {
      x: ORDER.map((p) => PATHOLOGY_STATS[p].mean.phase1),
      y: ORDER.map((p) => PATHOLOGY_STATS[p].mean.slopePFC),
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Среднее по группе',
      marker: {
        symbol: 'diamond',
        size: 15,
        color: ORDER.map((p) => PATHOLOGY_COLORS[p]),
        line: { color: '#1f2430', width: 1.5 },
      },
      hovertemplate: '%{text}<extra></extra>',
      text: ORDER.map((p) => `Среднее: ${PATHOLOGY_LABELS[p]}`),
    },
  ]

  return (
    <div>
      <Header title="Аналитика по группам патологий" />
      <p className="page-subtitle">
        Средние значения признаков по 4 группам патологий, разброс по отдельным пациентам и точность классификации на текущих данных.
      </p>

      <div className="data-card" style={{ padding: 'var(--space-20) var(--space-24)', marginBottom: 'var(--space-20)' }}>
        <span className="panel__label">Средние по группам</span>
        <Plot
          data={barTraces}
          layout={barLayout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%' }}
        />
      </div>

      <div className="data-card" style={{ marginBottom: 'var(--space-20)' }}>
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Патология</th>
                <th>Фаза 1-й гарм., рад</th>
                <th>Наклон ФЧХ, рад/Гц</th>
                <th>НЧ/ВЧ</th>
                <th>НЧ</th>
                <th>ВЧ</th>
              </tr>
            </thead>
            <tbody>
              {ORDER.map((key) => {
                const stats = PATHOLOGY_STATS[key].mean
                return (
                  <tr key={key} style={{ cursor: 'default' }}>
                    <td>
                      <span
                        className="chip"
                        style={{ background: `${PATHOLOGY_COLORS[key]}1a`, color: PATHOLOGY_COLORS[key] }}
                      >
                        {PATHOLOGY_LABELS[key]}
                      </span>
                    </td>
                    <td>{stats.phase1.toFixed(2)}</td>
                    <td>{stats.slopePFC.toFixed(2)}</td>
                    <td>{stats.nfHf.toFixed(1)}</td>
                    <td>{stats.nf.toFixed(1)}</td>
                    <td>{stats.vf.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="data-card" style={{ padding: 'var(--space-20) var(--space-24)', marginBottom: 'var(--space-20)' }}>
        <span className="panel__label">Пациенты по признакам (не только средние)</span>
        <p style={{ margin: '0 0 var(--space-4)', fontSize: 13, color: 'var(--muted)' }}>
          Каждая точка — один визит (глаз) одного пациента, ромбы — средние по группе. Группы сильно перекрываются между собой: таблица выше показывает только средние и скрывает этот разброс.
        </p>
        {loading ? (
          <ChartSkeleton height={420} />
        ) : error ? (
          <ErrorState title="Не удалось загрузить пациентов" description={error} />
        ) : (
          <Plot
            data={scatterTraces}
            layout={{
              height: 420,
              margin: { t: 16, r: 16, b: 48, l: 56 },
              font: { family: 'Inter, system-ui, sans-serif', size: 12 },
              xaxis: { title: 'Фаза 1-й гармоники, рад' },
              yaxis: { title: 'Наклон ФЧХ, рад/Гц' },
              legend: { orientation: 'h', y: -0.22 },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        )}
      </div>

      <div className="data-card" style={{ padding: 'var(--space-20) var(--space-24)', marginBottom: 'var(--space-20)' }}>
        <span className="panel__label">Точность классификации на текущих данных</span>
        {loading ? (
          <ChartSkeleton height={140} />
        ) : error ? (
          <ErrorState title="Не удалось загрузить пациентов" description={error} />
        ) : accuracy ? (
          <>
            <div className="features__derived">
              <span>Совпадение метода с диагнозом, все визиты</span>
              <strong>
                {(accuracy.overallPct * 100).toFixed(0)}% ({accuracy.overallMatch}/{accuracy.total})
              </strong>
            </div>
            <div className="features__grid" style={{ marginTop: 'var(--space-10)', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {accuracy.byGroup.map((g) => (
                <div key={g.pathology}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: PATHOLOGY_COLORS[g.pathology],
                        display: 'inline-block',
                      }}
                    />
                    {PATHOLOGY_LABELS[g.pathology]}
                  </span>
                  <strong>
                    {g.total ? (g.pct * 100).toFixed(0) : '—'}% {g.total ? `(${g.matchCount}/${g.total})` : ''}
                  </strong>
                </div>
              ))}
            </div>
            <p style={{ margin: 'var(--space-10) var(--space-2) 0', fontSize: 12.5, color: 'var(--muted)' }}>
              Пересчитано методом городских кварталов (см. «О проекте») по всем текущим визитам. Число не статичное: оно пересчитывается заново на сегодняшних данных приложения.
            </p>
          </>
        ) : null}
      </div>

      <p className="page-subtitle" style={{ marginTop: 'var(--space-18)' }}>
        Наклон ФЧХ и фаза 1-й гармоники растут в одном и том же порядке патологий (Норма → Миопия → ВМД → Глаукома). Это единственная закономерность, которая на текущих данных выглядит достаточно устойчивой. Разброс внутри каждой группы велик, особенно у НЧ/ВЧ (см. точки выше).
      </p>
    </div>
  )
}
