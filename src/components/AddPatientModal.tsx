import { useMemo, useState } from 'react'
import Modal from './Modal'
import { PATHOLOGY_LABELS, Pathology, PatientRecord } from '../data/csfModel'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { DeviceFile, parseDeviceFile, readDeviceFileAsText } from '../lib/deviceFile'
import { analyzeErgSignal, ErgAnalysisResult } from '../lib/ergAnalysis'

type Props = {
  onClose: () => void
  onAdd: (record: PatientRecord) => void | Promise<void>
}

const PATHOLOGIES: Pathology[] = ['norm', 'myopia', 'glaucoma', 'amd']
type Mode = 'manual' | 'device'

/**
 * Форма добавления пациента в анонимизированную таблицу «Пациенты» (по коду,
 * без ФИО). Одна запись = один глаз, как и в исходных данных ВКР — если
 * нужны оба глаза, форму заполняют дважды с одним и тем же кодом.
 *
 * Важно: приложение сейчас без бэкенда — новая запись живёт только в памяти
 * этой вкладки и пропадёт при перезагрузке страницы. Это честно показано
 * подсказкой в самой форме, а не спрятано.
 */
export default function AddPatientModal({ onClose, onAdd }: Props) {
  const [mode, setMode] = useState<Mode>('manual')
  const [code, setCode] = useState('')
  const [eye, setEye] = useState<'R' | 'L'>('R')
  const [pathology, setPathology] = useState<Pathology>('norm')
  const [phase1, setPhase1] = useState('')
  const [slopePFC, setSlopePFC] = useState('')
  const [nf, setNf] = useState('')
  const [vf, setVf] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // --- режим «с прибора» ---
  const [deviceFile, setDeviceFile] = useState<DeviceFile | null>(null)
  const [deviceFileName, setDeviceFileName] = useState('')
  const [deviceError, setDeviceError] = useState('')
  const [groupIndex, setGroupIndex] = useState(0)
  const [xmin, setXmin] = useState('0')
  const [xmax, setXmax] = useState('0.25')

  const group = deviceFile?.groups[groupIndex]
  const maxDuration = group ? (group.length - 1) * group.dist : 0

  const analysis: ErgAnalysisResult | null = useMemo(() => {
    if (!group) return null
    const chan = group.channels.find((c) => c.chanNum === (eye === 'R' ? '1' : '2'))
    if (!chan) return null
    const xminNum = parseFloat(xmin.replace(',', '.'))
    const xmaxNum = parseFloat(xmax.replace(',', '.'))
    if (!Number.isFinite(xminNum) || !Number.isFinite(xmaxNum) || xmaxNum <= xminNum) return null
    try {
      return analyzeErgSignal(chan.values, group.dist, xminNum, xmaxNum)
    } catch {
      return null
    }
  }, [group, eye, xmin, xmax])

  const handleFileChange = async (f: File | null) => {
    if (!f) return
    setDeviceError('')
    setDeviceFileName(f.name)
    try {
      const text = await readDeviceFileAsText(f)
      const parsed = parseDeviceFile(text)
      if (parsed.groups.length === 0) {
        setDeviceError('Не удалось найти ни одной записи («Plots of Group») в файле. Это точно экспорт RETIport32?')
        setDeviceFile(null)
        return
      }
      setDeviceFile(parsed)
      const flickerIdx = parsed.groups.findIndex((g) => /\d/.test(g.name) && g.name.toLowerCase().includes('hz'))
      const idx = flickerIdx >= 0 ? flickerIdx : 0
      setGroupIndex(idx)
      const g = parsed.groups[idx]
      const dur = (g.length - 1) * g.dist
      setXmin('0')
      setXmax(String(Math.min(0.25, dur)))
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : 'Не удалось прочитать файл.')
      setDeviceFile(null)
    }
  }

  const nfNum = parseFloat(nf.replace(',', '.'))
  const vfNum = parseFloat(vf.replace(',', '.'))
  const nfHfPreview = Number.isFinite(nfNum) && Number.isFinite(vfNum) && vfNum !== 0 ? (nfNum / vfNum).toFixed(1) : '—'

  const handleSubmit = async () => {
    const codeTrim = code.trim().toUpperCase()
    if (!codeTrim) {
      setError('Укажите код пациента.')
      return
    }

    let record: PatientRecord
    if (mode === 'device') {
      if (!analysis) {
        setError('Сначала загрузите файл прибора и дождитесь расчёта признаков.')
        return
      }
      record = {
        code: codeTrim,
        eye,
        pathology,
        note: note.trim() || undefined,
        phase1: Number(analysis.phase1.toFixed(3)),
        slopePFC: Number(analysis.slopePFC.toFixed(4)),
        nfHf: Number(analysis.nfHf.toFixed(2)),
        nf: Number(analysis.nf.toFixed(4)),
        vf: Number(analysis.vf.toFixed(4)),
      }
    } else {
      const phase1Num = parseFloat(phase1.replace(',', '.'))
      const slopeNum = parseFloat(slopePFC.replace(',', '.'))
      if (![phase1Num, slopeNum, nfNum, vfNum].every(Number.isFinite)) {
        setError('Проверьте числовые поля признаков: где-то не введено число.')
        return
      }
      record = {
        code: codeTrim,
        eye,
        pathology,
        note: note.trim() || undefined,
        phase1: phase1Num,
        slopePFC: slopeNum,
        nfHf: vfNum !== 0 ? Number((nfNum / vfNum).toFixed(2)) : 0,
        nf: nfNum,
        vf: vfNum,
      }
    }

    setError('')
    setSubmitting(true)
    try {
      await onAdd(record)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить пациента.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Добавить пациента"
      onClose={onClose}
      width={560}
      footer={
        <>
          <button type="button" className="page-btn" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button type="button" className="page-btn page-btn--primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Добавляем…' : 'Добавить'}
          </button>
        </>
      }
    >
      <div className="mode-toggle" role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          className={`page-btn${mode === 'manual' ? ' page-btn--primary' : ''}`}
          onClick={() => setMode('manual')}
        >
          Вручную
        </button>
        <button
          type="button"
          className={`page-btn${mode === 'device' ? ' page-btn--primary' : ''}`}
          onClick={() => setMode('device')}
        >
          С прибора (файл)
        </button>
      </div>

      <p className="form-field__hint" style={{ marginBottom: 14 }}>
        {isSupabaseConfigured
          ? 'Запись сохранится в общей базе: её увидят все, у кого есть доступ к этому приложению.'
          : 'Пока без базы данных: запись появится в таблице сразу, но живёт только в этой вкладке и исчезнет при перезагрузке страницы.'}
      </p>

      <div className="form-grid">
        <div className="form-field">
          <label>Код пациента *</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Например, ABC" />
        </div>

        <div className="form-field">
          <label>Глаз</label>
          <select value={eye} onChange={(e) => setEye(e.target.value as 'R' | 'L')}>
            <option value="R">Правый</option>
            <option value="L">Левый</option>
          </select>
        </div>

        <div className="form-field form-field--full">
          <label>Диагноз / группа</label>
          <select value={pathology} onChange={(e) => setPathology(e.target.value as Pathology)}>
            {PATHOLOGIES.map((p) => (
              <option key={p} value={p}>
                {PATHOLOGY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        {mode === 'manual' ? (
          <>
            <div className="form-field">
              <label>Фаза 1-й гармоники, рад</label>
              <input value={phase1} onChange={(e) => setPhase1(e.target.value)} placeholder="напр. -1.85" inputMode="decimal" />
            </div>

            <div className="form-field">
              <label>Наклон ФЧХ, рад/Гц</label>
              <input value={slopePFC} onChange={(e) => setSlopePFC(e.target.value)} placeholder="напр. 0.12" inputMode="decimal" />
            </div>

            <div className="form-field">
              <label>НЧ (сумма 20–50 Гц)</label>
              <input value={nf} onChange={(e) => setNf(e.target.value)} placeholder="напр. 18.9" inputMode="decimal" />
            </div>

            <div className="form-field">
              <label>ВЧ (сумма 51–81 Гц)</label>
              <input value={vf} onChange={(e) => setVf(e.target.value)} placeholder="напр. 1.6" inputMode="decimal" />
            </div>

            <div className="form-field form-field--full">
              <span className="form-field__hint">НЧ/ВЧ считается автоматически: {nfHfPreview}</span>
            </div>
          </>
        ) : (
          <div className="form-field form-field--full">
            <label>Файл с прибора (.csv, экспорт RETIport32)</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {deviceFileName && <span className="form-field__hint">Файл: {deviceFileName}</span>}
            {deviceError && <p style={{ color: 'var(--warn-text)', fontSize: 13, marginTop: 6 }}>{deviceError}</p>}

            {deviceFile && group && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="form-field">
                  <label>Протокол записи</label>
                  <select value={groupIndex} onChange={(e) => setGroupIndex(Number(e.target.value))}>
                    {deviceFile.groups.map((g, i) => (
                      <option key={g.index + g.name} value={i}>
                        {g.name} ({g.length} точек, шаг {(g.dist * 1000).toFixed(3)} мс)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>Начало интервала, с</label>
                    <input value={xmin} onChange={(e) => setXmin(e.target.value)} inputMode="decimal" />
                  </div>
                  <div className="form-field">
                    <label>Конец интервала, с</label>
                    <input value={xmax} onChange={(e) => setXmax(e.target.value)} inputMode="decimal" />
                  </div>
                </div>
                <span className="form-field__hint">
                  Вся запись: {maxDuration.toFixed(3)} с. По умолчанию берём интервал 0–0.25 с, в этом диапазоне обычно
                  находятся первые минимум/максимум ОЭРГ, но можно подвинуть вручную.
                </span>

                {analysis ? (
                  <div className="data-card" style={{ padding: 12 }}>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      Рассчитано через дискретное Фурье-преобразование и синтетический опорный импульс.
                      Абсолютные числа не обязаны точно совпадать с ранее сохранёнными значениями: там
                      использовался другой исходный файл.
                    </p>
                    <div className="form-grid">
                      <span>Фаза 1-й гармоники: <strong>{analysis.phase1.toFixed(3)}</strong> рад</span>
                      <span>Наклон ФЧХ: <strong>{analysis.slopePFC.toFixed(4)}</strong> рад/Гц</span>
                      <span>НЧ: <strong>{analysis.nf.toFixed(4)}</strong></span>
                      <span>ВЧ: <strong>{analysis.vf.toFixed(4)}</strong></span>
                      <span>НЧ/ВЧ: <strong>{analysis.nfHf.toFixed(2)}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="form-field__hint">Проверьте интервал: расчёт пока не получился.</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-field form-field--full">
          <label>Примечание</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--warn-text)', fontSize: 13, marginTop: 12 }}>{error}</p>
      )}
    </Modal>
  )
}
