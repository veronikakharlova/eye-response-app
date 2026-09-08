import { PatientRecord, Pathology } from '../data/csfModel'
import { FullPatient } from './backend'

/**
 * patient_records (форма из Supabase) → PatientRecord (форма, на которой
 * работает вся существующая логика — classifyPatient, buildCurve,
 * CSFChart). Общий для PatientsPage и PatientDetailPage, чтобы не
 * дублировать мэппинг в двух местах.
 */
export function toPatientRecord(row: FullPatient['records'][number], pathology: Pathology): PatientRecord {
  return {
    code: row.code,
    eye: row.eye,
    pathology,
    note: row.research_note ?? undefined,
    phase1: row.phase1,
    slopePFC: row.slope_pfc,
    nfHf: row.nf_hf,
    nf: row.nf,
    vf: row.vf,
  }
}
