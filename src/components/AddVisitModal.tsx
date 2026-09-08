import { useState } from 'react'
import Modal from './Modal'
import { usePatientsData } from '../lib/PatientsDataContext'
import './modal.css'

type Props = {
  code: string
  eye: 'R' | 'L'
  onClose: () => void
}

/**
 * Новый визит уже существующего пациента (та самая «история болезни» из
 * ВКР, backend.addVisit). Отдельная маленькая форма, а не переиспользование
 * AddPatientModal — там код/глаз/диагноз выбираются заново, здесь они уже
 * известны и не редактируются.
 */
export default function AddVisitModal({ code, eye, onClose }: Props) {
  const { addVisit } = usePatientsData()
  const today = new Date().toISOString().slice(0, 10)

  const [visitDate, setVisitDate] = useState(today)
  const [phase1, setPhase1] = useState('')
  const [slopePFC, setSlopePFC] = useState('')
  const [nf, setNf] = useState('')
  const [vf, setVf] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const phase1Num = parseFloat(phase1.replace(',', '.'))
    const slopeNum = parseFloat(slopePFC.replace(',', '.'))
    const nfNum = parseFloat(nf.replace(',', '.'))
    const vfNum = parseFloat(vf.replace(',', '.'))
    if (![phase1Num, slopeNum, nfNum, vfNum].every(Number.isFinite)) {
      setError('Проверьте числовые поля признаков: где-то не введено число.')
      return
    }
    if (!visitDate) {
      setError('Укажите дату визита.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await addVisit(code, eye, {
        phase1: phase1Num,
        slopePfc: slopeNum,
        nf: nfNum,
        vf: vfNum,
        visitDate,
        note: note.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить визит.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={`Новый визит — ${code} · ${eye === 'R' ? 'правый глаз' : 'левый глаз'}`}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button type="button" className="page-btn" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button type="button" className="page-btn page-btn--primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Добавляем…' : 'Добавить визит'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-field form-field--full">
          <label>Дата визита</label>
          <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} max={today} />
        </div>

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
          <label>Примечание</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
        </div>
      </div>

      {error && <p style={{ color: 'var(--warn-text)', fontSize: 13, marginTop: 12 }}>{error}</p>}
    </Modal>
  )
}
