import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  TextareaAutosize,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { parseAddressFromHARText, parseMLSFromHARText } from './landCalculatorParseMLS';

interface HouseComp {
  address: string;
  mls: string;
  sqft: string;
  soldPrice: string;
  soldDate: string;
  dom: string;
}

const EMPTY_COMP = (): HouseComp => ({
  address: '',
  mls: '',
  sqft: '',
  soldPrice: '',
  soldDate: '',
  dom: '',
});

/** Rents from Zillow / HAR / Homes.com etc. — user-typed for benchmarks (not auto-fetched). */
interface HouseRentComp {
  address: string;
  beds: string;
  baths: string;
  sqft: string;
  rent: string;
  source: string;
}

const EMPTY_RENT_COMP = (): HouseRentComp => ({
  address: '',
  beds: '',
  baths: '',
  sqft: '',
  rent: '',
  source: '',
});

function medianFromSorted(sorted: number[]): number | null {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function parseMoney(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

function parseSqftFromText(text: string): string {
  const t = text.replace(/\r\n/g, '\n');
  const patterns = [
    /living\s*area\s*[:\s]+([\d,]+)/i,
    /\bsqft\s*[:\t]+\s*([\d,]+)/i,
    /sq\.?\s*ft\.?\s*[:\s]+([\d,]+)/i,
    /([\d,]+)\s*sq\.?\s*ft/i,
    /\bSF\s*[:\s]+([\d,]+)/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) return m[1].replace(/,/g, '');
  }
  return '';
}

/** Line looks like a calendar date (avoid treating 3/2 in "12/15/2024" as bed/bath). */
function lineLooksLikeDate(line: string): boolean {
  return /\b\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4}\b/.test(line);
}

/** Skip "4/2" style shorthand on lines that are clearly lot/acreage, garage, DOM, photos, Matrix bath split, etc. */
function lineLooksLikeNonBedBathFraction(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    /\bacre\b/.test(lower) ||
    /\bup to\b/.test(lower) ||
    /\b(stories|story)\b/.test(lower) ||
    /\bgarage\b/.test(lower) ||
    /\battached\b/.test(lower) ||
    /\bdom\b/.test(lower) ||
    /\blp\s*\//.test(lower) ||
    /\bphoto\b/.test(lower) ||
    /\bview documents\b/.test(lower) ||
    /\bbaths?\s*f\s*\/\s*h\b/.test(lower) ||
    /\bf\/h\s*:/.test(lower) ||
    /\d+\s*\/\s*\d+\s+of\b/.test(lower)
  );
}

/**
 * MLS / Matrix / portal pastes often use:
 * - "Bedrooms:\t4" (HAR — use plural "Bedrooms" only; singular "Bedroom" is often a room row like "Bedroom\t13X10")
 * - "Baths F/H:\t2/0" (full/half)
 * - "4 bed / 3 bath", "3-bedroom, 2-bath"
 * - Shorthand "4/2" on its own line (never "1/4" acre)
 */
function parseBedsAndBaths(text: string): { beds: string; baths: string } {
  const t = text.replace(/\r\n/g, '\n');
  let beds = '';
  let baths = '';

  const tryBedPatterns = (): void => {
    const bedPatterns: RegExp[] = [
      /(?:^|\n)\s*bedrooms\s*[:\t.\-–—]+\s*(\d+)/im,
      /(?:^|\n)\s*#?\s*of\s+bedrooms?\s*[:\t.\-–—]+\s*(\d+)/im,
      /(?:^|\n)\s*#?\s*beds\s*[:\t.\-–—]+\s*(\d+)/im,
      /(?:^|\n)\s*total\s+beds\s*[:\t.\-–—]+\s*(\d+)/im,
      /(?:^|\n)\s*br\s*[:\t.\-–—]+\s*(\d+)/im,
      /\bbedrooms\s*[:\t]+\s*(\d+)/i,
      /\b(\d+)\s*(?:bedrooms|beds)\b/i,
      /\b(\d+)\s*br\b/i,
      /\b(\d+)\s*bd\b/i,
    ];
    for (const re of bedPatterns) {
      const m = t.match(re);
      if (m?.[1]) {
        beds = m[1];
        return;
      }
    }
  };

  const tryBathPatterns = (): void => {
    const fSlashH = t.match(
      /(?:^|\n|\t)\s*baths?\s*f\s*\/\s*h\s*[:\t.\-–—]+\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/im
    );
    if (fSlashH?.[1]) {
      baths = fSlashH[1];
      return;
    }
    const bathPatterns: RegExp[] = [
      /(?:^|\n)\s*bath(?:rooms?)?\s*(?:full|total)?\s*[:\t.\-–—]+\s*(\d+(?:\.\d+)?)/im,
      /(?:^|\n)\s*full\s+baths?\s*[:\t.\-–—]+\s*(\d+)/im,
      /(?:^|\n)\s*total\s+baths?\s*[:\t.\-–—]+\s*(\d+(?:\.\d+)?)/im,
      /(?:^|\n)\s*#?\s*full\s+baths?\s*[:\t.\-–—]+\s*(\d+)/im,
      /\bbaths\s*[:\t]+\s*(\d+(?:\.\d+)?)/i,
      /\bbath(?:rooms?)?\s*[:\t]+\s*(\d+(?:\.\d+)?)/i,
      /\b(\d+(?:\.\d+)?)\s*(?:full\s+)?baths?\b/i,
      /\b(\d+(?:\.\d+)?)\s*ba\b/i,
    ];
    for (const re of bathPatterns) {
      const m = t.match(re);
      if (m?.[1]) {
        baths = m[1];
        return;
      }
    }
  };

  tryBedPatterns();
  tryBathPatterns();

  // "4 bed, 3 bath" / "3-bedroom, 2-bath" (hyphen between number and word is common in prose)
  if (!beds || !baths) {
    const combo = t.match(
      /\b(\d+)(?:\s*[-–—]|\s+)(?:bedrooms?|beds|bd|br)\b[^.\n]{0,48}?\b(\d+(?:\.\d+)?)(?:\s*[-–—]|\s+)(?:bath(?:rooms?)?|baths|ba)\b/i
    );
    if (combo) {
      if (!beds) beds = combo[1];
      if (!baths) baths = combo[2];
    }
  }

  // "4 bd | 3 ba" / "4bd, 3ba" (Zillow-style compact)
  if (!beds || !baths) {
    const compact = t.match(/\b(\d+)\s*bd\s*[|\/,;]\s*(\d+(?:\.\d+)?)\s*ba\b/i);
    if (compact) {
      if (!beds) beds = compact[1];
      if (!baths) baths = compact[2];
    }
  }

  // Shorthand "4/2" or "4 / 2.5" — skip acreage (1/4), garage (2/Attached), Baths F/H, etc.
  if (!beds || !baths) {
    for (const rawLine of t.split('\n')) {
      const line = rawLine.trim();
      if (!line || lineLooksLikeDate(line) || lineLooksLikeNonBedBathFraction(line)) continue;
      const m = line.match(/\b(\d{1,2})\s*\/\s*(\d(?:\.\d+)?)\b/);
      if (!m) continue;
      const b = Number(m[1]);
      const ba = Number(m[2]);
      if (b === 1 && ba >= 2 && ba <= 4) continue;
      if (b >= 1 && b <= 20 && ba >= 1 && ba <= 15) {
        if (!beds) beds = m[1];
        if (!baths) baths = m[2];
        break;
      }
    }
  }

  return { beds, baths };
}

function parseYearFromText(text: string): string {
  const m = text.match(/(?:year\s*built|built)\s*[:\s]+((?:19|20)\d{2})/i);
  return m?.[1] ?? '';
}

function parseListPriceFromText(text: string): string {
  const lines = text.split(/\r\n|\r|\n/);
  for (const line of lines) {
    const m = line.match(/list\s*price\s*[:\s]+\$?\s*([\d,]+)/i);
    if (m?.[1]) return m[1].replace(/,/g, '');
  }
  const m2 = text.match(/list\s*price\s*[:\s]+\$?\s*([\d,]+)/i);
  return m2?.[1]?.replace(/,/g, '') ?? '';
}

/** HAR/Matrix: LP/SF: $162.34 (list price per sq ft). */
function parseLpPerSqftFromText(text: string): string {
  const m = text.match(/\bLP\s*\/\s*SF\s*[:\t]+\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
  if (!m?.[1]) return '';
  return m[1].replace(/,/g, '');
}

/** HAR/Matrix: Lot Size: 5,775 / Appr Dist (lot sq ft). */
function parseLotSizeFromText(text: string): string {
  const m = text.match(/\blot\s*size\s*[:\t]+\s*([\d,]+(?:\.\d+)?)/i);
  if (!m?.[1]) return '';
  return m[1].replace(/,/g, '');
}

function parseAppraisalFromText(text: string): string {
  const m = text.match(/(?:appraisal|taxable|assessed|county)\s*value\s*[:\s]+\$?\s*([\d,]+)/i);
  return m?.[1]?.replace(/,/g, '') ?? '';
}

/** HAR/Matrix: DOM: 192 (avoid matching unrelated "dom" substrings by requiring label). */
function parseDomFromText(text: string): string {
  const m = text.match(/\bDOM\s*[:\t]+\s*(\d+)/i);
  return m?.[1] ?? '';
}

function parseSubdivisionFromText(text: string): string {
  const m = text.match(/\bsubdivision\s*[:\t]+\s*([^\t\n\r]+)/i);
  if (!m?.[1]) return '';
  return m[1].replace(/\s{2,}/g, ' ').trim();
}

/** List Agent: VALDEZ/Aurelio Valdez Email About… → strip trailing " Email…" */
function parseListAgentFromText(text: string): string {
  const m = text.match(/\blist\s+agent\s*[:\t]+\s*([^\t\n\r]+)/i);
  if (!m?.[1]) return '';
  return m[1].replace(/\s+Email\b.*$/i, '').replace(/\s{2,}/g, ' ').trim();
}

function parseAgentCellFromText(text: string): string {
  const m = text.match(/\bagent\s+cell\s*[:\t]+\s*([\d\-().\s]+)/i);
  return m?.[1]?.trim() ?? '';
}

function parseAgentPhoneFromText(text: string): string {
  const m = text.match(/\bagent\s+phone\s*[:\t]+\s*([\d\-().\s]+)/i);
  return m?.[1]?.trim() ?? '';
}

function parseAgentEmailFromText(text: string): string {
  const m = text.match(/\bagent\s+email\s*[:\t]+\s*([^\t\n\r\s]+)/i);
  return m?.[1]?.trim() ?? '';
}

function pricePerSqft(sqftStr: string, priceStr: string): number | null {
  const sq = parseFloat(sqftStr.replace(/,/g, ''));
  const pr = parseMoney(priceStr);
  if (!Number.isFinite(sq) || sq <= 0 || !Number.isFinite(pr) || pr <= 0) return null;
  return pr / sq;
}

/** Fully amortizing monthly P&I. Does not include taxes, insurance, or HOA. */
function computeAmortizingMonthlyPayment(
  principal: number,
  annualAprPercent: number,
  months: number
): number | null {
  if (!(principal > 0 && months > 0)) return null;
  if (!Number.isFinite(months) || months !== Math.round(months)) return null;
  const m = Math.round(months);
  if (!Number.isFinite(annualAprPercent) || annualAprPercent < 0) return null;
  const r = annualAprPercent / 100 / 12;
  if (r === 0) return principal / m;
  const pow = Math.pow(1 + r, m);
  if (!Number.isFinite(pow) || pow - 1 === 0) return null;
  return principal * ((r * pow) / (pow - 1));
}

function fmtPayment(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const HouseCalculator: React.FC = () => {
  const [address, setAddress] = useState('');
  const [mls, setMls] = useState('');
  const [sqft, setSqft] = useState('');
  const [lotSizeSqft, setLotSizeSqft] = useState('');
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [lpPerSqft, setLpPerSqft] = useState('');
  const [appraisalValue, setAppraisalValue] = useState('');
  const [dom, setDom] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [listAgent, setListAgent] = useState('');
  const [agentCell, setAgentCell] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [comps, setComps] = useState<HouseComp[]>(() =>
    Array.from({ length: 5 }, () => EMPTY_COMP())
  );
  const [rentComps, setRentComps] = useState<HouseRentComp[]>(() =>
    Array.from({ length: 5 }, () => EMPTY_RENT_COMP())
  );
  const [pasteInput, setPasteInput] = useState('');
  const [showQuickInput, setShowQuickInput] = useState(true);
  const [parseMessage, setParseMessage] = useState('');
  const [anchorPoints, setAnchorPoints] = useState('');
  const [smartNotes, setSmartNotes] = useState('');
  const [creativeOffer, setCreativeOffer] = useState('');
  const [clipboardTemplate, setClipboardTemplate] = useState('');
  const [finPurchasePrice, setFinPurchasePrice] = useState('');
  const [finDownPayment, setFinDownPayment] = useState('');
  const [finApr, setFinApr] = useState('');
  const [finMonths, setFinMonths] = useState('');
  const [finOfferPayment, setFinOfferPayment] = useState('');

  const parseSubjectPaste = () => {
    const raw = pasteInput.trim();
    if (!raw) return;
    setParseMessage('');
    const addr = parseAddressFromHARText(raw);
    const m = parseMLSFromHARText(raw);
    const sf = parseSqftFromText(raw);
    const { beds: bd, baths: ba } = parseBedsAndBaths(raw);
    const yr = parseYearFromText(raw);
    const lp = parseListPriceFromText(raw);
    const lpSf = parseLpPerSqftFromText(raw);
    const lotSq = parseLotSizeFromText(raw);
    const av = parseAppraisalFromText(raw);
    const domVal = parseDomFromText(raw);
    const sub = parseSubdivisionFromText(raw);
    const agent = parseListAgentFromText(raw);
    const cell = parseAgentCellFromText(raw);
    const phone = parseAgentPhoneFromText(raw);
    const email = parseAgentEmailFromText(raw);
    if (addr) setAddress(addr);
    if (m) setMls(m);
    if (sf) setSqft(sf);
    if (bd) setBeds(bd);
    if (ba) setBaths(ba);
    if (yr) setYearBuilt(yr);
    if (lp) setListPrice(lp);
    if (lpSf) setLpPerSqft(lpSf);
    if (lotSq) setLotSizeSqft(lotSq);
    if (av) setAppraisalValue(av);
    if (domVal) setDom(domVal);
    if (sub) setSubdivision(sub);
    if (agent) setListAgent(agent);
    if (cell) setAgentCell(cell);
    if (phone) setAgentPhone(phone);
    if (email) setAgentEmail(email);
    const filled = [
      addr,
      m,
      sf,
      lotSq,
      bd,
      ba,
      yr,
      lp,
      lpSf,
      av,
      domVal,
      sub,
      agent,
      cell,
      phone,
      email,
    ].filter(Boolean).length;
    setParseMessage(
      filled > 0
        ? `Parsed ${filled} field(s) from paste. Review and adjust as needed.`
        : 'No recognizable house fields found. Enter details manually or try a fuller MLS paste.'
    );
    setPasteInput('');
    setShowQuickInput(false);
  };

  const updateComp = (index: number, field: keyof HouseComp, value: string) => {
    setComps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateRentComp = (index: number, field: keyof HouseRentComp, value: string) => {
    setRentComps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const rentStats = useMemo(() => {
    const amounts = rentComps
      .map((r) => parseMoney(r.rent))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!amounts.length) {
      return { count: 0, median: null as number | null, low: null as number | null, high: null as number | null };
    }
    const sorted = [...amounts].sort((a, b) => a - b);
    return {
      count: sorted.length,
      median: medianFromSorted(sorted),
      low: sorted[0]!,
      high: sorted[sorted.length - 1]!,
    };
  }, [rentComps]);

  const compPpsf = useMemo(() => comps.map((c) => pricePerSqft(c.sqft, c.soldPrice)), [comps]);

  const avgPpsf = useMemo(() => {
    const vals = compPpsf.filter((v): v is number => v !== null && Number.isFinite(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [compPpsf]);

  const subjectSqftNum = parseFloat(String(sqft).replace(/,/g, ''));
  const impliedValue =
    avgPpsf !== null && Number.isFinite(subjectSqftNum) && subjectSqftNum > 0
      ? avgPpsf * subjectSqftNum
      : null;

  const listNum = parseMoney(listPrice);
  const impliedListPct =
    impliedValue !== null && impliedValue > 0 && Number.isFinite(listNum) && listNum > 0
      ? (listNum / impliedValue) * 100
      : null;

  const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const tiers = [100, 90, 80, 70, 65, 60, 50, 40, 30, 20, 10];

  const finLoanAmount = useMemo(() => {
    const p = parseMoney(finPurchasePrice);
    const dRaw = parseMoney(finDownPayment);
    const d = Number.isFinite(dRaw) && dRaw >= 0 ? dRaw : 0;
    if (!Number.isFinite(p) || p <= 0) return null;
    const loan = p - d;
    return loan > 0 ? loan : null;
  }, [finPurchasePrice, finDownPayment]);

  const finCalcPayment = useMemo(() => {
    const loan = finLoanAmount;
    const mo = parseInt(String(finMonths).replace(/\D/g, '') || '0', 10);
    const apr = parseFloat(String(finApr).trim());
    if (loan == null || !mo || mo <= 0 || !Number.isFinite(apr) || apr < 0) return null;
    return computeAmortizingMonthlyPayment(loan, apr, mo);
  }, [finLoanAmount, finApr, finMonths]);

  const finOfferNum = parseMoney(finOfferPayment);
  const finPaymentDelta =
    finCalcPayment != null && Number.isFinite(finOfferNum) ? finOfferNum - finCalcPayment : null;

  const buildRentCreativeBlurb = (): string => {
    const { count: rn, median: rmed, low: rlo, high: rhi } = rentStats;
    if (!rn || rmed == null || rlo == null || rhi == null) {
      return 'Add at least one monthly rent in Rental benchmarks (from Zillow, HAR, etc.), then try again.';
    }
    const addr = address.trim() || 'Subject property';
    const bd = beds.trim() || '?';
    const ba = baths.trim() || '?';
    const sf = sqft.trim() || '?';
    const listN = parseMoney(listPrice);
    const listStr =
      listPrice.trim() && Number.isFinite(listN)
        ? `$${listN.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        : '___________________';
    return (
      `Rent benchmark (user-entered from public listings — usually asking rent; not an appraisal): ${rn} comp(s), ` +
      `~$${fmtMoney(rlo)}–$${fmtMoney(rhi)}/mo, median ~$${fmtMoney(rmed)}/mo. ` +
      `Subject: ${addr}, ${bd}bd/${ba}ba, ~${sf} sq ft, list ${listStr}. ` +
      `Use this band to stress-test monthly feasibility (PITI, HOA, reserves, vacancy) for any creative terms. Edit before sending.`
    );
  };

  const buildCopySummary = (): string => {
    const ph = (v: string | undefined | null): string => {
      const s = v != null ? String(v).trim() : '';
      return s || '___________________';
    };
    const fmtMoneyStr = (s: string): string => {
      const n = parseFloat(String(s).replace(/,/g, ''));
      return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '';
    };
    const fmtMoneyNum = (n: number): string =>
      Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '';

    const compBlock = (c: HouseComp, num: number, ppsf: number | null) => {
      const soldFmt = c.soldPrice ? fmtMoneyStr(c.soldPrice) : '';
      const ppsfStr = ppsf != null && Number.isFinite(ppsf) ? ppsf.toFixed(2) : '';
      return (
        `✅ COMP #${num}\n` +
        `Address: ${ph(c.address)}\n` +
        `MLS #: ${ph(c.mls)}\n` +
        `Sq Ft: ${ph(c.sqft)}\n` +
        `Sold Date: ${ph(c.soldDate)}\n` +
        `Sold Price: $ ${ph(soldFmt)}\n` +
        `DOM: ${ph(c.dom)}\n` +
        `$/SF: $ ${ppsfStr || '___________________'}\n\n`
      );
    };

    const implied = impliedValue;
    const tierLines =
      implied != null && implied > 0
        ? tiers.map((pct) => `• ${pct}% = $${fmtMoney((implied * pct) / 100)}`).join('\n')
        : tiers.map(() => `• ___________________`).join('\n');

    const listVsImpliedLine =
      impliedListPct != null ? `${impliedListPct.toFixed(1)}%` : '___________________';
    const askMinusImplied =
      implied != null && Number.isFinite(listNum) && listNum > 0
        ? fmtMoneyNum(listNum - implied)
        : '___________________';

    const { count: rentN, median: rentMed, low: rentLo, high: rentHi } = rentStats;
    const rentDetailLines =
      rentN > 0
        ? rentComps
            .filter((r) => Number.isFinite(parseMoney(r.rent)) && parseMoney(r.rent) > 0)
            .map((r, i) => {
              const rm = parseMoney(r.rent);
              const rentFmt = Number.isFinite(rm) ? fmtMoneyNum(rm) : '';
              return (
                `  ${i + 1}. ${ph(r.address)} | ${ph(r.beds)}bd/${ph(r.baths)}ba | ${ph(r.sqft)} sf | $${rentFmt}/mo | ${ph(r.source)}`
              );
            })
            .join('\n')
        : '';
    const rentSection =
      rentN > 0 && rentMed != null && rentLo != null && rentHi != null
        ? `RENT BENCHMARK (user-entered — public listing rents)\n` +
          `Comps with rent: ${rentN} | Median: $${fmtMoneyNum(rentMed)} | Range: $${fmtMoneyNum(rentLo)} – $${fmtMoneyNum(rentHi)}\n` +
          (rentDetailLines ? `${rentDetailLines}\n` : '') +
          `Note: Typically asking/advertised rent, not verified leased amounts.\n\n`
        : '';

    const fp = parseMoney(finPurchasePrice);
    const fdRaw = parseMoney(finDownPayment);
    const fd = Number.isFinite(fdRaw) && fdRaw >= 0 ? fdRaw : 0;
    const floan = Number.isFinite(fp) && fp > 0 ? fp - fd : NaN;
    const fmo = parseInt(String(finMonths).replace(/\D/g, '') || '0', 10);
    const fapr = parseFloat(String(finApr).trim());
    const fcalc =
      Number.isFinite(floan) && floan > 0 && fmo > 0 && Number.isFinite(fapr) && fapr >= 0
        ? computeAmortizingMonthlyPayment(floan, fapr, fmo)
        : null;
    const foffer = parseMoney(finOfferPayment);
    const hasFin =
      finPurchasePrice.trim() ||
      finDownPayment.trim() ||
      finApr.trim() ||
      finMonths.trim() ||
      finOfferPayment.trim();
    const finSection = hasFin
      ? `FINANCING CHECK (P&I only — no taxes/insurance/HOA)\n` +
        `Purchase price: $ ${Number.isFinite(fp) && fp > 0 ? fmtMoneyNum(fp) : '___________________'}\n` +
        `Down payment: $ ${Number.isFinite(fp) && fp > 0 ? fmtMoneyNum(fd) : ph(finDownPayment)}\n` +
        `Loan amount: $ ${Number.isFinite(floan) && floan > 0 ? fmtMoneyNum(floan) : '___________________'}\n` +
        `APR: ${Number.isFinite(fapr) ? String(fapr) : '__________'}% | Term: ${fmo > 0 ? String(fmo) : '__________'} mo\n` +
        `Amortizing P&I payment: $ ${fcalc != null ? fmtPayment(fcalc) : '___________________'}/mo\n` +
        `Your offer payment: $ ${Number.isFinite(foffer) && foffer > 0 ? fmtPayment(foffer) : '___________________'}/mo` +
        (fcalc != null && Number.isFinite(foffer) && foffer > 0
          ? ` | vs amortizing: ${foffer >= fcalc ? '+' : ''}$${fmtPayment(foffer - fcalc)}/mo\n\n`
          : `\n\n`)
      : '';

    return (
      `HOUSE EVALUATION — Subject\n` +
      `Address: ${ph(address)}\n` +
      `MLS #: ${ph(mls)}\n` +
      `Living area (sq ft): ${ph(sqft)}\n` +
      `Lot size (sq ft): ${ph(lotSizeSqft)}\n` +
      `Beds / Baths: ${ph(beds)} / ${ph(baths)}\n` +
      `Year built: ${ph(yearBuilt)}\n` +
      `List price: $ ${ph(listPrice ? fmtMoneyStr(listPrice) : '')}\n` +
      `LP/SF: $ ${ph(lpPerSqft)}\n` +
      `County / appraisal: $ ${ph(appraisalValue ? fmtMoneyStr(appraisalValue) : '')}\n` +
      `DOM: ${ph(dom)}\n` +
      `Subdivision: ${ph(subdivision)}\n` +
      `List agent: ${ph(listAgent)}\n` +
      `Agent cell: ${ph(agentCell)}\n` +
      `Agent phone: ${ph(agentPhone)}\n` +
      `Agent email: ${ph(agentEmail)}\n` +
      `Notes: ${ph(notes)}\n\n` +
      `${comps.map((c, i) => compBlock(c, i + 1, compPpsf[i])).join('')}` +
      `${rentSection}` +
      `MARKET ANALYSIS\n` +
      `Average sold $/SF (comps): $ ${avgPpsf != null ? avgPpsf.toFixed(2) : '___________________'}\n` +
      `Implied value (avg × subject SF): $ ${implied != null ? fmtMoney(implied) : '___________________'}\n` +
      `List price vs implied: ${listVsImpliedLine}\n` +
      `List − implied: $ ${askMinusImplied}\n\n` +
      `VALUE TIERS (of implied)\n` +
      `${tierLines}\n\n` +
      `${finSection}` +
      `Anchor Points: ${ph(anchorPoints)}\n` +
      `Smart Notes: ${ph(smartNotes)}\n` +
      `Creative Offer: ${ph(creativeOffer)}\n`
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          House Evaluation Calculator
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Single-family workflow: sold comps, optional rental benchmarks from Zillow/HAR/etc., implied value vs list, and a CRM-ready copy block.
        </Typography>

        <Collapse in={showQuickInput}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ContentPasteIcon />
              <Typography variant="h6">Subject — quick paste</Typography>
              <IconButton size="small" onClick={() => setShowQuickInput(false)} sx={{ ml: 'auto' }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <TextareaAutosize
              minRows={4}
              placeholder="Paste MLS / HAR snippet (address, SF, beds, baths, list price)…"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                marginBottom: 8,
                fontFamily: 'inherit',
                borderRadius: 4,
                border: '1px solid #ccc',
              }}
            />
            <Button variant="contained" onClick={parseSubjectPaste} disabled={!pasteInput.trim()} fullWidth>
              Parse into subject fields
            </Button>
          </Box>
        </Collapse>

        {!showQuickInput && (
          <Button
            variant="outlined"
            startIcon={<ContentPasteIcon />}
            onClick={() => setShowQuickInput(true)}
            sx={{ mb: 2 }}
          >
            Show subject quick paste
          </Button>
        )}

        {parseMessage && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setParseMessage('')}>
            {parseMessage}
          </Alert>
        )}

        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Subject property
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} sx={{ flex: '1 1 280px', minWidth: 220 }} fullWidth />
          <TextField label="MLS #" value={mls} onChange={(e) => setMls(e.target.value)} sx={{ flex: '0 1 140px', minWidth: 120 }} />
          <TextField label="Living area (sq ft)" value={sqft} onChange={(e) => setSqft(e.target.value)} sx={{ flex: '0 1 140px', minWidth: 120 }} />
          <TextField
            label="Lot size (sq ft)"
            value={lotSizeSqft}
            onChange={(e) => setLotSizeSqft(e.target.value)}
            sx={{ flex: '0 1 140px', minWidth: 120 }}
            placeholder="e.g. 5775"
            inputProps={{ inputMode: 'numeric' }}
          />
          <TextField label="Beds" value={beds} onChange={(e) => setBeds(e.target.value)} sx={{ flex: '0 1 88px', minWidth: 72 }} />
          <TextField label="Baths" value={baths} onChange={(e) => setBaths(e.target.value)} sx={{ flex: '0 1 88px', minWidth: 72 }} />
          <TextField label="Year built" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} sx={{ flex: '0 1 110px', minWidth: 96 }} />
          <TextField label="List price" value={listPrice} onChange={(e) => setListPrice(e.target.value)} sx={{ flex: '0 1 140px', minWidth: 120 }} />
          <TextField
            label="LP/SF ($/sq ft)"
            value={lpPerSqft}
            onChange={(e) => setLpPerSqft(e.target.value)}
            sx={{ flex: '0 1 120px', minWidth: 108 }}
            placeholder="e.g. 162.34"
            inputProps={{ inputMode: 'decimal' }}
          />
          <TextField label="County / appraisal value" value={appraisalValue} onChange={(e) => setAppraisalValue(e.target.value)} sx={{ flex: '0 1 160px', minWidth: 140 }} />
        </Box>

        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Listing and agent
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <TextField
            label="DOM (days on market)"
            value={dom}
            onChange={(e) => setDom(e.target.value)}
            sx={{ flex: '0 1 120px', minWidth: 100 }}
            inputProps={{ inputMode: 'numeric' }}
          />
          <TextField
            label="Subdivision"
            value={subdivision}
            onChange={(e) => setSubdivision(e.target.value)}
            sx={{ flex: '1 1 240px', minWidth: 200 }}
            fullWidth
          />
          <TextField
            label="List agent"
            value={listAgent}
            onChange={(e) => setListAgent(e.target.value)}
            placeholder="e.g. Valdez/Aurelio Valdez"
            sx={{ flex: '1 1 280px', minWidth: 220 }}
            fullWidth
          />
          <TextField
            label="Agent cell"
            value={agentCell}
            onChange={(e) => setAgentCell(e.target.value)}
            sx={{ flex: '0 1 160px', minWidth: 140 }}
          />
          <TextField
            label="Agent phone"
            value={agentPhone}
            onChange={(e) => setAgentPhone(e.target.value)}
            sx={{ flex: '0 1 160px', minWidth: 140 }}
          />
          <TextField
            label="Agent email"
            type="email"
            value={agentEmail}
            onChange={(e) => setAgentEmail(e.target.value)}
            sx={{ flex: '1 1 260px', minWidth: 220 }}
            fullWidth
            autoComplete="off"
          />
        </Box>

        <TextField label="Notes (condition, updates, rent comps…)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} sx={{ mb: 3 }} />

        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Sold comparables
        </Typography>
        <Table size="small" sx={{ mb: 1, '& .MuiTableCell-root': { verticalAlign: 'top' } }}>
          <TableHead>
            <TableRow>
              <TableCell>Address</TableCell>
              <TableCell width={100}>MLS</TableCell>
              <TableCell width={100}>Sq ft</TableCell>
              <TableCell width={120}>Sold price</TableCell>
              <TableCell width={110}>Sold date</TableCell>
              <TableCell width={72}>DOM</TableCell>
              <TableCell width={90} align="right">
                $/SF
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comps.map((c, i) => {
              const p = compPpsf[i];
              return (
                <TableRow key={i}>
                  <TableCell>
                    <TextField value={c.address} onChange={(e) => updateComp(i, 'address', e.target.value)} size="small" fullWidth variant="standard" placeholder={`Comp ${i + 1}`} />
                  </TableCell>
                  <TableCell>
                    <TextField value={c.mls} onChange={(e) => updateComp(i, 'mls', e.target.value)} size="small" fullWidth variant="standard" />
                  </TableCell>
                  <TableCell>
                    <TextField value={c.sqft} onChange={(e) => updateComp(i, 'sqft', e.target.value)} size="small" fullWidth variant="standard" />
                  </TableCell>
                  <TableCell>
                    <TextField value={c.soldPrice} onChange={(e) => updateComp(i, 'soldPrice', e.target.value)} size="small" fullWidth variant="standard" />
                  </TableCell>
                  <TableCell>
                    <TextField value={c.soldDate} onChange={(e) => updateComp(i, 'soldDate', e.target.value)} size="small" fullWidth variant="standard" placeholder="MM/DD/YYYY" />
                  </TableCell>
                  <TableCell>
                    <TextField value={c.dom} onChange={(e) => updateComp(i, 'dom', e.target.value)} size="small" fullWidth variant="standard" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={p != null ? 'text.primary' : 'text.disabled'}>
                      {p != null ? `$${p.toFixed(2)}` : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, mt: 2 }}>
          Rental benchmarks
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Enter rents from{' '}
          <a href="https://www.zillow.com" target="_blank" rel="noopener noreferrer">
            Zillow
          </a>
          , HAR, Homes.com, or similar (asking rents change often — refresh your comps as needed). This app does not pull live rent data; you paste what you see online.
        </Typography>
        <Table size="small" sx={{ mb: 1, '& .MuiTableCell-root': { verticalAlign: 'top' } }}>
          <TableHead>
            <TableRow>
              <TableCell>Address</TableCell>
              <TableCell width={56}>Beds</TableCell>
              <TableCell width={56}>Baths</TableCell>
              <TableCell width={88}>Sq ft</TableCell>
              <TableCell width={100}>Rent/mo</TableCell>
              <TableCell width={120}>Source</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rentComps.map((r, i) => (
              <TableRow key={`rent-${i}`}>
                <TableCell>
                  <TextField
                    value={r.address}
                    onChange={(e) => updateRentComp(i, 'address', e.target.value)}
                    size="small"
                    fullWidth
                    variant="standard"
                    placeholder={`Rental ${i + 1}`}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={r.beds}
                    onChange={(e) => updateRentComp(i, 'beds', e.target.value)}
                    size="small"
                    fullWidth
                    variant="standard"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={r.baths}
                    onChange={(e) => updateRentComp(i, 'baths', e.target.value)}
                    size="small"
                    fullWidth
                    variant="standard"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={r.sqft}
                    onChange={(e) => updateRentComp(i, 'sqft', e.target.value)}
                    size="small"
                    fullWidth
                    variant="standard"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={r.rent}
                    onChange={(e) => updateRentComp(i, 'rent', e.target.value)}
                    size="small"
                    fullWidth
                    variant="standard"
                    placeholder="$"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={r.source}
                    onChange={(e) => updateRentComp(i, 'source', e.target.value)}
                    size="small"
                    fullWidth
                    variant="standard"
                    placeholder="Zillow, HAR…"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            {rentStats.count > 0 && rentStats.median != null && rentStats.low != null && rentStats.high != null ? (
              <>
                <strong>{rentStats.count}</strong> rent comp(s) — median{' '}
                <strong>${fmtMoney(rentStats.median)}</strong>, range{' '}
                <strong>
                  ${fmtMoney(rentStats.low)}–${fmtMoney(rentStats.high)}
                </strong>
                /mo
              </>
            ) : (
              <>Enter monthly rent on at least one row to see median and range.</>
            )}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
          <Box sx={{ flex: '1 1 260px' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Comp stats
            </Typography>
            <Typography variant="body2">
              Average $/SF (from comps with sq ft + sold price):{' '}
              <strong>{avgPpsf != null ? `$${avgPpsf.toFixed(2)}` : '—'}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Implied value (avg $/SF × subject sq ft):{' '}
              <strong>{impliedValue != null ? `$${fmtMoney(impliedValue)}` : '—'}</strong>
            </Typography>
            {impliedListPct != null && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                List price vs implied: <strong>{impliedListPct.toFixed(1)}%</strong>
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: '1 1 260px' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Offer / value tiers (of implied)
            </Typography>
            {impliedValue != null ? (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {tiers.map((pct) => (
                  <Typography component="li" variant="body2" key={pct}>
                    {pct}% → ${fmtMoney((impliedValue * pct) / 100)}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Enter subject sq ft and at least one comp with sq ft and sold price.
              </Typography>
            )}
          </Box>
        </Box>

        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Copy-ready summary
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Regenerate fills this block from the fields above (same idea as the Land calculator). Edit the text, then copy into your CRM.
            </Typography>
            <TextField
              fullWidth
              label="Anchor points"
              placeholder="Optional anchor points"
              value={anchorPoints}
              onChange={(e) => setAnchorPoints(e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              label="Smart notes"
              placeholder="Notes for your CRM / offer"
              value={smartNotes}
              onChange={(e) => setSmartNotes(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              multiline
              minRows={12}
              fullWidth
              label="Report (editable)"
              placeholder='Click "Regenerate template" to fill from current data'
              value={clipboardTemplate}
              onChange={(e) => setClipboardTemplate(e.target.value)}
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => setClipboardTemplate(buildCopySummary())}>
                Regenerate template
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  void navigator.clipboard.writeText(clipboardTemplate);
                }}
              >
                Copy to clipboard
              </Button>
            </Box>

            <Box
              sx={{
                mt: 2,
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Offer financing (principal and interest)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                Loan amount = purchase price minus down payment. Amortizing payment is principal and interest only
                (not taxes, insurance, or HOA). Adjust numbers to match your offer.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
                <TextField
                  label="Purchase price"
                  value={finPurchasePrice}
                  onChange={(e) => setFinPurchasePrice(e.target.value)}
                  sx={{ flex: '1 1 140px', minWidth: 120 }}
                  inputProps={{ inputMode: 'decimal' }}
                />
                <TextField
                  label="Down payment"
                  value={finDownPayment}
                  onChange={(e) => setFinDownPayment(e.target.value)}
                  sx={{ flex: '1 1 130px', minWidth: 110 }}
                  placeholder="0"
                  inputProps={{ inputMode: 'decimal' }}
                />
                <TextField
                  label="Interest rate (APR %)"
                  value={finApr}
                  onChange={(e) => setFinApr(e.target.value)}
                  sx={{ flex: '0 1 120px', minWidth: 100 }}
                  placeholder="e.g. 8.5"
                  inputProps={{ inputMode: 'decimal' }}
                />
                <TextField
                  label="Term (months)"
                  value={finMonths}
                  onChange={(e) => setFinMonths(e.target.value)}
                  sx={{ flex: '0 1 110px', minWidth: 96 }}
                  placeholder="e.g. 360"
                  inputProps={{ inputMode: 'numeric' }}
                />
                <TextField
                  label="Your offer payment / mo"
                  value={finOfferPayment}
                  onChange={(e) => setFinOfferPayment(e.target.value)}
                  sx={{ flex: '1 1 150px', minWidth: 140 }}
                  placeholder="Compare to amortizing"
                  inputProps={{ inputMode: 'decimal' }}
                />
              </Box>
              {listPrice.trim() && (
                <Button
                  size="small"
                  variant="text"
                  sx={{ mb: 1 }}
                  onClick={() => setFinPurchasePrice(listPrice.replace(/,/g, ''))}
                >
                  Use list price as purchase
                </Button>
              )}
              <Typography variant="body2" component="div">
                Loan amount:{' '}
                <strong>
                  {finLoanAmount != null ? `$${fmtMoney(finLoanAmount)}` : '—'}
                </strong>
                {finLoanAmount == null &&
                  parseMoney(finPurchasePrice) > 0 &&
                  Number.isFinite(parseMoney(finDownPayment)) &&
                  parseMoney(finDownPayment) >= parseMoney(finPurchasePrice) && (
                    <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>
                      Down payment must be less than purchase price.
                    </Typography>
                  )}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Amortizing payment:{' '}
                <strong>
                  {finCalcPayment != null ? `$${fmtPayment(finCalcPayment)}/mo` : '—'}
                </strong>
              </Typography>
              {finPaymentDelta != null && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Your offer vs amortizing:{' '}
                  <strong>
                    {finPaymentDelta >= 0 ? '+' : ''}
                    {`$${fmtPayment(finPaymentDelta)}/mo`}
                  </strong>
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Button variant="outlined" onClick={() => setCreativeOffer(buildRentCreativeBlurb())}>
                  Generate Creative offer
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Fills from rental benchmarks and subject fields; edit before sending.
                </Typography>
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Creative offer"
                placeholder='Click "Generate Creative offer" or write your own.'
                value={creativeOffer}
                onChange={(e) => setCreativeOffer(e.target.value)}
              />
            </Box>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};
