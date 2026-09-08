import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import {
  fetchAllPatients,
  addPatient as addPatientApi,
  addVisit as addVisitApi,
  isSupabaseConfigured,
  FullPatient,
  NewPatientInput,
} from './backend'
import { useAuth } from './AuthContext'
import { PATIENTS, PatientRecord } from '../data/csfModel'
import { PATIENT_IDENTITY } from '../data/patientIdentity'
import { parseRuDateToIso } from './dates'

/**
 * Единая точка входа за данными пациентов для всех страниц (Пациенты,
 * карточка пациента). Скрывает, откуда на самом деле данные: если Supabase
 * настроен — из базы (fetchAllPatients из lib/backend.ts), если нет —
 * собирает точно такую же форму (FullPatient[]) из статичных файлов
 * data/csfModel.ts + data/patientIdentity.ts, как было раньше. PatientsPage
 * и PatientDetailPage работают с FullPatient[] и знать не знают, откуда он.
 */

function buildStaticFullPatients(): FullPatient[] {
  const byCode = new Map<string, FullPatient>()
  for (const r of PATIENTS as PatientRecord[]) {
    let fp = byCode.get(r.code)
    if (!fp) {
      const identity = PATIENT_IDENTITY[r.code]
      fp = {
        code: r.code,
        pathology: r.pathology,
        identity: identity
          ? {
              code: r.code,
              fio: identity.fio,
              sex: identity.sex,
              dob: parseRuDateToIso(identity.dob),
              clinic: identity.clinic,
              operator: null,
              stage: identity.stage,
              doctor_comment: identity.comment,
              research_note: null,
              device_pat_id: null,
              in_app: true,
              synthetic: true,
              created_at: '',
            }
          : null,
        records: [],
        created_at: null,
      }
      byCode.set(r.code, fp)
    }
    fp.records.push({
      id: `${r.code}-${r.eye}`,
      code: r.code,
      eye: r.eye,
      visit_date: '',
      phase1: r.phase1,
      slope_pfc: r.slopePFC,
      nf: r.nf,
      vf: r.vf,
      nf_hf: r.nfHf,
      research_note: r.note ?? null,
      created_at: '',
    })
  }
  return Array.from(byCode.values())
}

type PatientsDataState = {
  patients: FullPatient[]
  loading: boolean
  error: string | null
  /** true — данные реально из Supabase; false — статичные файлы (демо-режим без бэкенда). */
  usingLiveData: boolean
  refetch: () => void
  addPatient: (input: NewPatientInput) => Promise<void>
  addVisit: (
    code: string,
    eye: 'R' | 'L',
    data: { phase1: number; slopePfc: number; nf: number; vf: number; visitDate?: string; note?: string },
  ) => Promise<void>
}

const PatientsDataContext = createContext<PatientsDataState | null>(null)

export function PatientsDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [patients, setPatients] = useState<FullPatient[]>(() =>
    isSupabaseConfigured ? [] : buildStaticFullPatients(),
  )
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    fetchAllPatients()
      .then(setPatients)
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить пациентов из базы.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isSupabaseConfigured && session) load()
  }, [session, load])

  const addPatient = useCallback(
    async (input: NewPatientInput) => {
      if (isSupabaseConfigured) {
        await addPatientApi(input)
        load()
        return
      }
      // Без бэкенда — как и раньше, запись живёт только в памяти вкладки.
      setPatients((prev) => {
        const nfHf = input.vf !== 0 ? Number((input.nf / input.vf).toFixed(2)) : 0
        const record = {
          id: `${input.code}-${input.eye}-${Date.now()}`,
          code: input.code,
          eye: input.eye,
          visit_date: '',
          phase1: input.phase1,
          slope_pfc: input.slopePfc,
          nf: input.nf,
          vf: input.vf,
          nf_hf: nfHf,
          research_note: input.note ?? null,
          created_at: '',
        }
        const existing = prev.find((p) => p.code === input.code)
        if (existing) {
          // Новый объект пациента, а не мутация старого на месте: ниже по
          // дереву (карточка пациента) useMemo сверяет именно ссылку на
          // FullPatient, и мутация "невидимо" для него не считается
          // изменением — из-за этого график динамики визитов однажды не
          // перерисовался после добавления записи.
          return prev.map((p) => (p.code === input.code ? { ...p, records: [...p.records, record] } : p))
        }
        // Единственный случай в демо-режиме, где created_at честный — этот
        // пациент правда только что появился, прямо сейчас, у вас в браузере.
        return [
          ...prev,
          { code: input.code, pathology: input.pathology, identity: null, records: [record], created_at: new Date().toISOString() },
        ]
      })
    },
    [load],
  )

  // Новый визит существующего пациента — та самая «история болезни» из ВКР
  // (см. addVisit в lib/backend.ts). В демо-режиме честно ведём себя так же,
  // как addPatient выше: запись живёт только в памяти вкладки, но дата у неё
  // настоящая — сегодняшняя, потому что визит правда только что добавлен.
  const addVisit = useCallback(
    async (
      code: string,
      eye: 'R' | 'L',
      data: { phase1: number; slopePfc: number; nf: number; vf: number; visitDate?: string; note?: string },
    ) => {
      if (isSupabaseConfigured) {
        await addVisitApi(code, eye, data)
        load()
        return
      }
      setPatients((prev) => {
        const nfHf = data.vf !== 0 ? Number((data.nf / data.vf).toFixed(2)) : 0
        const record = {
          id: `${code}-${eye}-${Date.now()}`,
          code,
          eye,
          visit_date: data.visitDate ?? new Date().toISOString().slice(0, 10),
          phase1: data.phase1,
          slope_pfc: data.slopePfc,
          nf: data.nf,
          vf: data.vf,
          nf_hf: nfHf,
          research_note: data.note ?? null,
          created_at: '',
        }
        // Тот же приём, что и в addPatient выше: новый объект пациента вместо
        // мутации старого на месте, иначе useMemo графика динамики визитов
        // на карточке пациента не увидит изменения (ссылка на FullPatient не
        // меняется при мутации в месте).
        return prev.map((p) => (p.code === code ? { ...p, records: [...p.records, record] } : p))
      })
    },
    [load],
  )

  return (
    <PatientsDataContext.Provider
      value={{ patients, loading, error, usingLiveData: isSupabaseConfigured, refetch: load, addPatient, addVisit }}
    >
      {children}
    </PatientsDataContext.Provider>
  )
}

export function usePatientsData() {
  const ctx = useContext(PatientsDataContext)
  if (!ctx) throw new Error('usePatientsData должен вызываться внутри <PatientsDataProvider>')
  return ctx
}
