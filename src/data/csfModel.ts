/**
 * Модель АЧХ/ФЧХ сетчатки — на этот раз не заглушка, а данные и формулы
 * из настоящих ВКР (бакалавриат + магистратура, МЭИ, Харлова В.Ю.,
 * науч. рук. Вершинин Д.В.).
 *
 * Методика (глава 2-4 ВКР):
 *  - вход системы — импульсный световой сигнал X(t), τ=0.005с, T=0.1с (10 Гц)
 *  - выход — ОЭРГ (общая электроретинограмма), 512 точек / 1 сек
 *  - оба сигнала раскладываются в ряд Фурье
 *  - АЧХ(f) = Амплитуда_выхода(f) / Амплитуда_входа(f)  — гармоника за гармоникой
 *  - ФЧХ(f) = фаза_выхода(f) − фаза_входа(f), с разворачиванием (+2π при скачках)
 *  - ЛАЧХ(f) = 20·log10(АЧХ)  — то же самое в дБ, лог. шкала частот (Боде)
 *
 * ВАЖНО про этот файл: полных данных АЧХ/ФЧХ по каждой частоте для каждого
 * реального пациента в тексте ВКР нет — только 5 формализованных числовых
 * признаков на пациента (глава 4 магистратуры) и итоговые графики-картинки.
 * Поэтому ниже кривые для графика РЕКОНСТРУИРУЮТСЯ: подбирается гладкая
 * форма кривой, чья низко- и высокочастотная сумма (НЧ/ВЧ) совпадает с
 * реальными измеренными значениями пациента. Численные признаки (phase1,
 * slopePFC, nf, vf, nfHf) — везде НАСТОЯЩИЕ данные из ВКР, кривая на
 * графике — иллюстративная реконструкция под эти данные.
 */

export type Pathology = 'norm' | 'myopia' | 'glaucoma' | 'amd'

export const PATHOLOGY_LABELS: Record<Pathology, string> = {
  norm: 'Норма',
  myopia: 'Миопия',
  glaucoma: 'Глаукома',
  amd: 'ВМД',
}

// Один цвет на группу патологии, одинаковый везде в приложении (раньше был
// объявлен только внутри AnalyticsPage — точки на графике и строки таблицы
// статистики раскрашивались по группам, а таблица пациентов красила
// "Диагноз" одним и тем же нейтральным цветом для всех четырёх групп, хотя
// смысл тот же самый). Вынесли сюда, чтобы обе страницы красили диагноз
// одинаково и не расходились, если цвет когда-нибудь поменяется.
export const PATHOLOGY_COLORS: Record<Pathology, string> = {
  norm: '#2f9e6b',
  myopia: '#3b82f6',
  amd: '#d6336c',
  glaucoma: '#f59e0b',
}

export type PatientRecord = {
  code: string
  eye: 'R' | 'L'
  pathology: Pathology
  note?: string
  /** Фаза 1-й гармоники ФЧХ, рад */
  phase1: number
  /** Наклон линейной аппроксимации ФЧХ (гармоники 5–20), рад/Гц */
  slopePFC: number
  /** НЧ/ВЧ — отношение (как указано в таблице ВКР, может немного отличаться от nf/vf из-за округления) */
  nfHf: number
  /** НЧ — сумма значений АЧХ на частотах 20–50 Гц */
  nf: number
  /** ВЧ — сумма значений АЧХ на частотах 51–81 Гц */
  vf: number
}

// Таблица 4.3 ВКР магистратуры — Норма
const NORM: PatientRecord[] = [
  { code: 'AVA', eye: 'R', pathology: 'norm', note: '51 год', phase1: -1.85, slopePFC: 0.12, nfHf: 12.1, nf: 18.9, vf: 1.56 },
  { code: 'AVA', eye: 'L', pathology: 'norm', phase1: -1.71, slopePFC: 0.12, nfHf: 11.2, nf: 19.2, vf: 1.71 },
  { code: 'BL', eye: 'R', pathology: 'norm', phase1: -1.99, slopePFC: 0.11, nfHf: 6.1, nf: 20.6, vf: 3.35 },
  { code: 'BL', eye: 'L', pathology: 'norm', phase1: -1.98, slopePFC: 0.11, nfHf: 6.0, nf: 17.8, vf: 2.95 },
  { code: 'KSO', eye: 'R', pathology: 'norm', note: '42 года', phase1: -1.96, slopePFC: 0.11, nfHf: 5.5, nf: 18.7, vf: 3.40 },
  { code: 'KSO', eye: 'L', pathology: 'norm', phase1: -1.84, slopePFC: 0.10, nfHf: 4.4, nf: 17.2, vf: 3.91 },
  { code: 'VDV', eye: 'R', pathology: 'norm', note: '24 года, справа — травма в детстве', phase1: -2.00, slopePFC: 0.11, nfHf: 5.1, nf: 25.0, vf: 4.86 },
  { code: 'VDV', eye: 'L', pathology: 'norm', phase1: -1.99, slopePFC: 0.11, nfHf: 4.3, nf: 18.4, vf: 4.26 },
  // nfHf было 3.7 — опечатка: 63.0 / 16.80 = 3.75, округляется до 3.8, а не 3.7.
  { code: 'LO', eye: 'R', pathology: 'norm', note: '22 года, "нормальная миопия"', phase1: -0.87, slopePFC: 0.17, nfHf: 3.8, nf: 63.0, vf: 16.80 },
  { code: 'LO', eye: 'L', pathology: 'norm', note: '"нормальная миопия"', phase1: -0.67, slopePFC: 0.18, nfHf: 3.5, nf: 46.93, vf: 13.26 },
]

// Таблицы 4.4-4.5 ВКР магистратуры — Миопия
const MYOPIA: PatientRecord[] = [
  { code: 'BOP', eye: 'R', pathology: 'myopia', note: '23 года, выс. степ. + ПВХРД', phase1: -0.44, slopePFC: 0.18, nfHf: 7.0, nf: 15.4, vf: 2.2 },
  { code: 'BOP', eye: 'L', pathology: 'myopia', note: 'выс. степ. + ПВХРД', phase1: -1.20, slopePFC: 0.13, nfHf: 7.0, nf: 12.6, vf: 1.8 },
  { code: 'GGG', eye: 'R', pathology: 'myopia', note: '61 год', phase1: -1.61, slopePFC: 0.11, nfHf: 5.24, nf: 23.6, vf: 4.5 },
  { code: 'GGG', eye: 'L', pathology: 'myopia', phase1: -1.66, slopePFC: 0.11, nfHf: 5.0, nf: 23.4, vf: 4.7 },
  { code: 'MTM', eye: 'R', pathology: 'myopia', note: '58 лет', phase1: 0.10, slopePFC: 0.22, nfHf: 3.7, nf: 55.2, vf: 15.0 },
  { code: 'MTM', eye: 'L', pathology: 'myopia', phase1: -0.93, slopePFC: 0.16, nfHf: 6.0, nf: 29.5, vf: 4.9 },
  { code: 'NIN', eye: 'R', pathology: 'myopia', note: '25 лет', phase1: -1.59, slopePFC: 0.12, nfHf: 11.34, nf: 36.3, vf: 3.2 },
  { code: 'NIN', eye: 'L', pathology: 'myopia', phase1: -1.68, slopePFC: 0.11, nfHf: 4.8, nf: 33.2, vf: 6.9 },
  { code: 'NON', eye: 'R', pathology: 'myopia', note: '25 лет', phase1: -1.21, slopePFC: 0.15, nfHf: 3.8, nf: 37.9, vf: 10.1 },
  { code: 'NON', eye: 'L', pathology: 'myopia', phase1: -0.98, slopePFC: 0.16, nfHf: 5.0, nf: 35.2, vf: 7.1 },
  { code: 'SEA', eye: 'R', pathology: 'myopia', note: '36 лет', phase1: -1.76, slopePFC: 0.10, nfHf: 10.65, nf: 21.3, vf: 2.0 },
  { code: 'SEA', eye: 'L', pathology: 'myopia', phase1: -1.77, slopePFC: 0.10, nfHf: 9.05, nf: 18.1, vf: 2.0 },
  { code: 'SYV', eye: 'R', pathology: 'myopia', note: '61 год', phase1: -2.04, slopePFC: 0.14, nfHf: 7.33, nf: 17.6, vf: 2.4 },
  { code: 'SYV', eye: 'L', pathology: 'myopia', phase1: -1.76, slopePFC: 0.13, nfHf: 5.5, nf: 26.5, vf: 4.8 },
  { code: 'TAG', eye: 'R', pathology: 'myopia', phase1: -1.60, slopePFC: 0.15, nfHf: 3.8, nf: 35.6, vf: 9.3 },
  { code: 'TAG', eye: 'L', pathology: 'myopia', phase1: -1.26, slopePFC: 0.18, nfHf: 3.66, nf: 34.0, vf: 9.3 },
]

// Таблицы 4.6-4.7 ВКР магистратуры — Глаукома
const GLAUCOMA: PatientRecord[] = [
  { code: 'HIA', eye: 'R', pathology: 'glaucoma', note: '79 лет', phase1: -1.43, slopePFC: 0.14, nfHf: 4.6, nf: 15.7, vf: 3.4 },
  { code: 'HIA', eye: 'L', pathology: 'glaucoma', phase1: -0.43, slopePFC: 0.22, nfHf: 3.4, nf: 20.9, vf: 6.2 },
  { code: 'IAN', eye: 'R', pathology: 'glaucoma', note: '88 лет', phase1: 0.31, slopePFC: 0.30, nfHf: 2.1, nf: 15.1, vf: 7.3 },
  { code: 'IAN', eye: 'L', pathology: 'glaucoma', phase1: 0.36, slopePFC: 0.28, nfHf: 2.26, nf: 15.8, vf: 7.0 },
  { code: 'ILA', eye: 'R', pathology: 'glaucoma', note: '70 лет', phase1: -0.05, slopePFC: 0.35, nfHf: 1.9, nf: 8.5, vf: 4.5 },
  { code: 'ILA', eye: 'L', pathology: 'glaucoma', phase1: -0.05, slopePFC: 0.35, nfHf: 1.8, nf: 8.9, vf: 5.0 },
  { code: 'ITP', eye: 'R', pathology: 'glaucoma', note: '69 лет', phase1: -1.43, slopePFC: 0.15, nfHf: 5.91, nf: 19.5, vf: 3.3 },
  { code: 'ITP', eye: 'L', pathology: 'glaucoma', phase1: -0.95, slopePFC: 0.18, nfHf: 3.8, nf: 15.8, vf: 4.2 },
  { code: 'SLI', eye: 'R', pathology: 'glaucoma', note: '64 года', phase1: -0.04, slopePFC: 0.22, nfHf: 4.0, nf: 26.1, vf: 6.5 },
  { code: 'SLI', eye: 'L', pathology: 'glaucoma', phase1: -0.08, slopePFC: 0.22, nfHf: 4.05, nf: 24.7, vf: 6.1 },
  { code: 'SPM', eye: 'R', pathology: 'glaucoma', note: '68 лет', phase1: 0.04, slopePFC: 0.33, nfHf: 2.2, nf: 17.6, vf: 7.9 },
  { code: 'SPM', eye: 'L', pathology: 'glaucoma', phase1: -0.15, slopePFC: 0.26, nfHf: 2.9, nf: 17.8, vf: 6.2 },
  { code: 'STI', eye: 'R', pathology: 'glaucoma', note: '79 лет', phase1: 0.42, slopePFC: 0.30, nfHf: 2.3, nf: 14.1, vf: 6.1 },
  { code: 'STI', eye: 'L', pathology: 'glaucoma', phase1: 0.41, slopePFC: 0.29, nfHf: 2.1, nf: 12.7, vf: 6.1 },
  { code: 'SYN', eye: 'R', pathology: 'glaucoma', note: '77 лет', phase1: -0.52, slopePFC: 0.22, nfHf: 3.7, nf: 10.0, vf: 2.7 },
  { code: 'SYN', eye: 'L', pathology: 'glaucoma', phase1: 0.24, slopePFC: 0.27, nfHf: 2.3, nf: 9.5, vf: 4.2 },
]

// Таблицы 4.8-4.9 ВКР магистратуры — ВМД
const AMD: PatientRecord[] = [
  { code: 'BAV', eye: 'R', pathology: 'amd', note: '54 года', phase1: -2.06, slopePFC: 0.12, nfHf: 3.5, nf: 12.7, vf: 3.6 },
  { code: 'BAV', eye: 'L', pathology: 'amd', phase1: -1.4, slopePFC: 0.15, nfHf: 3.9, nf: 10.2, vf: 2.6 },
  { code: 'BEN', eye: 'R', pathology: 'amd', note: '80 лет', phase1: -1.3, slopePFC: 0.25, nfHf: 1.46, nf: 2.8, vf: 1.9 },
  { code: 'BEN', eye: 'L', pathology: 'amd', phase1: -1.3, slopePFC: 0.27, nfHf: 1.59, nf: 1.27, vf: 0.8 },
  { code: 'ENF', eye: 'R', pathology: 'amd', note: '73 года', phase1: -1.6, slopePFC: 0.14, nfHf: 4.4, nf: 27.1, vf: 6.2 },
  { code: 'ENF', eye: 'L', pathology: 'amd', phase1: -1.7, slopePFC: 0.14, nfHf: 4.05, nf: 23.5, vf: 5.8 },
  { code: 'GLG', eye: 'R', pathology: 'amd', note: '67 лет', phase1: -1.9, slopePFC: 0.14, nfHf: 5.78, nf: 15.6, vf: 2.7 },
  { code: 'GLG', eye: 'L', pathology: 'amd', phase1: -1.9, slopePFC: 0.14, nfHf: 5.9, nf: 30.7, vf: 5.2 },
  { code: 'KN', eye: 'R', pathology: 'amd', note: '80 лет', phase1: -0.2, slopePFC: 0.23, nfHf: 3.3, nf: 12.8, vf: 3.9 },
  { code: 'KN', eye: 'L', pathology: 'amd', phase1: 0.05, slopePFC: 0.25, nfHf: 2.53, nf: 11.9, vf: 4.7 },
  { code: 'LAV', eye: 'R', pathology: 'amd', phase1: -1.2, slopePFC: 0.15, nfHf: 6.0, nf: 41.9, vf: 7.0 },
  { code: 'LAV', eye: 'L', pathology: 'amd', phase1: -1.0, slopePFC: 0.17, nfHf: 5.64, nf: 32.7, vf: 5.8 },
  { code: 'NEI', eye: 'R', pathology: 'amd', note: '73 года', phase1: -1.9, slopePFC: 0.14, nfHf: 7.72, nf: 19.3, vf: 2.5 },
  { code: 'NEI', eye: 'L', pathology: 'amd', phase1: -1.8, slopePFC: 0.13, nfHf: 5.04, nf: 14.1, vf: 2.8 },
  { code: 'NSA', eye: 'R', pathology: 'amd', note: '74 года', phase1: -2.0, slopePFC: 0.13, nfHf: 5.58, nf: 6.7, vf: 1.2 },
  { code: 'NSA', eye: 'L', pathology: 'amd', phase1: -1.8, slopePFC: 0.13, nfHf: 3.9, nf: 8.2, vf: 2.1 },
  { code: 'VRD', eye: 'R', pathology: 'amd', note: '71 год', phase1: -1.0, slopePFC: 0.16, nfHf: 3.6, nf: 14.3, vf: 4.0 },
  { code: 'VRD', eye: 'L', pathology: 'amd', phase1: -1.9, slopePFC: 0.11, nfHf: 7.1, nf: 15.7, vf: 2.2 },
]

export const PATIENTS: PatientRecord[] = [...NORM, ...MYOPIA, ...GLAUCOMA, ...AMD]

export type FeatureStats = {
  mean: { phase1: number; slopePFC: number; nfHf: number; nf: number; vf: number }
  std: { phase1: number; slopePFC: number; nfHf: number; nf: number; vf: number }
}

// Таблицы "Средние" / "СКО" из ВКР (глава 4 магистратуры) — считать заново
// по 5-10 пациентам смысла нет, реальная выборка сильно больше (учитывает
// всех обработанных субъектов), поэтому берём готовые опубликованные значения.
export const PATHOLOGY_STATS: Record<Pathology, FeatureStats> = {
  norm: {
    mean: { phase1: -1.92, slopePFC: 0.11, nfHf: 6.8, nf: 19.3, vf: 3.10 },
    std: { phase1: 0.1, slopePFC: 0.006, nfHf: 3.05, nf: 2.45, vf: 1.6 },
  },
  myopia: {
    mean: { phase1: -1.34, slopePFC: 0.14, nfHf: 6.13, nf: 28.5, vf: 5.6 },
    std: { phase1: 0.5, slopePFC: 0.03, nfHf: 2.4, nf: 11.1, vf: 3.7 },
  },
  glaucoma: {
    mean: { phase1: -0.22, slopePFC: 0.26, nfHf: 2.7, nf: 16.4, vf: 5.41 },
    std: { phase1: 0.6, slopePFC: 0.06, nfHf: 1.16, nf: 5.3, vf: 1.5 },
  },
  amd: {
    mean: { phase1: -1.4, slopePFC: 0.16, nfHf: 4.6, nf: 16.7, vf: 4.1 },
    std: { phase1: 0.6, slopePFC: 0.05, nfHf: 1.7, nf: 10.7, vf: 1.8 },
  },
}

const FEATURE_KEYS = ['phase1', 'slopePFC', 'nf', 'vf', 'nfHf'] as const

/**
 * Метод городских кварталов (формулы 4.1-4.4 ВКР магистратуры):
 * нормируем каждый признак пациента относительно среднего и СКО группы,
 * считаем манхэттенское расстояние до нормированного профиля каждой группы.
 * Возвращает расстояния до всех 4 групп и ближайшую как предполагаемый диагноз.
 *
 * ВАЖНО: сама ВКР честно показывает, что такая классификация даёт лишь
 * около 50% верных ответов даже для одной патологии (глаукомы) — из-за
 * большого разброса признаков внутри групп. Это не готовый диагностический
 * инструмент, а иллюстрация метода.
 */
export function classifyPatient(record: PatientRecord) {
  const distances = (Object.keys(PATHOLOGY_STATS) as Pathology[]).map((pathology) => {
    const { mean, std } = PATHOLOGY_STATS[pathology]
    let distance = 0
    for (const key of FEATURE_KEYS) {
      const sigma = std[key] || 1e-6
      const gamma = (record[key] - mean[key]) / sigma
      distance += Math.abs(gamma)
    }
    return { pathology, distance }
  })
  distances.sort((a, b) => a.distance - b.distance)
  return { distances, nearest: distances[0].pathology }
}

export type CurvePoint = { frequency: number; amplitude: number; phase: number; logAmplitude: number }

/**
 * Реконструирует иллюстративную кривую АЧХ/ФЧХ под РЕАЛЬНЫЕ признаки
 * (patient или средние группы). АЧХ моделируется затухающей по частоте
 * функцией A(f) = A0 * r^f, параметры A0 и r подбираются так, чтобы
 * сумма A(f) на 20-50 Гц и на 51-81 Гц совпадала с реальными НЧ и ВЧ.
 * ФЧХ — прямая линия phase1 + slope*(f-1), как в самой методике ВКР
 * (линейная аппроксимация ФЧХ по гармоникам 5-20).
 */
export function buildCurve(features: { phase1: number; slopePFC: number; nf: number; vf: number }, fMax = 90): CurvePoint[] {
  const geomSum = (a: number, b: number, r: number) => {
    let s = 0
    for (let f = a; f <= b; f++) s += Math.pow(r, f)
    return s
  }

  const targetRatio = Math.max(features.nf / Math.max(features.vf, 0.01), 1.01)

  // Бисекция по r: ratio(r) = geomSum(20,50,r) / geomSum(51,81,r), убывает по r.
  let lo = 0.001
  let hi = 0.999
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const ratio = geomSum(20, 50, mid) / geomSum(51, 81, mid)
    if (ratio > targetRatio) lo = mid
    else hi = mid
  }
  const r = (lo + hi) / 2
  const A0 = features.nf / geomSum(20, 50, r)

  const points: CurvePoint[] = []
  for (let f = 1; f <= fMax; f++) {
    const amplitude = A0 * Math.pow(r, f)
    points.push({
      frequency: f,
      amplitude,
      // ЛАЧХ — логарифмическая АЧХ, 20*log10(A), в децибелах (классика Боде).
      logAmplitude: 20 * Math.log10(Math.max(amplitude, 1e-9)),
      phase: features.phase1 + features.slopePFC * (f - 1),
    })
  }
  return points
}
