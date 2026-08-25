/**
 * Enterprise+ CSV Formula Injection Sanitizer & Generator
 * Protects against CSV / Formula Injection (OWASP ASVS 5.3.3) by neutralizing
 * leading '=', '+', '-', '@', '\t', '\r' characters that could trigger code execution in spreadsheet apps (Excel, LibreOffice, Apple Numbers).
 */

export function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val).trim();

  // Neutralize CSV Formula Injection payloads
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  str = str.replace(/"/g, '""');

  return `"${str}"`;
}

export function buildCsvString(headers: string[], rows: any[][], delimiter = ';'): string {
  const headerLine = headers.map(h => sanitizeCsvCell(h)).join(delimiter);
  const rowLines = rows.map(row => row.map(cell => sanitizeCsvCell(cell)).join(delimiter));
  return [headerLine, ...rowLines].join('\r\n');
}

export function createCsvBlob(headers: string[], rows: any[][], delimiter = ';'): Blob {
  const csvContent = buildCsvString(headers, rows, delimiter);
  // Include UTF-8 BOM for perfect character encoding and umlauts in Microsoft Excel
  return new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
    type: 'text/csv;charset=utf-8;'
  });
}

export function downloadCsvFile(filename: string, headers: string[], rows: any[][], delimiter = ';'): void {
  if (typeof document === 'undefined') return;

  const blob = createCsvBlob(headers, rows, delimiter);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
