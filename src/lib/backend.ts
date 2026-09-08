import { supabase, isSupabaseConfigured } from './supabaseClient'

/**
 * Типы и функции для работы с Supabase — прямое отражение таблиц из
 * supabase/schema.sql. Пока приложение (страницы Пациенты/Миопия/карточка
 * пациента) продолжает читать статичные данные из data/csfModel.ts и
 * т.д. — эти функции подготовлены заранее и включаются отдельным шагом,
 * когда ключи подтверждены и данные перенесены сид-скриптом
 * (supabase/seed.ts). Пока ключей нет, isSupabaseConfigured === false и
 * все функции ниже бросают понятную ошибку вместо непонятного краша.
 */

export type Pathology = 'norm' | 'myopia' | 'glaucoma' | 'amd'

export type PatientRow = {
  code: string
  pathology: Pathology
  created_at: string
}

export type PatientIdentityRow = {
  code: string
  fio: string
  sex: 'F' | 'M'
  dob: string | null
  clinic: string | null
  operator: string | null
  stage: string | null
  doctor_comment: string | null
  research_note: string | null
  device_pat_id: string | null
  in_app: boolean
  synthetic: boolean
  created_at: string
}

export type PatientRecordRow = {
  id: string
  code: string
  eye: 'R' | 'L'
  visit_date: string
  phase1: number
  slope_pfc: number
  nf: number
  vf: number
  nf_hf: number
  research_note: string | null
  created_at: string
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase не настроен: нет VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY в .env.local. ' +
        'См. .env.local.example.',
    )
  }
  return supabase
}

// --- Авторизация врача --------------------------------------------------

export async function signIn(email: string, password: string) {
  const client = requireSupabase()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function getCurrentSession() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  return data.session
}

/**
 * Смена пароля врача (страница «Настройки»). Сначала повторно проверяем
 * текущий пароль обычным входом — это защита именно на случай общего
 * компьютера в кабинете: если сессия осталась открытой после предыдущего
 * врача, поменять пароль всё равно можно, только зная старый.
 */
export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  const client = requireSupabase()
  const { error: reauthError } = await client.auth.signInWithPassword({ email, password: currentPassword })
  if (reauthError) throw new Error('Текущий пароль неверный.')
  const { error } = await client.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// --- Пациенты и их визиты -------------------------------------------------

export type FullPatient = {
  code: string
  pathology: Pathology
  identity: PatientIdentityRow | null
  records: PatientRecordRow[]
  /** Когда пациент создан в базе (patients.created_at). null — демо-режим
   *  без бэкенда, там этому полю взяться неоткуда, и мы это не выдумываем. */
  created_at: string | null
}

/**
 * Загружает всех пациентов вместе с идентичностью и полной историей
 * визитов. На масштабе в десятки-сотни пациентов проще и понятнее
 * сделать три отдельных запроса и склеить в JS, чем один запрос с
 * вложенными join'ами.
 */
export async function fetchAllPatients(): Promise<FullPatient[]> {
  const client = requireSupabase()

  const [patientsRes, identityRes, recordsRes] = await Promise.all([
    client.from('patients').select('*'),
    client.from('patient_identity').select('*'),
    client.from('patient_records').select('*').order('visit_date', { ascending: true }),
  ])
  if (patientsRes.error) throw patientsRes.error
  if (identityRes.error) throw identityRes.error
  if (recordsRes.error) throw recordsRes.error

  const identityByCode = new Map<string, PatientIdentityRow>()
  for (const row of identityRes.data as PatientIdentityRow[]) identityByCode.set(row.code, row)

  const recordsByCode = new Map<string, PatientRecordRow[]>()
  for (const row of recordsRes.data as PatientRecordRow[]) {
    const list = recordsByCode.get(row.code) ?? []
    list.push(row)
    recordsByCode.set(row.code, list)
  }

  return (patientsRes.data as PatientRow[]).map((p) => ({
    code: p.code,
    pathology: p.pathology,
    identity: identityByCode.get(p.code) ?? null,
    records: recordsByCode.get(p.code) ?? [],
    created_at: p.created_at,
  }))
}

/** История визитов одного пациента (оба глаза), по возрастанию даты. */
export async function fetchPatientHistory(code: string): Promise<PatientRecordRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('patient_records')
    .select('*')
    .eq('code', code)
    .order('visit_date', { ascending: true })
  if (error) throw error
  return data as PatientRecordRow[]
}

export type NewPatientInput = {
  code: string
  pathology: Pathology
  eye: 'R' | 'L'
  phase1: number
  slopePfc: number
  nf: number
  vf: number
  note?: string
}

/**
 * Добавление пациента через форму (AddPatientModal). Создаёт patients +
 * первую запись в patient_records; patient_identity сюда не входит — для
 * анонимной таблицы «Пациенты» идентичность необязательна (см. как
 * придуманные ФИО сейчас живут в data/patientIdentity.ts).
 */
export async function addPatient(input: NewPatientInput) {
  const client = requireSupabase()

  const { error: patientError } = await client
    .from('patients')
    .upsert({ code: input.code, pathology: input.pathology }, { onConflict: 'code' })
  if (patientError) throw patientError

  const nfHf = input.vf !== 0 ? Number((input.nf / input.vf).toFixed(2)) : 0
  const { error: recordError } = await client.from('patient_records').insert({
    code: input.code,
    eye: input.eye,
    phase1: input.phase1,
    slope_pfc: input.slopePfc,
    nf: input.nf,
    vf: input.vf,
    nf_hf: nfHf,
    research_note: input.note ?? null,
  })
  if (recordError) throw recordError
}

/** Новый визит уже существующего пациента — та самая «история болезни» из ВКР. */
export async function addVisit(
  code: string,
  eye: 'R' | 'L',
  data: { phase1: number; slopePfc: number; nf: number; vf: number; visitDate?: string; note?: string },
) {
  const client = requireSupabase()
  const nfHf = data.vf !== 0 ? Number((data.nf / data.vf).toFixed(2)) : 0
  const { error } = await client.from('patient_records').insert({
    code,
    eye,
    visit_date: data.visitDate ?? new Date().toISOString().slice(0, 10),
    phase1: data.phase1,
    slope_pfc: data.slopePfc,
    nf: data.nf,
    vf: data.vf,
    nf_hf: nfHf,
    research_note: data.note ?? null,
  })
  if (error) throw error
}

/**
 * Лог факта «нажали Скачать PDF» на графике пациента (см. chart_exports в
 * schema.sql). Сам файл никуда не грузится — печать/сохранение делает
 * системный диалог браузера, это только статистика для врача, кто и как
 * часто выгружает графики. Ошибку логирования не показываем пользователю
 * — это вспомогательная запись, а не часть основного сценария.
 */
export async function logChartExport(code: string, eye: 'R' | 'L', doctorId?: string) {
  const client = requireSupabase()
  const { error } = await client.from('chart_exports').insert({
    code,
    eye,
    exported_by: doctorId ?? null,
  })
  if (error) throw error
}

export type ChartExportRow = {
  id: string
  code: string
  eye: 'R' | 'L'
  exported_by: string | null
  created_at: string
}

/** Журнал скачиваний PDF-графиков (страница «Отчёты») — последние по времени. */
export async function fetchChartExports(limit = 100): Promise<ChartExportRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('chart_exports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as ChartExportRow[]
}

export { isSupabaseConfigured }
