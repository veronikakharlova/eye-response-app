/**
 * Парсер реального экспорта прибора Roland Consult RETIport32 (.csv).
 * Формат: несколько секций "Plots of Group" (протоколы записи — Rod-R,
 * Max-R, OSZ, Cone-R, 30 Hz-фликкер и т.п.), в каждой — Length/Dist[s]
 * (число точек и реальный шаг дискретизации) и RAW DATA SECTION с сырыми
 * значениями по 128 точек в строке для правого (R) и левого (L) канала.
 */

export type DeviceChannel = {
  /** '1' = правый глаз (R), '2' = левый (L) — как в файле прибора */
  chanNum: string
  name: string
  values: number[]
}

export type DeviceGroup = {
  index: string
  /** Название протокола, напр. "Rod-R", "Max-R", "OSZ", "Cone-R", "30 Hz" */
  name: string
  length: number
  /** Шаг дискретизации, с */
  dist: number
  channels: DeviceChannel[]
}

export type DeviceFile = {
  patientLine?: string
  groups: DeviceGroup[]
}

function numRu(s: string): number {
  return parseFloat(s.replace(',', '.').trim())
}

export function parseDeviceFile(text: string): DeviceFile {
  const lines = text.split(/\r?\n/)
  const groups: DeviceGroup[] = []
  let patientLine: string | undefined

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('Patient;')) {
      patientLine = lines[i + 1]
    }
    if (line.startsWith('Plots of Group')) {
      const parts = line.split(';')
      const index = parts[1] ?? ''
      const name = (parts[2] ?? '').trim()
      i++
      const lenLine = lines[i] ?? ''
      const lp = lenLine.split(';')
      const length = parseInt(lp[1] ?? '0', 10)
      const dist = numRu(lp[3] ?? '0')

      while (i < lines.length && !lines[i].startsWith('RAW DATA SECTION')) i++
      i++ // заголовок "Chan;Name;Offset;Points[V]..."
      i++ // первая строка данных

      const chanMap = new Map<string, DeviceChannel>()
      while (i < lines.length) {
        const dl = lines[i]
        if (!dl || !/^\d+;/.test(dl)) break
        const dparts = dl.split(';')
        const chanNum = dparts[0]
        const chanName = dparts[1]
        const offset = parseInt(dparts[2], 10)
        const values = dparts
          .slice(3)
          .filter((v) => v.trim() !== '')
          .map(numRu)
        let chan = chanMap.get(chanNum)
        if (!chan) {
          chan = { chanNum, name: chanName, values: [] }
          chanMap.set(chanNum, chan)
        }
        for (let k = 0; k < values.length; k++) {
          chan.values[offset - 1 + k] = values[k]
        }
        i++
      }
      groups.push({ index, name, length, dist, channels: Array.from(chanMap.values()) })
      continue
    }
    i++
  }

  return { patientLine, groups }
}

/** Файлы прибора приходят в кириллице/латинице в кодировке ISO-8859-1 (Windows). */
export async function readDeviceFileAsText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  return new TextDecoder('windows-1252').decode(buf)
}
