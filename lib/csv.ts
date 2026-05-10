/**
 * Minimal RFC 4180-ish CSV parser.
 *
 * Handles:
 * - quoted fields ("...")
 * - escaped quotes inside quoted fields ("" → ")
 * - commas and newlines inside quoted fields
 * - CRLF and LF line endings
 * - trailing blank lines
 *
 * Returns an array of row objects keyed by the header line. Header keys are
 * kept verbatim — trim/normalise at the caller if needed.
 */
export function parseCsv(text: string): Record<string, string>[] {
  // Strip UTF-8 BOM if present (common when CSVs are exported from Excel)
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      // swallow CR; the LF that follows will commit the row
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  // commit trailing field/row if text didn't end with a newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r += 1) {
    const raw = rows[r];
    // skip fully-blank lines
    if (raw.length === 1 && raw[0].trim() === '') continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      obj[headers[c]] = (raw[c] ?? '').trim();
    }
    out.push(obj);
  }
  return out;
}
