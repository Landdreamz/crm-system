/**
 * Parse MLS # and street address from HAR / Matrix-style pasted listing text.
 * Used by LandCalculator for subject property, comps, and active listings.
 */

function stripCountySuffix(s: string): string {
  return s.replace(/\s+[A-Za-z]+\s+County\s*$/i, '').trim();
}

/**
 * Extract MLS / ML# from full pasted text (Matrix often uses tabs, e.g. ML#:\tAU2421059).
 */
export function parseMLSFromHARText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const normalized = text.replace(/\r\n/g, '\n');
  const patterns: RegExp[] = [
    /ML#\s*:\s*([A-Za-z0-9_-]+)/i,
    /MLS\s*#?\s*:\s*([A-Za-z0-9_-]+)/i,
    /ML#\s+([A-Za-z0-9_-]+)/i,
  ];
  for (const re of patterns) {
    const m = normalized.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

/**
 * Best-effort street address from pasted MLS / county / HAR blocks.
 */
export function parseAddressFromHARText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split(/\r\n|\r|\n/);
  let found = '';

  for (const rawLine of lines) {
    const t = rawLine.trim();
    const lowerLine = t.toLowerCase();

    if (!found) {
      if (lowerLine.includes('address:') || lowerLine.includes('located at') || lowerLine.includes('property address')) {
        const addressMatch = t.match(/(?:address:|located at|property address:?)\s*(.+)/i);
        if (addressMatch) {
          let raw = addressMatch[1].trim();
          raw = raw.includes('\t') ? raw.split('\t')[0].trim() : raw;
          if (raw.length > 8 && /\d/.test(raw)) found = stripCountySuffix(raw);
        }
      }
      if (!found && /^\d+\s+[\w\s]+,\s*[^,]+,\s*[^,]+,\s*\d{5}/.test(t)) {
        found = stripCountySuffix(t);
      }
      if (!found && /^\d+\s+\w+/.test(t) && t.includes(',')) {
        found = stripCountySuffix(t);
      }
    }
  }

  if (!found) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      const hasOrigPrice = lower.includes('orig') && lower.includes('price');
      const hasListPrice = lower.includes('list price');
      if (!lower.includes('address') || (!hasOrigPrice && !hasListPrice)) continue;
      if (/office|mopac|78746/i.test(line)) continue;
      const addrPos = lower.indexOf('address');
      const afterAddr = line.slice(addrPos + 7);
      const colonPos = afterAddr.indexOf(':');
      const start = colonPos >= 0 ? colonPos + 1 : 0;
      let street = afterAddr.slice(start).trim();
      if (street.includes('\t')) street = street.split('\t')[0].trim();
      const orig = street.toLowerCase().indexOf('orig');
      const list = street.toLowerCase().indexOf('list price');
      if (orig >= 0) street = street.slice(0, orig).trim();
      else if (list >= 0) street = street.slice(0, list).trim();
      street = street.trim();
      if (street.length > 8 && /\d/.test(street)) {
        found = stripCountySuffix(street);
        break;
      }
    }
  }

  return found;
}
