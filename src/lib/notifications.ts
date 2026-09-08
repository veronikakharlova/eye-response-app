import { FullPatient } from './backend'
import { classifyPatient, Pathology } from '../data/csfModel'
import { toPatientRecord } from './patientRecord'

/**
 * Содержимое колокольчика — намеренно НЕ выдуманная лента активности, а
 * прямой вывод того, что и так уже посчитано/хранится в базе. Никаких
 * новых полей и фоновых процессов не заводим — только честные производные
 * от текущих данных.
 */

export type MismatchItem = {
  code: string
  pathology: Pathology
  matchCount: number
  totalCount: number
}

export type RecentItem = {
  code: string
  pathology: Pathology
  createdAt: string
}

/**
 * Пациенты, где авто-классификация (метод городских кварталов, см.
 * classifyPatient) не совпадает с диагнозом в базе хотя бы для одного
 * глаза. Тот же расчёт, что уже показан в столбце «Классификация» на
 * странице «Пациенты» (N/M согласуется) — здесь просто вынесен на видное
 * место как повод посмотреть карточку.
 */
export function computeMismatches(patients: FullPatient[]): MismatchItem[] {
  const items: MismatchItem[] = []
  for (const p of patients) {
    if (p.records.length === 0) continue
    let matchCount = 0
    for (const r of p.records) {
      if (classifyPatient(toPatientRecord(r, p.pathology)).nearest === p.pathology) matchCount += 1
    }
    if (matchCount < p.records.length) {
      items.push({ code: p.code, pathology: p.pathology, matchCount, totalCount: p.records.length })
    }
  }
  return items
}

/**
 * Пациенты, добавленные за последние `withinDays` дней — по реальному
 * created_at из Supabase. В демо-режиме (без базы) created_at почти всегда
 * пуст — тогда список просто пуст, это не баг, а честность: придумывать
 * "недавно добавленных" не из чего.
 */
export function computeRecentlyAdded(patients: FullPatient[], withinDays = 14): RecentItem[] {
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000
  return patients
    .filter((p): p is FullPatient & { created_at: string } => !!p.created_at && new Date(p.created_at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map((p) => ({ code: p.code, pathology: p.pathology, createdAt: p.created_at }))
}
