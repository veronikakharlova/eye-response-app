import { useState } from 'react'
import Plot from 'react-plotly.js'
import { PATIENT_COLOR } from './CSFChart'
import { ChartSkeleton } from './StateViews'
import { formatIsoToRu } from '../lib/dates'

export type VisitPoint = {
  visit_date: string
  phase1: number
  slope_pfc: number
  nf: number
}

type Props = {
  visits: VisitPoint[]
  height?: number
}

const PANELS: { key: keyof Omit<VisitPoint, 'visit_date'>; title: string }[] = [
  { key: 'phase1', title: 'Фаза 1-й гармоники, рад' },
  { key: 'slope_pfc', title: 'Наклон ФЧХ, рад/Гц' },
  { key: 'nf', title: 'НЧ (20-50 Гц)' },
]

/**
 * Тренд трёх признаков по визитам одного глаза одного пациента — то, ради
 * чего вообще имеет смысл вести историю визитов (addVisit), а не только
 * хранить её в базе. Честно показывает то количество точек, которое реально
 * есть: один визит — одна точка без линии, а не выдуманная динамика.
 *
 * Дата на оси X — категориальная (не числовая ось времени): в демо-режиме
 * у части старых записей даты нет вовсе (visit_date: ''), и тогда подписью
 * становится просто порядковый номер визита, а не придуманная дата.
 */
export default function VisitTrendChart({ visits, height = 220 }: Props) {
  const [ready, setReady] = useState(false)

  const sorted = [...visits].sort((a, b) => a.visit_date.localeCompare(b.visit_date))
  const labels = sorted.map((v, i) => (v.visit_date ? formatIsoToRu(v.visit_date) ?? v.visit_date : `Визит ${i + 1}`))

  if (sorted.length === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <ChartSkeleton height={height} />
        </div>
      )}
      <div style={{ opacity: ready ? 1 : 0 }}>
        <Plot
          onInitialized={() => setReady(true)}
          onUpdate={() => setReady(true)}
          data={PANELS.map((panel, i) => ({
            x: labels,
            y: sorted.map((v) => v[panel.key]),
            type: 'scatter' as const,
            mode: sorted.length > 1 ? ('lines+markers' as const) : ('markers' as const),
            line: { color: PATIENT_COLOR, width: 2.5 },
            marker: { color: PATIENT_COLOR, size: 7 },
            xaxis: i === 0 ? 'x' : `x${i + 1}`,
            yaxis: i === 0 ? 'y' : `y${i + 1}`,
            hovertemplate: '%{x}<br>%{y}<extra></extra>',
            showlegend: false,
          }))}
          layout={{
            grid: { rows: 1, columns: 3, pattern: 'independent' as const },
            height,
            margin: { t: 22, r: 16, b: 36, l: 44 },
            font: { family: 'Inter, system-ui, sans-serif', size: 12 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            xaxis: { type: 'category', title: undefined, tickfont: { size: 10.5 } },
            xaxis2: { type: 'category', title: undefined, tickfont: { size: 10.5 } },
            xaxis3: { type: 'category', title: undefined, tickfont: { size: 10.5 } },
            yaxis: { title: PANELS[0].title, titlefont: { size: 11 } },
            yaxis2: { title: PANELS[1].title, titlefont: { size: 11 } },
            yaxis3: { title: PANELS[2].title, titlefont: { size: 11 } },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}
