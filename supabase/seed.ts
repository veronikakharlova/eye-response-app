/**
 * Сид-скрипт: переносит текущие статичные данные (data/csfModel.ts,
 * data/patientIdentity.ts, data/myopiaIdentity.ts) в таблицы Supabase
 * (patients / patient_identity / patient_records), описанные в
 * supabase/schema.sql.
 *
 * Запуск:
 *   npx tsx supabase/seed.ts
 *
 * Перед запуском в .env.local (он уже в .gitignore, см. *.local) должны
 * быть две строки:
 *   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * ⚠️ SUPABASE_SERVICE_ROLE_KEY — это НЕ anon-ключ. У него полный доступ к
 * базе в обход всех RLS-политик. Он нужен именно здесь (скрипт выполняется
 * в Node на локальной машине, а не в браузере), но его НЕЛЬЗЯ:
 *   - коммитить в git (даже случайно — .env.local уже в .gitignore, этого
 *     достаточно, просто не переносите его значение в другие файлы);
 *   - использовать в src/ (там только VITE_SUPABASE_ANON_KEY через
 *     src/lib/supabaseClient.ts).
 * Берётся из Supabase Dashboard → Project Settings → API → "service_role".
 *
 * Идемпотентность: patients и patient_identity — upsert по code, можно
 * запускать повторно. patient_records — перед вставкой удаляются все
 * существующие строки для переносимых кодов и вставляются заново (проще,
 * чем сверять построчно; исходные данные — статичные файлы, а не то, что
 * меняется руками в самой базе).
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

import { PATIENTS, type PatientRecord } from '../src/data/csfModel'
import { PATIENT_IDENTITY, type SyntheticIdentity } from '../src/data/patientIdentity'
import { MYOPIA_IDENTITY, type MyopiaIdentity } from '../src/data/myopiaIdentity'

// --- Загрузка .env.local вручную (без флагов/зависимостей) ----------------

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf-8')
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvLocal()

const url = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error(
    '✗ Не найдены VITE_SUPABASE_URL и/или SUPABASE_SERVICE_ROLE_KEY в .env.local.\n' +
      '  Добавьте обе строки (см. комментарий в начале supabase/seed.ts) и запустите скрипт снова.',
  )
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// --- Даты: "ДД.ММ.ГГГГ[ ЧЧ:ММ:СС]" → "ГГГГ-ММ-ДД" (или undefined) ----------

function parseRuDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  const datePart = value.trim().split(' ')[0]
  const m = datePart.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return undefined
  const [, dd, mm, yyyy] = m
  return `${yyyy}-${mm}-${dd}`
}

// --- Сведение идентичности к одной форме -----------------------------------

type ResolvedIdentity = {
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
  testDate?: string
}

function fromMyopiaIdentity(id: MyopiaIdentity): ResolvedIdentity {
  return {
    fio: id.fio,
    sex: id.sex,
    dob: parseRuDate(id.dob) ?? null,
    clinic: id.clinic,
    operator: id.operator,
    stage: id.stage,
    doctor_comment: id.comment ?? null,
    research_note: id.note ?? null,
    device_pat_id: id.patId ?? null,
    in_app: id.inApp,
    synthetic: false,
    testDate: id.testDate,
  }
}

function fromSyntheticIdentity(id: SyntheticIdentity): ResolvedIdentity {
  return {
    fio: id.fio,
    sex: id.sex,
    dob: parseRuDate(id.dob) ?? null,
    clinic: id.clinic,
    operator: null,
    stage: id.stage,
    doctor_comment: id.comment,
    research_note: null,
    device_pat_id: null,
    in_app: true,
    synthetic: true,
    testDate: id.testDate,
  }
}

// Реальные ФИО «Миопии» (кроме LII — inApp:false, её нет в PATIENTS) имеют
// приоритет над параллельными придуманными ФИО для тех же 8 кодов в
// patientIdentity.ts.
const realMyopiaByCode = new Map<string, MyopiaIdentity>()
for (const id of MYOPIA_IDENTITY) {
  if (id.inApp) realMyopiaByCode.set(id.code, id)
}

function resolveIdentity(code: string): ResolvedIdentity | null {
  const real = realMyopiaByCode.get(code)
  if (real) return fromMyopiaIdentity(real)
  const synthetic = PATIENT_IDENTITY[code]
  if (synthetic) return fromSyntheticIdentity(synthetic)
  return null
}

// --- Сборка данных ----------------------------------------------------------

const codeToPathology = new Map<string, PatientRecord['pathology']>()
for (const r of PATIENTS) {
  if (!codeToPathology.has(r.code)) codeToPathology.set(r.code, r.pathology)
}
const codes = [...codeToPathology.keys()]

async function main() {
  console.log(`Пациентов (уникальных кодов): ${codes.length}`)
  console.log(`Записей (глаз × визит) в PATIENTS: ${PATIENTS.length}`)

  const missingIdentity: string[] = []

  // 1) patients ---------------------------------------------------------
  const patientsRows = codes.map((code) => ({
    code,
    pathology: codeToPathology.get(code)!,
  }))
  {
    const { error } = await admin.from('patients').upsert(patientsRows, { onConflict: 'code' })
    if (error) throw error
    console.log(`✓ patients: upsert ${patientsRows.length} строк`)
  }

  // 2) patient_identity ---------------------------------------------------
  const identityRows: Array<{
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
  }> = []
  const testDateByCode = new Map<string, string>()

  for (const code of codes) {
    const identity = resolveIdentity(code)
    if (!identity) {
      missingIdentity.push(code)
      continue
    }
    if (identity.testDate) testDateByCode.set(code, identity.testDate)
    identityRows.push({
      code,
      fio: identity.fio,
      sex: identity.sex,
      dob: identity.dob,
      clinic: identity.clinic,
      operator: identity.operator,
      stage: identity.stage,
      doctor_comment: identity.doctor_comment,
      research_note: identity.research_note,
      device_pat_id: identity.device_pat_id,
      in_app: identity.in_app,
      synthetic: identity.synthetic,
    })
  }
  {
    const { error } = await admin.from('patient_identity').upsert(identityRows, { onConflict: 'code' })
    if (error) throw error
    console.log(`✓ patient_identity: upsert ${identityRows.length} строк`)
  }
  if (missingIdentity.length) {
    console.warn(`⚠ Без идентичности (только код + патология): ${missingIdentity.join(', ')}`)
  }

  // 3) patient_records ------------------------------------------------------
  // Пересоздаём записи по переносимым кодам, чтобы скрипт был безопасно
  // перезапускаемым (данные приходят из статичных файлов, не редактируются
  // руками в самой базе).
  {
    const { error: deleteError } = await admin.from('patient_records').delete().in('code', codes)
    if (deleteError) throw deleteError

    const recordRows = PATIENTS.map((r) => {
      const visitDate = parseRuDate(testDateByCode.get(r.code))
      const nfHf = r.vf !== 0 ? Number((r.nf / r.vf).toFixed(2)) : r.nfHf
      const row: Record<string, unknown> = {
        code: r.code,
        eye: r.eye,
        phase1: r.phase1,
        slope_pfc: r.slopePFC,
        nf: r.nf,
        vf: r.vf,
        nf_hf: nfHf,
        research_note: r.note ?? null,
      }
      if (visitDate) row.visit_date = visitDate
      return row
    })

    const { error: insertError } = await admin.from('patient_records').insert(recordRows)
    if (insertError) throw insertError
    console.log(`✓ patient_records: вставлено ${recordRows.length} строк`)
  }

  console.log('\nГотово. Данные перенесены в Supabase.')
}

main().catch((err) => {
  console.error('✗ Ошибка сид-скрипта:', err)
  process.exit(1)
})
