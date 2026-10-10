/**
 * parseReceiptText — Parses raw OCR text from Vietnamese receipts into structured data.
 *
 * Supports Lotte Mart-style format:
 *   001 Item Name\n
 *   <barcode>    <unit_price>    <qty>    <total>
 *
 * Fallback: generic `name  price` line pattern for other receipt formats.
 *
 * Amount parsing: handles Vietnamese thousands separators (comma or period).
 *   "82,200" → 82200, "171.000" → 171000
 */

export type ReceiptItem = {
  name: string;
  amount: number;
};

export type ReceiptParseResult = {
  merchant: string;
  date: string | null; // YYYY-MM-DD or null
  items: ReceiptItem[];
  total: number | null; // cross-check total from receipt footer
};

// ─── Amount helpers ───────────────────────────────────────────────────────────

/** Matches Vietnamese/international formatted numbers: 82,200 / 82.200 / 82200 */
const AMOUNT_RE = /\d{1,3}(?:[.,]\d{3})+|\d{4,}/g;

function parseAmount(raw: string): number {
  // If uses comma as thousands sep: "82,200" → remove commas → 82200
  // If uses period as thousands sep: "82.200" → remove dots → 82200
  // If has both comma and dot (e.g. "1.234,56") → not typical for VND, treat last sep as decimal
  const noSep = raw.replace(/[.,]/g, '');
  return parseInt(noSep, 10);
}

/** Extract the last formatted amount from a line (= item total in Lotte Mart rows) */
function extractLastAmount(line: string): number | null {
  const matches = line.match(AMOUNT_RE);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const value = parseAmount(last);
  return isNaN(value) ? null : value;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD or null */
function extractDate(lines: string[]): string | null {
  const header = lines.slice(0, 15).join(' ');

  // ISO-ish: 2013-11-09
  const iso = header.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];

  // DD/MM/YYYY
  const dmy = header.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  // DD-MM-YYYY
  const dmy2 = header.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (dmy2) return `${dmy2[3]}-${dmy2[2]}-${dmy2[1]}`;

  // YYYY/MM/DD
  const ymd = header.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

  return null;
}

// ─── Merchant helper ──────────────────────────────────────────────────────────

function extractMerchant(lines: string[]): string {
  // Walk the first lines until we find one that looks like a store name
  // (not all digits/short codes, not empty)
  for (const line of lines.slice(0, 6)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\d+$/.test(trimmed)) continue; // pure number
    if (trimmed.length < 3) continue;
    // If it contains recognizable store keywords return early
    if (/lotte|mart|vinmart|bách hóa|coopmart|big c|7-eleven|circle k|ministop|cửa hàng/i.test(trimmed)) {
      return trimmed;
    }
  }
  // Fallback: first non-empty non-numeric line
  for (const line of lines.slice(0, 8)) {
    const trimmed = line.trim();
    if (trimmed && !/^\d+$/.test(trimmed) && trimmed.length >= 3) return trimmed;
  }
  return '';
}

// ─── Item detection ───────────────────────────────────────────────────────────

/** Lotte Mart pattern: item line starts with 3-digit number + space */
const ITEM_NUM_RE = /^\d{3}\s+(.+)/;

/** Price data row: contains at least 2 formatted amounts */
const PRICE_ROW_RE = /(\d{1,3}(?:[.,]\d{3})+.*){2,}/;

/** Footer keywords indicating subtotal / grand total */
const TOTAL_KW_RE = /tong|total|cong|thanh toan|grand|subtotal/i;

function parseLotteMartFormat(lines: string[]): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  let i = 0;
  while (i < lines.length) {
    const nameMatch = lines[i].match(ITEM_NUM_RE);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      // Look ahead up to 3 lines for the price data row
      let found = false;
      for (let j = i + 1; j <= i + 3 && j < lines.length; j++) {
        if (TOTAL_KW_RE.test(lines[j])) break;
        if (PRICE_ROW_RE.test(lines[j])) {
          const amount = extractLastAmount(lines[j]);
          if (amount && amount > 0) {
            items.push({ name, amount });
            i = j + 1;
            found = true;
            break;
          }
        }
      }
      if (!found) i++;
    } else {
      i++;
    }
  }
  return items;
}

/** Generic fallback: lines where last token is a price and preceding text is the item name */
function parseGenericFormat(lines: string[]): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  for (const line of lines) {
    if (TOTAL_KW_RE.test(line)) continue;
    if (/^\d{3}\s/.test(line)) continue; // handled by lotte mart pass

    // Line must have at least one formatted amount
    const amounts = line.match(AMOUNT_RE);
    if (!amounts || amounts.length === 0) continue;

    const lastAmount = parseAmount(amounts[amounts.length - 1]);
    if (!lastAmount || lastAmount <= 0) continue;

    // Name = everything before the last amount occurrence
    const lastAmountStr = amounts[amounts.length - 1];
    const nameRaw = line.substring(0, line.lastIndexOf(lastAmountStr)).trim();
    const name = nameRaw.replace(/\s+\d+\s*$/, '').trim(); // strip trailing qty digit
    if (name.length < 2) continue;

    items.push({ name, amount: lastAmount });
  }
  return items;
}

function extractTotal(lines: string[]): number | null {
  for (const line of [...lines].reverse()) {
    if (TOTAL_KW_RE.test(line)) {
      const amount = extractLastAmount(line);
      if (amount && amount > 0) return amount;
    }
  }
  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseReceiptText(ocrText: string): ReceiptParseResult {
  const lines = ocrText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const merchant = extractMerchant(lines);
  const date = extractDate(lines);
  const total = extractTotal(lines);

  // Try Lotte Mart numbered-item format first
  let items = parseLotteMartFormat(lines);

  // Fallback to generic parsing if no items found
  if (items.length === 0) {
    items = parseGenericFormat(lines);
  }

  return { merchant, date, items, total };
}
