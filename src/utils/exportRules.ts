import type { NormalizedAccessRule } from '../types/cloudflare'

/**
 * Helper to trigger browser download of an in-memory Blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Gets the current date string in YYYY-MM-DD format for filenames.
 */
function getTimestampSuffix(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Sanitizes and escapes a single cell for safe CSV output.
 * - Protects against CSV Injection by prefixing formula triggers (=, +, -, @, \t, \r) with a single quote.
 * - Escapes double quotes by doubling them (" -> "").
 * - Encloses the resulting string in double quotes.
 */
function sanitizeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return '""'
  }
  let str = String(value)

  // CSV Formula Injection mitigation (RFC 4180 / OWASP)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  // Escape double quotes
  str = str.replace(/"/g, '""')
  return `"${str}"`
}

/**
 * Exports access rules to a formatted JSON file and initiates browser download.
 */
export function exportRulesToJson(
  rules: NormalizedAccessRule[],
  filenamePrefix = 'cloudflare-access-rules'
): void {
  const jsonString = JSON.stringify(rules, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
  const filename = `${filenamePrefix}-${getTimestampSuffix()}.json`
  downloadBlob(blob, filename)
}

/**
 * Exports access rules to a CSV file with safe quote escaping and formula injection protection.
 * Prepend UTF-8 BOM (\uFEFF) so Excel and spreadsheet applications render international characters properly.
 */
export function exportRulesToCsv(
  rules: NormalizedAccessRule[],
  filenamePrefix = 'cloudflare-access-rules'
): void {
  const headers = [
    'ID',
    'Scope Type',
    'Zone/Account Name',
    'Target',
    'Value',
    'Mode',
    'Notes',
    'Created On',
  ]

  const rows = rules.map((r) => {
    const scopeName =
      r.scopeType === 'account'
        ? r.accountName || 'Cloudflare Account'
        : r.zoneName || r.zoneId || 'Zone'

    return [
      sanitizeCsvCell(r.id),
      sanitizeCsvCell(r.scopeType),
      sanitizeCsvCell(scopeName),
      sanitizeCsvCell(r.target),
      sanitizeCsvCell(r.value),
      sanitizeCsvCell(r.mode),
      sanitizeCsvCell(r.notes),
      sanitizeCsvCell(r.created_on),
    ].join(',')
  })

  // UTF-8 BOM (\uFEFF) ensures correct character encoding in Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const filename = `${filenamePrefix}-${getTimestampSuffix()}.csv`
  downloadBlob(blob, filename)
}
