import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import Header from '../layout/Header'
import { ChartSkeleton, ErrorState } from '../components/StateViews'
import { PATHOLOGY_COLORS, PATHOLOGY_LABELS, PATHOLOGY_STATS, Pathology, classifyPatient } from '../data/csfModel'
import { usePatientsData } from '../lib/PatientsDataContext'
import { toPatientRecord } from '../lib/patientRecord'
import '../layout/layout.css'
import '../App.css'

const ORDER: Pathology[] = ['norm', 'myopia', 'amd', 'glaucoma']

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

// Детерминированный псевдослучайный сдвиг точки по X внутри своей колонки
// (jitter) — тот же пациент/глаз/признак всегда получает один и тот же
// сдвиг, чтобы точки не "прыгали" между перерисовками. Не настоящий
// beeswarm с раскладкой без наложений, а простой хэш-джиттер — для 12-17
// точек на группу этого достаточно, чтобы отличить кучу точек друг от
// друга, не считая коллизии всерьёз.
function jitter(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return (((h >>> 0) % 1000) / 1000 - 0.5) * 0.56
}

export default function AnalyticsPage() {
  const { patients, loading, error } = usePatientsData()

  // config={{ displayModeBar: false }} на графике ниже (как и на остальных
  // графиках приложения — свой минималистичный "Сбросить" вместо родного
  // тулбара Plotly) прячет и штатную кнопку "Reset axes". У 5 независимых
  // панелей в одной сетке отслеживать диапазон каждой оси в стейте отдельно
  // (как у CSFChart с одним графиком) — накладно, а свой зум почти всегда
  // разбирают "все панели сразу". Проще: одна кнопка форсит remount графика
  // через key — сбрасывает весь внутренний стейт Plotly (в том числе зум)
  // разом, без ручного учёта диапазона каждой из 5 осей.
  const [stripResetKey, setStripResetKey] = useState(0)

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

  // Раньше тут была одна диаграмма рассеяния на 2 признака (фаза 1-й
  // гармоники × наклон ФЧХ) с 4 группами, различимыми только цветом/формой
  // в одном поле — группы сильно перекрывались, а остальные 3 признака
  // (НЧ/ВЧ, НЧ, ВЧ) в неё не попадали вовсе. Разнесли по той же сетке
  // 2×3, что и график средних: 5 панелей, в каждой — 4 колонки-группы по
  // оси X (не наложение, а соседство), точки — реальные визиты с джиттером,
  // ромб — то же среднее, что было в диаграмме рассеяния и в таблице выше.
  const stripTraces = FEATURES.flatMap((f, i) => {
    const n = i === 0 ? '' : String(i + 1)
    const xaxis = `x${n}`
    const yaxis = `y${n}`
    const pointTraces = ORDER.map((pathology, gi) => {
      const points = records.filter((r) => r.pathology === pathology)
      return {
        x: points.map((r) => gi + jitter(`${r.code}${r.eye}${f.key}`)),
        y: points.map((r) => r[f.key]),
        type: 'scatter' as const,
        mode: 'markers' as const,
        marker: {
          color: PATHOLOGY_COLORS[pathology],
          symbol: PATHOLOGY_SYMBOLS[pathology],
          size: pathology === 'amd' ? 7 : 6.5,
          opacity: 0.75,
        },
        xaxis,
        yaxis,
        showlegend: false,
        hovertemplate: `%{text}<br>${f.title}: %{y}<extra></extra>`,
        text: points.map((r) => `${r.code} ${r.eye} · ${PATHOLOGY_LABELS[pathology]}`),
      }
    })
    const meanTrace = {
      x: ORDER.map((_, gi) => gi),
      y: ORDER.map((p) => PATHOLOGY_STATS[p].mean[f.key]),
      type: 'scatter' as const,
      mode: 'markers' as const,
      marker: {
        symbol: 'diamond',
        size: 12,
        color: ORDER.map((p) => PATHOLOGY_COLORS[p]),
        line: { color: '#1f2430', width: 1.5 },
      },
      xaxis,
      yaxis,
      showlegend: false,
      hovertemplate: '%{text}<extra></extra>',
      text: ORDER.map((p) => `Среднее: ${PATHOLOGY_LABELS[p]}`),
    }
    return [...pointTraces, meanTrace]
  })

  const stripLayout: Record<string, unknown> = {
    grid: { rows: 2, columns: 3, pattern: 'independent' as const },
    height: 460,
    margin: { t: 10, r: 16, b: 40, l: 50 },
    font: { family: 'Inter, system-ui, sans-serif', size: 12 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  }
  FEATURES.forEach((f, i) => {
    const n = i === 0 ? '' : String(i + 1)
    stripLayout[`yaxis${n}`] = { title: f.title, titlefont: { size: 11 } }
    stripLayout[`xaxis${n}`] = {
      tickvals: [0, 1, 2, 3],
      ticktext: ORDER.map((p) => PATHOLOGY_LABELS[p]),
      range: [-0.6, 3.6],
      tickfont: { size: 9.5 },
    }
  })

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="panel__label" style={{ marginBottom: 0 }}>Пациенты по признакам (не только средние)</span>
          <button type="button" className="chart__reset" style={{ marginLeft: 0 }} onClick={() => setStripResetKey((k) => k + 1)}>
            Сбросить
          </button>
        </div>
        <p style={{ margin: 'var(--space-4) 0 var(--space-4)', fontSize: 13, color: 'var(--muted)' }}>
          Каждая точка — один визит (глаз) одного пациента, ромбы — средние по группе. Группы разнесены по колонкам вместо наложения на одном поле: таблица выше показывает только средние и скрывает этот разброс.
        </p>
        {loading ? (
          <ChartSkeleton height={460} />
        ) : error ? (
          <ErrorState title="Не удалось загрузить пациентов" description={error} />
        ) : (
          <Plot
            key={stripResetKey}
            data={stripTraces}
            layout={stripLayout}
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
