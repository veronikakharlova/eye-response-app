import { useState } from 'react'
import Plot from 'react-plotly.js'
import { PatientRecord, PATHOLOGY_STATS, buildCurve } from '../data/csfModel'
import { ChartSkeleton } from './StateViews'

type Props = {
  patient: PatientRecord
  /** Видимый диапазон по оси частот, Гц — как числовой ввод диапазона в ВКР-интерфейсе. */
  range?: [number, number]
  /** Вызывается, когда пользователь выделяет область прямо на графике (drag-zoom),
      чтобы синхронизировать инпуты "от/до" с тем, что реально показано. */
  onRangeChange?: (range: [number, number]) => void
  /** Высота всех трёх панелей вместе, px. Раньше было жёстко 760 — вынесли в
      пропс, чтобы страница карточки пациента могла уместить график без
      прокрутки. Домены осей заданы в долях (0.68–1, 0.34–0.62, 0–0.28), так
      что при уменьшении высоты все три панели просто пропорционально сжимаются. */
  height?: number
}

// Кривая всегда считается с запасом за пределами видимого окна — так ввод
// диапазона просто меняет масштаб оси, а не пересчитывает данные заново.
const CURVE_MAX_HZ = 200

// Один цвет на серию, одинаковый на всех трёх графиках: пациент — акцентный
// синий (сплошная линия), норма — нейтральный серый (пунктир). Раньше цвет
// пациента менялся от графика к графику (оранжевый/зелёный/фиолетовый) — из-за
// этого приходилось каждый раз заново искать "свою" линию на новом графике.
export const PATIENT_COLOR = '#1d4fe8'
const NORM_COLOR = '#94a3b8'

/**
 * График в стиле диаграммы Боде: АЧХ, ЛАЧХ (=20*log10(АЧХ), дБ), ФЧХ.
 * Сплошная линия — реконструированная кривая под реальные признаки
 * выбранного пациента, пунктир — реконструкция под средние признаки
 * группы "Норма" (референс для сравнения). Легенда одна, общая для всех
 * трёх панелей (раньше была своя под каждой — три одинаковые подряд,
 * это те же две линии одного смысла и цвета, повторять было избыточно).
 */
export default function CSFChart({ patient, range = [1, 90], onRangeChange, height = 505 }: Props) {
  // Plotly реально грузится и инициализируется асинхронно (движок графика —
  // тяжёлый бандл), особенно на первом рендере страницы. Пока он не
  // отрапортовал onInitialized, поверх места графика показываем скелетон,
  // чтобы не было пустого белого провала. При смене диапазона/пациента
  // (без размонтирования) onInitialized повторно не срабатывает — и это
  // ожидаемо: скелетон должен появляться только один раз, на самом первом
  // построении графика, а не при каждом обновлении данных.
  const [ready, setReady] = useState(false)

  const curve = buildCurve(patient, CURVE_MAX_HZ)
  const normStats = PATHOLOGY_STATS.norm.mean
  const refCurve = buildCurve(normStats, CURVE_MAX_HZ)

  // В самой ВКР АЧХ и ФЧХ строились на линейной оси частот (Рисунок 2.16,
  // 2.17, 4.1 и др. — "Frequency, Hz", метки 0/5/10/…), а ЛАЧХ — отдельно,
  // на логарифмической оси в декадах (стр. 62: "по оси абсцисс… декада —
  // изменение частоты в 10 раз"; Рисунок 4.20 — метки ровно 1, 10, 10²).
  // Поэтому здесь два разных масштаба, а не один общий на все три графика.
  // Сама логарифмическая шкала (декады) — из ВКР, но подписи внутри декады
  // (2, 5, 20, 50…) добавлены сверх оригинала: с подписями только на
  // 1/10/100 ось выглядела заметно "реже" двух других панелей.
  const linRange: [number, number] = [range[0], range[1]]
  const logRange: [number, number] = [Math.log10(Math.max(range[0], 0.1)), Math.log10(Math.max(range[1], range[0] + 0.1))]
  // Plotly умеет подписывать лог-ось делениями "1-2-5" (dtick: 'D2'), но
  // для тиков за пределами первой декады подписывает их голой мантиссой —
  // "2" и "5" вместо "20" и "50", неотличимо от настоящих 2 и 5 Гц в первой
  // декаде. Поэтому считаем деления сами и задаём подписи явно (tickvals/
  // ticktext) — только 1-2-5 внутри каждой декады, попадающие в видимый
  // диапазон, всегда полным числом.
  const lachTicks = (() => {
    const lo = Math.max(range[0], 0.1)
    const hi = Math.max(range[1], lo + 0.1)
    const startDecade = Math.floor(Math.log10(lo))
    const endDecade = Math.ceil(Math.log10(hi))
    const vals: number[] = []
    for (let d = startDecade; d <= endDecade; d++) {
      for (const m of [1, 2, 5]) {
        const v = m * Math.pow(10, d)
        if (v >= lo * 0.999 && v <= hi * 1.001) vals.push(v)
      }
    }
    return { vals, text: vals.map((v) => (v >= 1 ? String(Math.round(v)) : String(v))) }
  })()

  const handleRelayout = (event: Record<string, unknown>) => {
    // АЧХ (xaxis) и ФЧХ (xaxis3) — линейные, значения уже в Гц.
    const linPairs: Array<[string, string]> = [
      ['xaxis.range[0]', 'xaxis.range[1]'],
      ['xaxis3.range[0]', 'xaxis3.range[1]'],
    ]
    for (const [k0, k1] of linPairs) {
      if (typeof event[k0] === 'number' && typeof event[k1] === 'number') {
        onRangeChange?.([Number((event[k0] as number).toFixed(1)), Number((event[k1] as number).toFixed(1))])
        return
      }
    }
    // ЛАЧХ (xaxis2) — логарифмическая, значения приходят в декадах.
    if (typeof event['xaxis2.range[0]'] === 'number' && typeof event['xaxis2.range[1]'] === 'number') {
      const lo = Math.pow(10, event['xaxis2.range[0]'] as number)
      const hi = Math.pow(10, event['xaxis2.range[1]'] as number)
      onRangeChange?.([Number(lo.toFixed(1)), Number(hi.toFixed(1))])
    }
  }

  const freqs = curve.map((p) => p.frequency)
  const amps = curve.map((p) => p.amplitude)
  const logAmps = curve.map((p) => p.logAmplitude)
  const phases = curve.map((p) => p.phase)
  const refAmps = refCurve.map((p) => p.amplitude)
  const refLogAmps = refCurve.map((p) => p.logAmplitude)
  const refPhases = refCurve.map((p) => p.phase)

  const patientLabel = `${patient.code} ${patient.eye}`

  // Общие настройки локальной легенды: горизонтальная, прижата к правому
  // верхнему углу своей панели, полупрозрачная подложка — чтобы не терять
  // читаемость поверх кривой, но и не выглядеть отдельным блоком.
  const legendBase = {
    orientation: 'h' as const,
    x: 1,
    xanchor: 'right' as const,
    yanchor: 'top' as const,
    bgcolor: 'rgba(255,255,255,0.8)',
    font: { size: 11 },
  }

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
      data={[
        {
          x: freqs,
          y: refAmps,
          type: 'scatter',
          mode: 'lines',
          name: 'Норма',
          legendgroup: 'norm',
          legend: 'legend',
          line: { color: NORM_COLOR, dash: 'dot', width: 2 },
          xaxis: 'x',
          yaxis: 'y',
        },
        {
          x: freqs,
          y: amps,
          type: 'scatter',
          mode: 'lines',
          name: patientLabel,
          legendgroup: 'patient',
          legend: 'legend',
          line: { color: PATIENT_COLOR, width: 3 },
          xaxis: 'x',
          yaxis: 'y',
        },
        // Начиная отсюда — те же две серии (Норма / пациент) на двух других
        // панелях. showlegend: false у них, а не отдельная легенда на
        // каждую панель, как было раньше: линии эти же самые по смыслу
        // (тот же цвет, тот же пациент), повторять подпись три раза подряд
        // избыточно. legendgroup общий с первой парой — клик по одной
        // записи в общей легенде наверху всё равно скрывает/показывает
        // линию на всех трёх графиках сразу.
        {
          x: freqs,
          y: refLogAmps,
          type: 'scatter',
          mode: 'lines',
          name: 'Норма',
          legendgroup: 'norm',
          legend: 'legend',
          showlegend: false,
          line: { color: NORM_COLOR, dash: 'dot', width: 2 },
          xaxis: 'x2',
          yaxis: 'y2',
        },
        {
          x: freqs,
          y: logAmps,
          type: 'scatter',
          mode: 'lines',
          name: patientLabel,
          legendgroup: 'patient',
          legend: 'legend',
          showlegend: false,
          line: { color: PATIENT_COLOR, width: 3 },
          xaxis: 'x2',
          yaxis: 'y2',
        },
        {
          x: freqs,
          y: refPhases,
          type: 'scatter',
          mode: 'lines',
          name: 'Норма',
          legendgroup: 'norm',
          legend: 'legend',
          showlegend: false,
          line: { color: NORM_COLOR, dash: 'dot', width: 2 },
          xaxis: 'x3',
          yaxis: 'y3',
        },
        {
          x: freqs,
          y: phases,
          type: 'scatter',
          mode: 'lines',
          name: patientLabel,
          legendgroup: 'patient',
          legend: 'legend',
          showlegend: false,
          line: { color: PATIENT_COLOR, width: 3 },
          xaxis: 'x3',
          yaxis: 'y3',
        },
      ]}
      layout={{
        grid: { rows: 3, columns: 1, pattern: 'independent' },
        height,
        margin: { t: 24, r: 20, b: 38, l: 56 },
        font: { family: 'Inter, system-ui, sans-serif', size: 13 },
        showlegend: true,
        // Одна общая легенда на все три графика, наверху, вместо трёх
        // одинаковых по смыслу подряд — те же две линии, тот же цвет.
        legend: { ...legendBase, y: 1, yanchor: 'top' },
        // АЧХ и ФЧХ — линейная ось, деления через 5 Гц (как в оригинальной
        // ВКР), и они синхронизированы друг с другом (matches). ЛАЧХ — своя,
        // логарифмическая ось (подробнее у xaxis2 ниже). Заголовок
        // "Частота, Гц" один, под самым нижним графиком.
        // "Частота, Гц" один, под самым нижним графиком.
        xaxis: {
          type: 'linear', domain: [0, 1], anchor: 'y', range: linRange,
          dtick: 5, matches: 'x3',
        },
        // nticks — ориентир на одинаковое число подписанных делений на всех
        // трёх панелях. Раньше на ЛАЧХ Plotly сам выбирал шаг в 50 дБ (2-3
        // деления на всю панель) — заметно реже, чем у АЧХ и ФЧХ (там
        // получалось 5-6). Единицы у панелей разные (дБ / рад / АЧХ), общий
        // числовой шаг между ними не имеет смысла — но одинаковая ГУСТОТА
        // делений держит все три панели визуально согласованными.
        yaxis: { title: 'АЧХ (реконструкция)', domain: [0.68, 1], nticks: 6 },
        // Раньше на ЛАЧХ были подписаны только декады (1, 10, 100, dtick: 1)
        // — на диапазоне до 90 это всего 2 подписанных деления на всю ось,
        // заметно реже остальных панелей. lachTicks (см. выше) даёт деления
        // 1-2-5 внутри каждой декады (1, 2, 5, 10, 20, 50…) с полными
        // подписями; мелкие непронумерованные — как раньше, через minor.
        xaxis2: {
          type: 'log', domain: [0, 1], anchor: 'y2', range: logRange,
          tickmode: 'array', tickvals: lachTicks.vals, ticktext: lachTicks.text,
          minor: { dtick: 'D1', ticks: 'outside', ticklen: 4, showgrid: true, gridcolor: '#eef1f6' },
        },
        yaxis2: { title: 'ЛАЧХ, дБ', domain: [0.34, 0.62], nticks: 6 },
        xaxis3: {
          type: 'linear', title: 'Частота, Гц', domain: [0, 1], anchor: 'y3', range: linRange,
          dtick: 5,
        },
        yaxis3: { title: 'ФЧХ, рад', domain: [0, 0.28], nticks: 6 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
      onRelayout={handleRelayout}
        />
      </div>
    </div>
  )
}
