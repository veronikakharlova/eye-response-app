import { useState } from 'react'
import Modal from './Modal'
// @ts-ignore — см. пояснение в MyopiaPage.tsx: файла нет в CI-сборке для деплоя.
import { MyopiaIdentity } from '../data/myopiaIdentity'

type Props = {
  onClose: () => void
  onAdd: (record: MyopiaIdentity) => void
}

function isoToRu(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/**
 * Форма добавления пациента на странице «Миопия» (реальные ФИО). Как и с
 * анонимной таблицей — запись живёт только в памяти вкладки, без бэкенда
 * сохранять её пока некуда.
 */
export default function AddMyopiaPatientModal({ onClose, onAdd }: Props) {
  const [code, setCode] = useState('')
  const [fio, setFio] = useState('')
  const [sex, setSex] = useState<'F' | 'M'>('F')
  const [dob, setDob] = useState('')
  const [ageFile, setAgeFile] = useState('')
  const [testDate, setTestDate] = useState('')
  const [clinic, setClinic] = useState('Moscow Helmholtz Research Institute of Eye Diseases')
  const [operator, setOperator] = useState('')
  const [stage, setStage] = useState('не указана')
  const [inApp, setInApp] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const codeTrim = code.trim().toUpperCase()
    const fioTrim = fio.trim()
    if (!codeTrim || !fioTrim || !dob || !testDate) {
      setError('Заполните код, ФИО, дату рождения и дату обследования.')
      return
    }
    const ageNum = parseInt(ageFile, 10)
    onAdd({
      code: codeTrim,
      inApp,
      fio: fioTrim,
      sex,
      dob: isoToRu(dob),
      ageFile: Number.isFinite(ageNum) ? ageNum : 0,
      testDate: isoToRu(testDate),
      clinic: clinic.trim(),
      operator: operator.trim() || 'не указан',
      stage,
      note: note.trim() || undefined,
    })
    onClose()
  }

  return (
    <Modal
      title="Добавить пациента (Миопия)"
      onClose={onClose}
      width={600}
      footer={
        <>
          <button type="button" className="page-btn" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="page-btn page-btn--primary" onClick={handleSubmit}>
            Добавить
          </button>
        </>
      }
    >
      <p className="form-field__hint" style={{ marginBottom: 'var(--space-14)' }}>
        Пока без базы данных: запись появится в таблице сразу, но живёт только в этой вкладке и исчезнет при
        перезагрузке страницы.
      </p>

      <div className="form-grid">
        <div className="form-field">
          <label>Код *</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Например, XYZ" />
        </div>
        <div className="form-field">
          <label>Пол</label>
          <select value={sex} onChange={(e) => setSex(e.target.value as 'F' | 'M')}>
            <option value="F">Женский</option>
            <option value="M">Мужской</option>
          </select>
        </div>

        <div className="form-field form-field--full">
          <label>ФИО *</label>
          <input value={fio} onChange={(e) => setFio(e.target.value)} placeholder="Фамилия Имя Отчество" />
        </div>

        <div className="form-field">
          <label>Дата рождения *</label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Возраст (файл)</label>
          <input value={ageFile} onChange={(e) => setAgeFile(e.target.value)} inputMode="numeric" placeholder="напр. 34" />
        </div>

        <div className="form-field">
          <label>Дата обследования *</label>
          <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Стадия</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="не указана">не указана</option>
            <option value="средняя степень">средняя степень</option>
            <option value="высокая степень">высокая степень</option>
            <option value="высокая степень + ПВХРД">высокая степень + ПВХРД</option>
          </select>
        </div>

        <div className="form-field">
          <label>Клиника</label>
          <input value={clinic} onChange={(e) => setClinic(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Оператор</label>
          <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Например, Tsapenko I.V." />
        </div>

        <div className="form-field">
          <label>Есть в приложении</label>
          <div className="form-check-group">
            <label>
              <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} />
              Отметить как «в приложении»
            </label>
          </div>
        </div>

        <div className="form-field form-field--full">
          <label>Примечание</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
        </div>
      </div>

      {error && <p style={{ color: 'var(--warn-text)', fontSize: 13, marginTop: 'var(--space-12)' }}>{error}</p>}
    </Modal>
  )
}
