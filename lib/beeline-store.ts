// localStorage-backed store for the BeeLine import POC.
//
// Keeps the parsed Accenture timesheets + synthesised employees alongside
// metadata about the import (when, how many rows). All client-side; no
// backend yet. Versioned key so a schema change can invalidate cleanly.

import type { Timesheet, Employee } from "./types"

const STORAGE_KEY = "beeline-acc-import-v1"

export interface BeelineImportSnapshot {
  importedAt:      string        // ISO timestamp of last import
  rowCount:        number        // rows the parser successfully accepted
  errorCount:      number
  warningCount:    number
  unmappedHeaders: string[]
  timesheets:      Timesheet[]
  employees:       Employee[]
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function loadBeelineImport(): BeelineImportSnapshot | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BeelineImportSnapshot
    if (!parsed.timesheets || !Array.isArray(parsed.timesheets)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveBeelineImport(snapshot: BeelineImportSnapshot): void {
  if (!isBrowser()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export function clearBeelineImport(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(STORAGE_KEY)
}

// Convenience: return just the timesheets, empty array if none.
export function getImportedAccTimesheets(): Timesheet[] {
  return loadBeelineImport()?.timesheets ?? []
}

export function getImportedAccEmployees(): Employee[] {
  return loadBeelineImport()?.employees ?? []
}

// Custom event so any open page (Inbox, Settings) can refresh after an
// import or clear without a full page reload.
export const BEELINE_IMPORT_EVENT = "beeline-import-changed"

export function emitBeelineImportChange(): void {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(BEELINE_IMPORT_EVENT))
}
