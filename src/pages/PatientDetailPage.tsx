import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CSFChart from '../components/CSFChart'
import VisitTrendChart from '../components/VisitTrendChart'
import AddVisitModal from '../components/AddVisitModal'
import Header from '../layout/Header'
import { ErrorState, ChartSkeleton } from '../components/StateViews'
import { PATHOLOGY_LABELS, classifyPatient } from '../data/csfModel'
import { usePatientsData } from '../lib/PatientsDataContext'
import { toPatientRecord } from '../lib/patientRecord'
import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { logChartExport } from '../lib/backend'
import '../App.css'

const DEFAULT_RANGE: [number, number] = [1, 90]

export default function PatientDetailPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { patients, loading, error } = usePatientsData()
  const { session } = useAuth()

  const fullPatient = useMemo(() => patients.find((p) => p.code === code), [patients, code])

  // Раньше на пациента была ровно одна запись на глаз, и records.map один в
  // один совпадало со списком доступных глаз. С визитами (addVisit) на один
  // глаз записей может быть несколько, поэтому список глаз для
  // переключателя строим отдельно, по уникальным значениям, а не по одной
  // кнопке на каждую запись.
  const availableEyes = useMemo(() => {
    const seen: Array<'R' | 'L'> = []
    for (const r of fullPatient?.records ?? []) {
      if (!seen.includes(r.eye)) seen.push(r.eye)
    }
    return seen
  }, [fullPatient])

  const [eye, setEye] = useState<'R' | 'L'>(availableEyes[0] ?? 'R')
  const [freqMin, setFreqMin] = useState(DEFAULT_RANGE[0])
  const [freqMax, setFreqMax] = useState(DEFAULT_RANGE[1])
  // Длинная оговорка про ограничения метода не помещалась на экран вместе с
  // тремя графиками без прокрутки. По умолчанию она свёрнута до двух строк —
  // весь текст остаётся на месте, просто по клику, а не съедает место сразу.
  const [caveatOpen, setCaveatOpen] = useState(false)
  const [addVisitOpen, setAddVisitOpen] = useState(false)

  // Сырые записи выбранного глаза, по возрастанию даты визита — нужны и для
  // графика динамики, и для того, чтобы «текущие признаки» слева всегда
  // показывали самый свежий визит, а не первый попавшийся в базе.
  const eyeVisits = useMemo(() => {
    const rows = fullPatient ? fullPatient.records.filter((r) => r.eye === eye) : []
    return [...rows].sort((a, b) => a.visit_date.localeCompare(b.visit_date))
  }, [fullPatient, eye])

  const latestVisit = eyeVisits[eyeVisits.length - 1]
  const patient = fullPatient && latestVisit ? toPatientRecord(latestVisit, fullPatient.pathology) : undefined

  if (loading) {
    return (
      <div>
        <Header title="Загрузка…" />
        <ChartSkeleton height={505} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Ошибка" />
        <ErrorState
          title="Не удалось загрузить пациента"
          description={error}
          action={{ label: '← К списку пациентов', onClick: () => navigate('/patients') }}
        />
      </div>
    )
  }

  if (!patient) {
    return (
      <div>
        <Header title="Пациент не найден" />
        <ErrorState
          title="Такого пациента нет в базе"
          description={`Код «${code}» не найден среди загруженных пациентов. Возможно, он был удалён или в адресе опечатка.`}
          action={{ label: '← К списку пациентов', onClick: () => navigate('/patients') }}
        />
      </div>
    )
  }

  const classification = classifyPatient(patient)
  const isMatch = classification.nearest === patient.pathology

  // Печать/сохранение PDF — через системный диалог браузера: пользователь
  // сам выбирает папку и жмёт «Сохранить как PDF», без обращения к
  // файловой системе с нашей стороны. @media print в App.css в этот момент
  // прячет всё, кроме #print-chart-area. Лог в chart_exports — только для
  // Supabase-режима и не должен ломать печать, если вдруг не запишется.
  const handleDownloadPdf = () => {
    if (isSupabaseConfigured) {
      logChartExport(patient.code, patient.eye, session?.user.id).catch(() => {})
    }
    window.print()
  }

  return (
    <div>
      <Header title={`Пациент ${patient.code}`} />

      <button type="button" className="page-btn" style={{ marginBottom: 'var(--space-16)' }} onClick={() => navigate('/patients')}>
        ← К списку пациентов
      </button>

      <div className="layout">
        <aside className="sidebar">
          <section className="patient-panel">
            <span className="panel__label">Глаз</span>
            <div className="patient-filters">
              {availableEyes.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`patient-filter ${eye === e ? 'patient-filter--active' : ''}`}
                  onClick={() => setEye(e)}
                >
                  {e === 'R' ? 'Правый глаз' : 'Левый глаз'}
                </button>
              ))}
            </div>
          </section>

          <section className="features">
            <h2>Признаки пациента</h2>
            <div className="features__grid">
              <div>
                <span>Фаза 1-й гармоники</span>
                <strong>{patient.phase1.toFixed(2)} рад</strong>
              </div>
              <div>
                <span>Наклон ФЧХ</span>
                <strong>{patient.slopePFC.toFixed(2)} рад/Гц</strong>
              </div>
              <div>
                {/* 2 знака, а не 1: НЧ/ВЧ ниже — отношение именно этих чисел,
                    а на 1 знаке (18.9/1.6) оно на экране не сходится с тем,
                    что показано в самом отношении (см. App.css-комментарий
                    у .features__derived). */}
                <span>НЧ (20-50 Гц)</span>
                <strong>{patient.nf.toFixed(2)}</strong>
              </div>
              <div>
                <span>ВЧ (51-81 Гц)</span>
                <strong>{patient.vf.toFixed(2)}</strong>
              </div>
            </div>
            <div className="features__derived">
              <span>НЧ / ВЧ (отношение)</span>
              <strong>{patient.nfHf.toFixed(1)}</strong>
            </div>
          </section>

          <section className="result">
            <div className="result__fact">
              <span className="result__fact-label">Диагноз в базе</span>
              <span className="result__fact-value">{PATHOLOGY_LABELS[patient.pathology]}</span>
            </div>

            {/* Раньше примечание из таблицы (не всегда просто возраст — иногда
                там ещё травма или сопутствующий диагноз) приклеивалось к диагнозу
                через " · ", как будто это один и тот же факт. Разные по смыслу
                вещи, поэтому теперь отдельная строка с нейтральной подписью
                "Заметка", а не "Возраст" — там не всегда только возраст. */}
            {patient.note && (
              <div className="result__fact">
                <span className="result__fact-label">Заметка</span>
                {/* Диагноз и НЧ/ВЧ — всегда короткое слово или число, для них
                    выравнивание по правому краю и даёт ту самую "таблицу".
                    Заметка — вольный текст из исходной таблицы, бывает
                    длинным (см. App.css у .result__fact-value--note): если
                    его так же прижать вправо, при переносе на 2-3 строки
                    получается рваный левый край абзаца — читать труднее,
                    чем просто слева. */}
                <span className="result__fact-value result__fact-value--note">{patient.note}</span>
              </div>
            )}

            {/* Приведено к тому же паттерну "подпись сверху, значение снизу",
                что и .result__fact выше — раньше здесь было отдельное
                предложение без подписи, единственное такое место в карточке. */}
            <div className="result__classification">
              <div className="result__classification-row">
                <span className="result__fact-label">Классификация (метод городских кварталов)</span>
                <span className={`badge ${isMatch ? 'badge--match' : 'badge--mismatch'}`}>
                  {isMatch ? 'Согласуется с диагнозом' : 'Рекомендован повторный осмотр'}
                </span>
              </div>
              {/* Раньше было жирным .result__fact-value — тем же стилем, что и
                  "Диагноз в базе" выше. Но это не факт из базы, а прикидка
                  метода с известной низкой точностью (~50%, см. оговорку
                  ниже) — жирный тёмный текст выглядел увереннее, чем метод
                  того заслуживает. Приглушили вес, оставили читаемым только
                  название группы. */}
              <p style={{ margin: 'var(--space-4) 0 0', fontSize: 13.5, color: 'var(--muted)' }}>
                Ближе всего к группе{' '}
                <strong style={{ color: 'var(--text)' }}>{PATHOLOGY_LABELS[classification.nearest]}</strong>
              </p>
              <p className="result__classification-note">
                <span aria-hidden="true">ⓘ</span>
                Не диагноз, а ориентировочная сверка признаков. Точность метода на независимой выборке отдельно не подтверждена (подробнее ниже).
              </p>
            </div>

            <p className={`result__caveat ${caveatOpen ? '' : 'result__caveat--collapsed'}`}>
              <strong className="result__caveat-label">Ограничения метода.</strong> Метод городских кварталов изначально применялся для проверки согласованности уже поставленного диагноза с частотными признаками ОЭРГ, а не для самостоятельной постановки диагноза. Похожая по цели попытка классификации (нечёткая логика, одна патология: глаукома) дала не более 50% верных ответов, из-за малой и неоднородной выборки пациентов. Результат классификации в этом прототипе — это иллюстрация метода на реальных числовых признаках, а не клиническая рекомендация.
            </p>
            <button
              type="button"
              className="result__caveat-toggle"
              onClick={() => setCaveatOpen((v) => !v)}
              aria-expanded={caveatOpen}
            >
              {caveatOpen ? 'Свернуть ▲' : 'Показать полностью ▾'}
            </button>
          </section>
        </aside>

        <main className="main">
          <section className="chart print-chart-area" id="print-chart-area">
            <div className="print-only chart__print-header">
              <strong>
                {patient.code} · {patient.eye === 'R' ? 'Правый глаз' : 'Левый глаз'}
              </strong>{' '}
              — {PATHOLOGY_LABELS[patient.pathology]} · распечатано {new Date().toLocaleDateString('ru-RU')}
            </div>
            <div className="chart__controls">
              <span className="chart__controls-label">Диапазон, Гц</span>
              <input
                type="number"
                className="range-input"
                min={0.5}
                max={freqMax - 0.5}
                step={1}
                value={freqMin}
                onChange={(e) => setFreqMin(Number(e.target.value) || DEFAULT_RANGE[0])}
                aria-label="Частота от, Гц"
              />
              <span className="chart__controls-sep">—</span>
              <input
                type="number"
                className="range-input"
                min={freqMin + 0.5}
                max={200}
                step={1}
                value={freqMax}
                onChange={(e) => setFreqMax(Number(e.target.value) || DEFAULT_RANGE[1])}
                aria-label="Частота до, Гц"
              />
              <button
                type="button"
                className="chart__reset"
                onClick={() => {
                  setFreqMin(DEFAULT_RANGE[0])
                  setFreqMax(DEFAULT_RANGE[1])
                }}
              >
                Сбросить
              </button>
              <button
                type="button"
                className="chart__print-btn"
                onClick={handleDownloadPdf}
                title="Открыть системный диалог печати: сохраните как PDF в любую папку"
              >
                Скачать PDF
              </button>
            </div>
            <CSFChart
              patient={patient}
              range={[freqMin, freqMax]}
              onRangeChange={([lo, hi]) => {
                setFreqMin(lo)
                setFreqMax(hi)
              }}
            />
          </section>

          {/* Пока у всех пациентов в базе по одному визиту, эта карточка на
              каждой странице показывала бы только заглушку "тренд появится
              позже" — то есть один и тот же неинформативный текст везде.
              Убрали её целиком (вместе с кнопкой "+Добавить визит"), пока
              визитов реально не станет 2+ — тогда карточка и кнопка вернутся
              сами, без отдельного решения показывать/не показывать. */}
          {eyeVisits.length > 1 && (
            <section className="data-card" style={{ padding: 'var(--space-20) var(--space-24)', marginTop: 'var(--space-20)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                {/* marginBottom обнулён: тут подпись стоит в одной строке с кнопкой,
                    а не над отдельным блоком контента, обычный отступ снизу тут не нужен. */}
                <span className="panel__label" style={{ marginBottom: 0 }}>
                  Динамика по визитам ({eye === 'R' ? 'правый глаз' : 'левый глаз'})
                </span>
                <button type="button" className="page-btn" onClick={() => setAddVisitOpen(true)}>
                  + Добавить визит
                </button>
              </div>
              <VisitTrendChart visits={eyeVisits} />
            </section>
          )}
        </main>
      </div>

      {addVisitOpen && (
        <AddVisitModal code={patient.code} eye={patient.eye} onClose={() => setAddVisitOpen(false)} />
      )}
    </div>
  )
}
