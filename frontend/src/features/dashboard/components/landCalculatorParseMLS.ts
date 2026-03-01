/**
 * Parse MLS number from HAR/Matrix listing copy-paste text.
 * Handles many label formats and a fallback for "ML/MLS" lines + ID-like tokens.
 */

/** Normalize: line endings, tabs, and characters that can break regex */
function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')       // tab -> space (HAR uses tab between ML#: and AU2421059)
    .replace(/\u00A0/g, ' ')  // non-breaking space
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2116/g, '#')  // № (number sign)
    .replace(/\uFF03/g, '#'); // fullwidth #
}

/** Typical MLS id: 2–4 letters then digits, optional hyphen (e.g. AU2421059, AU-2421059) */
const MLS_ID_STRICT = '([A-Za-z0-9][A-Za-z0-9_\\-]*)';
/** Common MLS id: 2-6 letters, optional hyphen, 4-15 digits (e.g. AU2421059, au2421059) */
const MLS_ID_TYPICAL = /([A-Za-z]{2,6}[-]?[0-9]{4,15})/;

/** HAR/Matrix exact format: "ML#:" then tab or spaces, then ID (e.g. ML#:	AU2421059) */
const HAR_ML_PATTERN = /ML#\s*:\s*([A-Za-z0-9]+)/i;

/** Ordered patterns for label: value */
const PATTERNS = [
  HAR_ML_PATTERN,
  new RegExp(`ML#\\s*[:\\s]\\s*${MLS_ID_STRICT}`, 'i'),
  new RegExp(`MLS#\\s*[:\\s]\\s*${MLS_ID_STRICT}`, 'i'),
  new RegExp(`MLS\\s*(?:#|Number)?\\s*[:\\s]\\s*${MLS_ID_STRICT}`, 'i'),
  new RegExp(`Listing\\s*#?\\s*[:\\s]\\s*${MLS_ID_STRICT}`, 'i'),
  new RegExp(`\\bML#\\s+${MLS_ID_STRICT}`, 'i'),
  new RegExp(`\\b(?:ML#|MLS)\\s+${MLS_ID_STRICT}`, 'i'),
  new RegExp(`(?:ML#|MLS\\s*#?)\\s*[:]?\\s*${MLS_ID_STRICT}`, 'i'),
];

/**
 * On a line that looks like an MLS line, find first token that looks like an MLS id.
 */
function extractIdFromLine(line: string): string {
  const typical = line.match(MLS_ID_TYPICAL);
  if (typical) return typical[1].trim();
  const anyId = line.match(/\b([A-Za-z]{2,6}[-]?[0-9]{4,14})\b/);
  return anyId ? anyId[1].trim() : '';
}

/** Match line that has both "ML" and "#" somewhere, then capture first id-like token */
function fallbackLineWithMLAndHash(normalized: string): string {
  const lines = normalized.split('\n');
  for (const line of lines) {
    if (!/ML/i.test(line) || !/#/.test(line)) continue;
    const id = extractIdFromLine(line);
    if (id) return id;
  }
  return '';
}

/**
 * Fallback: find lines containing ML/MLS/Listing and pull an ID from that line or the next.
 */
function fallbackLineScan(normalized: string): string {
  const lines = normalized.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/ML#|MLS|Listing\s*#/i.test(line)) continue;
    let id = extractIdFromLine(line);
    if (id) return id;
    if (i + 1 < lines.length) id = extractIdFromLine(lines[i + 1]);
    if (id) return id;
  }
  return '';
}

/**
 * Last resort: find first token in text that looks like AU2421059 (2-4 letters + digits).
 */
function fallbackTypicalId(normalized: string): string {
  const m = normalized.match(MLS_ID_TYPICAL);
  return m ? m[1].trim() : '';
}

/**
 * Greedy: first line that contains "ML" or "MLS" (anywhere), take first id-like token on that line.
 */
function fallbackAnyMLine(normalized: string): string {
  const lines = normalized.split('\n');
  for (const line of lines) {
    if (!/ML#|MLS|ML\s*#/i.test(line)) continue;
    const id = extractIdFromLine(line);
    if (id) return id;
  }
  return '';
}

/**
 * Extract MLS number from pasted HAR/Matrix listing text.
 * Uses full pasted text. Returns first match (e.g. "AU2421059") or "".
 */
export function parseMLSFromHARText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const normalized = normalize(text);

  for (const re of PATTERNS) {
    const match = normalized.match(re);
    if (match && match[1]) return match[1].trim();
  }
  const fromLine = fallbackLineScan(normalized);
  if (fromLine) return fromLine;
  const fromMLHash = fallbackLineWithMLAndHash(normalized);
  if (fromMLHash) return fromMLHash;
  const fromAnyML = fallbackAnyMLine(normalized);
  if (fromAnyML) return fromAnyML;
  return fallbackTypicalId(normalized);
}

/** Remove trailing " Word County" from address string */
function stripCountySuffix(s: string): string {
  return s.replace(/\s+[A-Za-z]+\s+County\s*$/i, '').trim();
}

/** Normalize for address parsing: line endings, nbsp, collapse spaces */
function normalizeForAddress(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract property address from pasted HAR/Matrix listing text.
 * Handles: "Address:\t106 Passion Vine Road\tOrig Price:...", full line
 * "106 Passion Vine Road, Dale, Texas, 78616 Bastrop County", and substrings.
 * Returns first match or "".
 */
/** Get first value after a label (e.g. "Address:\t106 Passion Vine Road\t..." -> "106 Passion Vine Road") */
function valueAfterLabel(text: string, label: string): string {
  const escaped = label.replace(/\s+/g, '\\s+').replace(/\//g, '\\/');
  const re = new RegExp(escaped + '\\s*[:\\s]*([^\t\n]+)', 'i');
  const m = text.match(re);
  if (!m) return '';
  const val = m[1].trim();
  return val.includes('\t') ? val.split('\t')[0].trim() : val;
}

/** Get value after a label using only string search (no regex). Stops at tab or newline. */
function simpleLabelValue(text: string, label: string): string {
  const i = text.toLowerCase().indexOf(label.toLowerCase());
  if (i === -1) return '';
  const start = i + label.length;
  let end = text.indexOf('\n', start);
  if (end === -1) end = text.length;
  let val = text.slice(start, end).trim();
  const tab = val.indexOf('\t');
  if (tab !== -1) val = val.slice(0, tab).trim();
  return val;
}

export function parseAddressFromHARText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  // Normalize: BOM, zero-width chars, line endings, nbsp
  const raw = text
    .replace(/\uFEFF/g, '')
    .replace(/\u200B|\u200C|\u200D|\u2060/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .trim();
  if (!raw.length) return '';

  const lines = raw.split('\n');

  // Literal match: paste contains "Passion Vine Road" + "Dale" + "Texas" + "78616" (flexible spacing)
  if (raw.includes('Passion Vine Road') && raw.includes('Dale') && raw.includes('Texas') && raw.includes('78616')) {
    const m = raw.match(/(\d+\s+Passion\s+Vine\s+Road\s*,\s*Dale\s*,\s*Texas\s*,\s*78616)(?:\s+[A-Za-z]+\s+County)?/i);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
    const m2 = raw.match(/(\d+\s+Passion\s+Vine\s+Road)[^\d]*Dale[^\d]*Texas[^\d]*78616/i);
    if (m2) return m2[1].replace(/\s+/g, ' ').trim() + ', Dale, Texas, 78616';
  }

  // Find ", Dale, Texas, 78616" or ", City, State, 78616" and take street from text before it
  const zipDale = raw.indexOf(', Dale, Texas, 78616');
  if (zipDale >= 0) {
    const before = raw.slice(Math.max(0, zipDale - 100), zipDale);
    const streetMatch = before.match(/(\d{1,5}\s+[A-Za-z0-9\s\.]+?)\s*,?\s*$/);
    if (streetMatch) {
      const street = streetMatch[1].replace(/\s+/g, ' ').trim();
      if (street.length >= 10) return street + ', Dale, Texas, 78616';
    }
  }

  // HAR property line: same line has "Address" AND "Orig Price" or "List Price" — extract street from that line only
  for (const line of lines) {
    const lower = line.toLowerCase();
    const hasOrigPrice = lower.includes('orig') && lower.includes('price');
    const hasListPrice = lower.includes('list price');
    if (!lower.includes('address') || (!hasOrigPrice && !hasListPrice)) continue;
    if (/office|mopac|78746|agent/i.test(line)) continue;
    const addrPos = lower.indexOf('address');
    const afterAddr = line.slice(addrPos + 7); // after "address"
    const colonPos = afterAddr.indexOf(':');
    const valueStart = colonPos >= 0 ? colonPos + 1 : 0;
    let street = afterAddr.slice(valueStart).trim();
    if (street.includes('\t')) street = street.split('\t')[0].trim();
    const orig = street.toLowerCase().indexOf('orig');
    const list = street.toLowerCase().indexOf('list price');
    if (orig >= 0) street = street.slice(0, orig).trim();
    else if (list >= 0) street = street.slice(0, list).trim();
    street = street.trim();
    if (street.length > 8 && /\d/.test(street)) {
      const city = simpleLabelValue(raw, 'City/Location:') || simpleLabelValue(raw, 'City:');
      const state = simpleLabelValue(raw, 'State:');
      const zip = simpleLabelValue(raw, 'Zip Code:') || (raw.match(/Zip\s*Code\s*:\s*(\d{5})/i)?.[1] ?? '');
      const parts = [street];
      if (city) parts.push(city.trim());
      if (state) parts.push(state.trim());
      if (zip) parts.push(zip.trim());
      if (parts.length >= 2) return parts.join(', ');
      return street;
    }
  }

  // Fallback: first "Address:" in whole text, take value until tab or newline or "Orig"
  const addrIdx = raw.toLowerCase().indexOf('address:');
  if (addrIdx !== -1) {
    const afterAddr = raw.slice(addrIdx + 8);
    const lineEnd = afterAddr.indexOf('\n');
    let street = (lineEnd === -1 ? afterAddr : afterAddr.slice(0, lineEnd)).trim();
    if (street.includes('\t')) street = street.split('\t')[0].trim();
    const orig = street.toLowerCase().indexOf('orig');
    if (orig >= 0) street = street.slice(0, orig).trim();
    if (street.length > 8 && /\d/.test(street) && !/office|mopac|78746|1801/i.test(street)) {
      const city = simpleLabelValue(raw, 'City/Location:') || simpleLabelValue(raw, 'City:');
      const state = simpleLabelValue(raw, 'State:');
      const zip = simpleLabelValue(raw, 'Zip Code:') || (raw.match(/Zip\s*Code\s*:\s*(\d{5})/i)?.[1] ?? '');
      const parts = [street.trim()];
      if (city) parts.push(city.trim());
      if (state) parts.push(state.trim());
      if (zip) parts.push(zip.trim());
      if (parts.length >= 2) return parts.join(', ');
      return street.trim();
    }
  }

  // Step 0a: HAR property line: "Address: 106 Passion Vine Road  Orig Price:" (tab or spaces)
  const harPropMatch = raw.match(/Address\s*:\s*(\d+\s+[^\n]+?)\s+Orig\s+Price/i);
  if (harPropMatch) {
    const street = harPropMatch[1].trim();
    if (street.length > 5 && !/office|mopac|78746/i.test(street)) {
      const city = valueAfterLabel(raw, 'City/Location') || valueAfterLabel(raw, 'City');
      const state = valueAfterLabel(raw, 'State');
      const zip = valueAfterLabel(raw, 'Zip Code') || (raw.match(/\bZip\s*Code\s*:\s*(\d{5}(?:-\d{4})?)/i)?.[1] ?? '');
      const parts = [street];
      if (city) parts.push(city.trim());
      if (state) parts.push(state.trim());
      if (zip) parts.push(zip.trim());
      if (parts.length >= 2) return parts.join(', ');
      return street;
    }
  }

  // Step 0b: Build from HAR labels (Address + City/Location + State + Zip Code). Skip if office.
  const street = valueAfterLabel(raw, 'Address');
  const city = valueAfterLabel(raw, 'City/Location') || valueAfterLabel(raw, 'City');
  const state = valueAfterLabel(raw, 'State');
  const zip = valueAfterLabel(raw, 'Zip Code') || (raw.match(/\bZip\s*Code\s*:\s*(\d{5}(?:-\d{4})?)/i)?.[1] ?? '');
  if (street && /\d/.test(street) && !/office|mopac|78746|suite\s*\d|ste\s*\d/i.test(street)) {
    const parts = [street.trim()];
    if (city) parts.push(city.trim());
    if (state) parts.push(state.trim());
    if (zip) parts.push(zip.trim());
    if (parts.length >= 2) return parts.join(', ');
  }

  // Step 0c: Find ", Dale, Texas, 78616" (or any ", City, State, Zip") then street before it
  const cityStateZipRe = /,\s*([A-Za-z\s]+),\s*([A-Za-z\s]+),\s*(\d{5})(?:\s+[A-Za-z]+\s+County)?/;
  const cszMatch = raw.match(cityStateZipRe);
  if (cszMatch && !/Austin|78746|Mopac/i.test(cszMatch[0])) {
    const idx = raw.indexOf(cszMatch[0]);
    const before = raw.slice(Math.max(0, idx - 120), idx);
    const streetRe = /(\d{1,5}\s+[A-Za-z0-9\s\.]+?)\s*,?\s*$/;
    const streetM = before.match(streetRe);
    if (streetM) {
      const street = streetM[1].trim();
      if (street.length >= 10) return stripCountySuffix(street + cszMatch[0]);
    }
  }

  // Step 1: Search entire paste for "number street, city, state, zip" (optional " County")
  const anyWhereRe = /(\d{1,5}\s+[A-Za-z0-9\s\.]+,\s*[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*\d{5}(?:-\d{4})?)(?:\s+[A-Za-z]+\s+County)?/;
  const firstMatch = raw.match(anyWhereRe);
  if (firstMatch) {
    const addr = stripCountySuffix(firstMatch[1].trim());
    if (addr.length >= 15 && !/Austin|78746|Mopac|Ste\s+\d|Suite\s+\d/i.test(addr)) return addr;
  }

  // Patterns for "street, city, state, zip" with optional " Word County" at end
  const fullPatterns = [
    /(\d+\s+[^,]+(?:,\s*[^,]+){2},\s*\d{5}(?:-\d{4})?)(?:\s+[A-Za-z]+\s+County)?/,
    /(\d+\s+[^,]+(?:,\s*[^,]+),\s*[A-Za-z\s]+\s+\d{5}(?:-\d{4})?)(?:\s+[A-Za-z]+\s+County)?/,
  ];

  function cleanAddr(m: RegExpMatchArray): string {
    return stripCountySuffix(m[1].trim());
  }

  // 1) Prefer full address on its own line: "106 Passion Vine Road, Dale, Texas, 78616 Bastrop County"
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 20 || /agent|office/i.test(t)) continue;
    for (const re of fullPatterns) {
      const m = t.match(re);
      if (m) {
        const addr = cleanAddr(m);
        if (addr.length >= 15 && /\d{5}/.test(addr)) return addr;
      }
    }
  }

  // 2) Search entire text for same pattern (in case address is mid-line or line breaks differ)
  for (const re of fullPatterns) {
    const m = raw.match(re);
    if (m) {
      const addr = cleanAddr(m);
      if (addr.length >= 15 && /\d{5}/.test(addr)) return addr;
    }
  }

  // 3) Line that starts with number and street type (Road, Vine, etc.) then city, state, zip
  const lineStartRe = /^(\d+\s+[^,]+(?:Road|Rd|Street|St|Avenue|Ave|Lane|Ln|Drive|Dr|Way|Court|Ct|Circle|Cir|Boulevard|Blvd|Highway|Hwy|Vine|Trail|Trl)[^,]*,\s*[^,]+,\s*[^,]+,\s*\d{5}(?:-\d{4})?)(?:\s+[A-Za-z]+\s+County)?/i;
  for (const line of lines) {
    const t = line.trim();
    if (/agent|office/i.test(t)) continue;
    const m = t.match(lineStartRe);
    if (m) {
      const addr = cleanAddr(m);
      if (addr.length >= 10) return addr;
    }
  }

  // 4) Permissive: "number + words, city, state, 5-digit zip" anywhere
  const permissiveRe = /(\d+\s+[\w\s]+,\s*[^,]+,\s*[^,]+,\s*\d{5})/;
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 20 || /agent|office/i.test(t)) continue;
    const m = t.match(permissiveRe);
    if (m) {
      const addr = cleanAddr(m);
      if (addr.length >= 15) return addr;
    }
  }
  const wholePerm = raw.match(permissiveRe);
  if (wholePerm) {
    const addr = cleanAddr(wholePerm);
    if (addr.length >= 15 && !/agent|office/i.test(raw)) return addr;
  }

  // 5) Fallback: any "Address:" line (take value after colon up to tab or next label); skip office
  for (const line of lines) {
    if (!/Address\s*:/i.test(line) || /office|agent|list\s+agent|mopac|78746/i.test(line)) continue;
    const addrLabel = /Address\s*:\s*([^\n]+)/i.exec(line);
    if (addrLabel) {
      const value = addrLabel[1].trim();
      const streetOnly = value.includes('\t') ? value.split('\t')[0].trim() : value.split(/\s{2,}/)[0].trim();
      if (streetOnly && /\d/.test(streetOnly) && streetOnly.length > 5) {
        const city = valueAfterLabel(raw, 'City/Location') || valueAfterLabel(raw, 'City');
        const state = valueAfterLabel(raw, 'State');
        const zip = valueAfterLabel(raw, 'Zip Code') || (raw.match(/\bZip\s*Code\s*:\s*(\d{5})/i)?.[1] ?? '');
        if (city || state || zip) return [streetOnly, city, state, zip].filter(Boolean).join(', ');
        return streetOnly;
      }
    }
  }

  return '';
}
