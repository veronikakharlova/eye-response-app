/**
 * Порт алгоритма из readFile.cpp (Приложение А ВКР магистратуры) — расчёт
 * АЧХ/ФЧХ/ЛАЧХ и производных числовых признаков (phase1/slopePFC/nf/vf/nfHf)
 * по реальному сырому сигналу с прибора (Roland Consult RETIport32).
 *
 * Методика (глава 2-4 ВКР, как и в src/data/csfModel.ts):
 *  - вход системы — синтетический импульсный сигнал X(t), τ=0.005с, T=0.1с (10 Гц),
 *    строится программно, а не измеряется — это опорный сигнал для нормировки;
 *  - выход — сырой отклик с прибора (Время/Отклик), берётся как есть;
 *  - оба сигнала раскладываются в ряд Фурье (дискретное преобразование Фурье);
 *  - АЧХ(f) = |FFT(отклик)| / |FFT(единичный импульс)| — гармоника за гармоникой;
 *  - ФЧХ(f) = фаза(FFT(отклик)) − фаза(FFT(единичный импульс)), с "разворачиванием"
 *    (+2π накопительно при резких скачках вниз — иначе фаза рвётся на границе ±π);
 *  - ЛАЧХ(f) = 20·log10(АЧХ).
 *
 * ЧЕСТНО про отличия от оригинального инструмента (readFile.cpp/ROOT):
 *  1. Оригинал читал файл ergLEFT.txt — 512 точек на ~1 секунду с фиксированным
 *     (зашитым в код, не считанным из файла) шагом 0.0017с. Реальный экспорт
 *     прибора (RETIport32 CSV) даёт другой шаг дискретизации — берём его прямо
 *     из файла (Dist[s]), это отличается от того, что использовалось для чисел
 *     в таблицах ВКР.
 *  2. В оригинале были специфичные "заглушки" — обнуление бинов рядом с
 *     конкретными индексами (~201, ~50) ради конкретной шумовой помехи в
 *     конкретном файле. Эти индексы не переносятся на другой сигнал с другим
 *     N/шагом дискретизации, поэтому здесь их нет.
 *  3. Из-за (1) и (2) абсолютные числа (nf/vf/phase1/slopePFC) не обязаны
 *     совпадать с историческими значениями из таблиц ВКР — это тот же метод,
 *     применённый к реальному файлу с прибора, а не гарантированное точное
 *     воспроизведение старого расчёта.
 */

const T = 0.1 // период синтетического опорного импульса, с (10 Гц)
const TAU = 0.005 // ширина импульса, с

export type ErgAnalysisResult = {
  /** Частоты бинов, Гц (индекс 0 — постоянная составляющая) */
  freq: number[]
  /** АЧХ по бинам */
  afc: number[]
  /** ФЧХ по бинам (после разворачивания), рад */
  pfc: number[]
  /** ЛАЧХ по бинам, дБ */
  lafc: number[]
  /** Фаза 1-й гармоники ФЧХ, рад */
  phase1: number
  /** Наклон линейной аппроксимации ФЧХ по бинам 5–20, рад/Гц */
  slopePFC: number
  /** НЧ — сумма АЧХ на частотах 20–50 Гц */
  nf: number
  /** ВЧ — сумма АЧХ на частотах 51–81 Гц */
  vf: number
  /** НЧ/ВЧ */
  nfHf: number
  /** Длительность анализируемого (обрезанного) участка, с */
  duration: number
}

function dft(x: number[]): { re: number[]; im: number[] } {
  const N = x.length
  const re = new Array<number>(N).fill(0)
  const im = new Array<number>(N).fill(0)
  for (let k = 0; k < N; k++) {
    let sr = 0
    let si = 0
    for (let n = 0; n < N; n++) {
      const ang = (-2 * Math.PI * k * n) / N
      sr += x[n] * Math.cos(ang)
      si += x[n] * Math.sin(ang)
    }
    re[k] = sr
    im[k] = si
  }
  return { re, im }
}

function magPhase(x: number[]): { mag: number[]; ph: number[] } {
  const { re, im } = dft(x)
  const mag = re.map((r, i) => Math.hypot(r, im[i]))
  const ph = re.map((r, i) => Math.atan2(im[i], r))
  return { mag, ph }
}

function buildSinglePulse(times: number[]): number[] {
  return times.map((t) => (t < TAU ? 1 : 0))
}

function unwrapGrowing(phaseArr: number[]): number[] {
  const out = phaseArr.slice()
  let deltaPhi = 0
  for (let i = 2; i < phaseArr.length - 1; i++) {
    if (phaseArr[i - 1] - phaseArr[i] > 1.5 && phaseArr[i - 2] - phaseArr[i] > 1.5) {
      deltaPhi += 2 * Math.PI
    }
    out[i] = phaseArr[i] - deltaPhi
  }
  return out
}

/**
 * @param rawValues сырые значения отклика (В), по одному на точку, с шагом dt
 * @param dt шаг дискретизации, с (из файла прибора, поле Dist[s])
 * @param xmin начало анализируемого участка, с
 * @param xmax конец анализируемого участка, с
 */
export function analyzeErgSignal(rawValues: number[], dt: number, xmin: number, xmax: number): ErgAnalysisResult {
  const times = rawValues.map((_, i) => i * dt)

  const cutIdx: number[] = []
  for (let i = 0; i < rawValues.length; i++) {
    if (times[i] >= xmin && times[i] <= xmax) cutIdx.push(i)
  }
  if (cutIdx.length < 8) {
    throw new Error('Слишком мало точек в выбранном диапазоне — расширьте интервал.')
  }
  const cutTimes = cutIdx.map((i) => times[i] - times[cutIdx[0]])
  const baseline = rawValues[cutIdx[0]]
  const cutValues = cutIdx.map((i) => rawValues[i] - baseline)

  const pulseZero = buildSinglePulse(cutTimes)

  const { mag: magInp, ph: phInp } = magPhase(cutValues)
  const { mag: magPulse, ph: phPulse } = magPhase(pulseZero)

  const N = cutValues.length
  const duration = cutTimes[N - 1]
  const nBins = Math.floor(N / 2)

  const afc = new Array<number>(nBins)
  const pfcRaw = new Array<number>(nBins)
  const freq = new Array<number>(nBins)
  for (let i = 0; i < nBins; i++) {
    afc[i] = magPulse[i] > 0 ? magInp[i] / magPulse[i] : 0
    pfcRaw[i] = phInp[i] - phPulse[i]
    freq[i] = i / duration
  }
  const pfc = unwrapGrowing(pfcRaw)
  const lafc = afc.map((a) => 20 * Math.log10(a > 0 ? a : 1e-12))

  const phase1 = pfc[1] ?? 0

  const loI = Math.min(5, nBins - 1)
  const hiI = Math.min(20, nBins - 1)
  let sx = 0
  let sy = 0
  let sxy = 0
  let sxx = 0
  let cnt = 0
  for (let i = loI; i <= hiI; i++) {
    const x = freq[i]
    const y = pfc[i]
    sx += x
    sy += y
    sxy += x * y
    sxx += x * x
    cnt++
  }
  const denom = cnt * sxx - sx * sx
  const slopePFC = denom !== 0 ? (cnt * sxy - sx * sy) / denom : 0

  let nf = 0
  let vf = 0
  for (let i = 0; i < nBins; i++) {
    if (freq[i] >= 20 && freq[i] <= 50) nf += afc[i]
    if (freq[i] >= 51 && freq[i] <= 81) vf += afc[i]
  }
  const nfHf = vf !== 0 ? nf / vf : 0

  return { freq, afc, pfc, lafc, phase1, slopePFC, nf, vf, nfHf, duration }
}
