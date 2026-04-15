/**
 * parseVoiceTransaction.ts
 *
 * Parses a Vietnamese voice transcript into a structured transaction object.
 *
 * ## Category Matching — Two-Level Domain Approach
 *
 * The core insight is: **nouns determine category, not verbs**.
 * "mua gà" → "gà" (food noun) → Ăn uống, NOT Mua sắm.
 * "mua quần áo" → "quần", "áo" (clothing nouns) → Mua sắm.
 *
 * ### Level 1: DOMAIN_KEYWORDS
 * Maps abstract domains (food, transport, health…) to Vietnamese trigger keywords.
 * Keywords are mostly nouns/specific phrases — verbs like "mua" are intentionally excluded.
 * Longer keywords score higher because they are more specific:
 *   - length > 4 chars → 3 pts  (e.g. "vắc xin", "đổ xăng")
 *   - length > 2 chars → 2 pts  (e.g. "xăng", "phim")
 *   - length ≤ 2 chars → 1 pt   (e.g. "xe", "gà") — short, might be ambiguous
 *
 * ### Level 2: DOMAIN_CATEGORY_ALIASES
 * Maps each domain to a list of possible category name variations (lowercase).
 * The user's actual category name is matched against these aliases, so the system
 * works regardless of whether the user named it "Di chuyển", "Đi lại", or "Transport".
 *
 * ### Fallback chain
 * 1. Domain score → alias match (main path)
 * 2. Category name appears directly in transcript (handles custom names like "Táo", "Freelance")
 * 3. Category named "Khác" / "Other"
 * 4. undefined (caller shows unmatched state to user)
 *
 * ## Known design decisions
 * - `đ` (đồng symbol) is excluded from AMOUNT_REGEX units — it causes false matches
 *   on words like "đi", "đó", "đây". Use "đồng" or "vnd" explicitly instead.
 * - `được` is excluded from INCOME_KEYWORDS — it's too ambiguous in Vietnamese
 *   (can mean "able to" as a modal verb, not just "received").
 * - Type detection uses space-based word boundaries instead of `\b` because JavaScript
 *   regex `\b` does not handle Vietnamese Unicode correctly (e.g. `\bthu\b` matches
 *   "thu" inside "thuốc").
 * - Note extraction does NOT remove type keywords — only the amount is stripped.
 *   "mua thuốc 50k" → note "Mua thuốc" (keeps "mua" as part of the description).
 */

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number | null;
  categoryId: string | undefined;
  note: string;
  date?: Date;
}

interface CategoryLike {
  id: string;
  name: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Level 1: domain → trigger keywords (mostly nouns, sorted long→short so that
// longer (more specific) phrases are checked first and don't get split by
// shorter substrings.)
// ---------------------------------------------------------------------------
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  food: [
    'ăn sáng', 'ăn trưa', 'ăn tối', 'nhà hàng', 'trà sữa', 'cà phê',
    'bánh mì', 'đồ ăn', 'trái cây', 'canteen', 'pizza', 'burger', 'sushi',
    'cafe', 'coffee', 'phở', 'bún', 'cơm', 'lẩu', 'nhậu', 'quán', 'snack',
    'bánh', 'bia', 'trà', 'gà', 'cá', 'thịt', 'rau', 'mì', 'nước',
  ],
  transport: [
    'đổ xăng', 'xe buýt', 'vé tàu', 'vé máy bay', 'giao thông',
    'xe ôm', 'gửi xe', 'vé xe', 'parking', 'máy bay',
    'grab', 'taxi', 'uber', 'xăng', 'tàu', 'xe',
  ],
  shopping: [
    'quần áo', 'mỹ phẩm', 'nước hoa', 'đồ điện', 'đồ gia dụng', 'nội thất',
    'kính mắt', 'shopee', 'lazada', 'amazon', 'laptop', 'điện thoại',
    'tiki', 'quần', 'giày', 'dép', 'son', 'túi', 'ví', 'áo',
  ],
  health: [
    'bệnh viện', 'khám bệnh', 'vắc xin', 'vac xin', 'vác xin', // vác xin = STT variant
    'vaccine', 'tiêm phòng', 'nha khoa', 'phòng khám',
    'xét nghiệm', 'viện phí', 'bác sĩ', 'thuốc', 'tiêm', 'gym', 'spa',
    'massage', 'răng', 'mắt', 'y tế',
  ],
  entertainment: [
    'youtube premium', 'du lịch', 'concert', 'karaoke', 'netflix', 'spotify',
    'bowling', 'billiard', 'khách sạn', 'hội chợ', 'resort', 'sở thú',
    'steam', 'phim', 'nhạc', 'game', 'rạp', 'vé',
  ],
  bills: [
    'tiền điện', 'tiền nước', 'tiền nhà', 'thuê nhà', 'phí dịch vụ',
    'cước điện thoại', 'truyền hình', 'internet', 'bảo hiểm', 'wifi',
  ],
  education: [
    'học phí', 'khóa học', 'học online', 'lớp học', 'văn phòng phẩm',
    'chứng chỉ', 'gia sư', 'trường', 'sách', 'thi', 'học',
  ],
  gifts: [
    'quà cáp', 'đám cưới', 'đám hỏi', 'mừng thọ', 'quà tặng',
    'sinh nhật', 'thiệp', 'tặng', 'quà', 'hoa',
  ],
  salary: [
    'lương tháng', 'tiền lương', 'salary', 'bonus', 'thưởng', 'lương',
  ],
  freelance: [
    'lập trình', 'viết lách', 'outsource', 'freelance', 'hợp đồng',
    'thiết kế', 'content', 'project', 'dự án', 'code',
  ],
  investment: [
    'cổ phiếu', 'chứng khoán', 'gửi tiết kiệm', 'tiết kiệm', 'bitcoin',
    'crypto', 'đầu tư', 'lãi', 'quỹ', 'fund',
  ],
};

// ---------------------------------------------------------------------------
// Level 2: domain → possible category name variations (all lowercase).
// The user's actual category name is matched against these aliases, so the
// system works regardless of naming ("Di chuyển" vs "Đi lại" vs "Transport").
// ---------------------------------------------------------------------------
const DOMAIN_CATEGORY_ALIASES: Record<string, string[]> = {
  food:          ['ăn uống', 'ăn & uống', 'đồ ăn', 'thực phẩm', 'food'],
  transport:     ['di chuyển', 'đi lại', 'giao thông', 'vận chuyển', 'xe cộ', 'transport'],
  shopping:      ['mua sắm', 'shopping', 'mua hàng', 'tiêu dùng'],
  health:        ['sức khỏe', 'sức khoẻ', 'y tế', 'health', 'chăm sóc sức khỏe'],
  entertainment: ['giải trí', 'entertainment', 'vui chơi', 'giải trí & du lịch'],
  bills:         ['hóa đơn', 'hoá đơn', 'tiện ích', 'bills', 'sinh hoạt', 'chi phí cố định'],
  education:     ['học tập', 'giáo dục', 'education', 'học', 'phát triển bản thân'],
  gifts:         ['quà cáp', 'quà tặng', 'quà', 'gifts', 'tặng quà'],
  salary:        ['lương', 'thu nhập', 'income', 'salary', 'lương thưởng'],
  freelance:     ['freelance', 'tự do', 'thu nhập tự do', 'công việc tự do'],
  investment:    ['đầu tư', 'investment', 'tài chính', 'tiết kiệm & đầu tư'],
  other:         ['khác', 'other', 'linh tinh', 'miscellaneous'],
};

// ---------------------------------------------------------------------------
// Amount parsing — digit-based
//
// NOTE: bare `đ` (đồng symbol) is intentionally excluded from the unit group.
// It causes false matches on common words beginning with "đ" such as "đi",
// "đó", "đây". People rarely say "đ" in speech; they say "đồng" or just use
// a multiplier (k, nghìn, triệu…).
// ---------------------------------------------------------------------------
const AMOUNT_REGEX = /(\d+(?:[.,]\d{1,3})*)\s*(k|nghìn|ngàn|triệu|củ|lít|tỷ|đồng|vnd)?/gi;

const MULTIPLIERS: Record<string, number> = {
  k:      1_000,
  nghìn:  1_000,
  ngàn:   1_000,
  triệu:  1_000_000,
  củ:     1_000_000,
  lít:    1_000_000,
  tỷ:     1_000_000_000,
  đồng:   1,
  vnd:    1,
};

/**
 * Parses a Vietnamese-formatted number string.
 * "50.000" → 50000  (period = thousands separator in VN)
 * "50,5"   → 50.5   (comma = decimal separator)
 */
function parseVietnameseNumber(str: string): number {
  const noThousands = str.replace(/\./g, '');
  return parseFloat(noThousands.replace(',', '.'));
}

// ---------------------------------------------------------------------------
// Amount parsing — word-based (e.g. "Một triệu", "Năm mươi nghìn")
// ---------------------------------------------------------------------------

/** Maps Vietnamese number words to their digit values. */
const VN_ONES: Record<string, number> = {
  'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'tư': 4,
  'năm': 5, 'lăm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9,
};

/**
 * Parses a sequence of Vietnamese number words (1–999 range).
 * Handles: "một", "hai mươi", "ba mươi lăm", "một trăm", "hai trăm năm mươi".
 * Returns null if the words cannot be parsed as a number.
 */
function parseVnInteger(words: string[]): number | null {
  let i = 0;
  let total = 0;

  // Hundreds: X trăm
  if (i < words.length - 1 && VN_ONES[words[i]] !== undefined && words[i + 1] === 'trăm') {
    total += VN_ONES[words[i]] * 100;
    i += 2;
    // Optional "linh"/"lẻ" connector (e.g. "một trăm linh năm" = 105)
    if (i < words.length && (words[i] === 'linh' || words[i] === 'lẻ')) i++;
  }

  // Tens: "mười [X]" or "X mươi [Y]"
  if (i < words.length) {
    if (words[i] === 'mười') {
      total += 10; i++;
      if (i < words.length && VN_ONES[words[i]] !== undefined) { total += VN_ONES[words[i]]; i++; }
    } else if (VN_ONES[words[i]] !== undefined && words[i + 1] === 'mươi') {
      total += VN_ONES[words[i]] * 10; i += 2;
      if (i < words.length && VN_ONES[words[i]] !== undefined) { total += VN_ONES[words[i]]; i++; }
    } else if (VN_ONES[words[i]] !== undefined) {
      total += VN_ONES[words[i]]; i++;
    }
  }

  return i === 0 ? null : total;
}

/**
 * Extracts a word-based Vietnamese amount from the transcript.
 * e.g. "Một triệu tiền thuốc" → 1_000_000
 *      "Năm mươi nghìn mua gà" → 50_000
 * Returns null if no word number is found.
 */
function extractWordAmount(lower: string): number | null {
  // Ordered largest → smallest so "trăm nghìn" is tried before "nghìn"
  const WORD_MULTIPLIERS: Array<[string, number]> = [
    ['tỷ',          1_000_000_000],
    ['triệu',       1_000_000],
    ['trăm nghìn',  100_000],
    ['trăm ngàn',   100_000],
    ['nghìn',       1_000],
    ['ngàn',        1_000],
    ['trăm',        100],
  ];

  // Tokens considered part of a Vietnamese number phrase
  const NUMBER_MARKERS = new Set([
    ...Object.keys(VN_ONES), 'mười', 'mươi', 'trăm', 'linh', 'lẻ',
  ]);

  for (const [multWord, multVal] of WORD_MULTIPLIERS) {
    const idx = lower.indexOf(multWord);
    if (idx === -1) continue;

    const before = lower.slice(0, idx).trim();
    const words = before.split(/\s+/);

    // Find the trailing cluster of number words immediately before the multiplier
    let numEnd = words.length;
    let numStart = numEnd;
    while (numStart > 0 && NUMBER_MARKERS.has(words[numStart - 1])) numStart--;

    if (numStart === numEnd) continue; // no number words found

    const n = parseVnInteger(words.slice(numStart, numEnd));
    if (n !== null && n > 0) return n * multVal;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Type detection
//
// Uses space-based word boundaries instead of regex \b because JavaScript's
// \b does not handle Vietnamese Unicode: `\bthu\b` incorrectly matches "thu"
// inside "thuốc" (since "ố" is non-ASCII and treated as a non-word char).
//
// NOTE: "được" is intentionally excluded — it is too ambiguous:
//   income sense: "nhận được 2 triệu" (received 2M)
//   modal sense:  "đi được" (can go), "làm được" (can do)
// The combined keywords "nhận được" / "thu được" already cover the income case.
// ---------------------------------------------------------------------------
const EXPENSE_KEYWORDS = [
  'thanh toán', 'bỏ ra', 'trả tiền',          // multi-word first
  'chi', 'tiêu', 'mua', 'trả', 'nộp', 'đóng', 'tốn', 'mất', 'đổ',
];
const INCOME_KEYWORDS = [
  'hoàn tiền', 'thu nhập', 'nhận được',         // multi-word first
  'thu', 'nhận', 'lương', 'bán', 'kiếm',
];

/** Returns true if `keyword` appears as a standalone word/phrase in `text`. */
function hasKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (keyword.includes(' ')) {
    // Multi-word phrases: substring match is specific enough
    return text.includes(keyword);
  }
  // Single word: must be surrounded by whitespace or start/end of string
  return new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`).test(text);
}

function detectType(lower: string): 'income' | 'expense' {
  for (const kw of INCOME_KEYWORDS)  { if (hasKeyword(lower, kw)) return 'income'; }
  for (const kw of EXPENSE_KEYWORDS) { if (hasKeyword(lower, kw)) return 'expense'; }
  return 'expense'; // default — expense is far more frequent
}

// ---------------------------------------------------------------------------
// Amount extraction (digit-based first, then word-based fallback)
// ---------------------------------------------------------------------------
function extractAmount(lower: string): number | null {
  // 1. Try digit-based (e.g. "50.000", "100k", "2 triệu")
  AMOUNT_REGEX.lastIndex = 0;
  const match = AMOUNT_REGEX.exec(lower);
  if (match) {
    const raw = parseVietnameseNumber(match[1]);
    if (raw > 0) {
      const unit = match[2]?.toLowerCase() ?? '';
      return Math.round(raw * (MULTIPLIERS[unit] ?? 1));
    }
  }

  // 2. Fallback: word-based (e.g. "Một triệu", "Năm mươi nghìn")
  return extractWordAmount(lower);
}

// ---------------------------------------------------------------------------
// Category matching — two-level domain approach
// ---------------------------------------------------------------------------

/** Score a keyword by length: longer = more specific. */
function keywordScore(kw: string): number {
  if (kw.length > 4) return 3;
  if (kw.length > 2) return 2;
  return 1;
}

/**
 * Returns true if `kw` appears in `text` as a whole word (not as a substring
 * inside another word). All keywords use space-based word boundaries to prevent
 * false matches like:
 *   - "áo" inside "táo"         (short keyword substring)
 *   - "vé xe" inside "vé xem"   (multi-word keyword prefix match via includes())
 *   - "xe" inside "xét nghiệm"
 */
function matchesKeyword(text: string, kw: string): boolean {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`).test(text);
}

function matchCategory(
  lower: string,
  categories: CategoryLike[],
  detectedType: 'income' | 'expense',
): string | undefined {
  // Step 1: score each domain by how many of its keywords appear in the transcript
  const domainScores: Record<string, number> = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const sorted = [...keywords].sort((a, b) => b.length - a.length);
    for (const kw of sorted) {
      if (matchesKeyword(lower, kw)) {
        domainScores[domain] = (domainScores[domain] ?? 0) + keywordScore(kw);
      }
    }
  }

  // Step 2: rank domains best → worst
  const rankedDomains = Object.entries(domainScores)
    .sort(([, a], [, b]) => b - a)
    .map(([domain]) => domain);

  // Step 3: for each domain, find the first user category whose name matches an alias.
  // Prefer categories whose type matches the detected transaction type.
  const byType = (cat: CategoryLike) => cat.type === detectedType;
  for (const domain of rankedDomains) {
    const aliases = DOMAIN_CATEGORY_ALIASES[domain] ?? [];
    for (const pool of [categories.filter(byType), categories]) {
      for (const cat of pool) {
        const catLower = cat.name.toLowerCase();
        if (aliases.some(alias => catLower.includes(alias) || alias.includes(catLower))) {
          return cat.id;
        }
      }
    }
  }

  // Step 4: fallback — category name appears directly in transcript
  // handles custom categories ("Táo", "Freelance", brand names…)
  for (const cat of categories) {
    const catLower = cat.name.toLowerCase();
    if (catLower.length > 1 && lower.includes(catLower)) return cat.id;
  }

  // Step 5: last resort — "Khác" / "Other"
  return categories.find(c =>
    ['khác', 'other', 'linh tinh'].includes(c.name.toLowerCase()),
  )?.id;
}

// ---------------------------------------------------------------------------
// Date parsing
//
// Extracts a Vietnamese date expression from the transcript.
// Supported patterns (in priority order):
//   Relative:    "hôm kia" (-2d), "hôm qua" (-1d), "hôm nay" (today)
//   Day-of-week: "thứ hai"–"thứ bảy", "chủ nhật" → most recent past occurrence
//   Full date:   "ngày 15 tháng 3"  or  "15/3"
//   Word day:    "ngày mười lăm"  (Vietnamese number words 1–31)
//   Day-only:    "ngày 5" → day 5 of current/previous month
// ---------------------------------------------------------------------------

/** Maps Vietnamese number words to day values 1–31, sorted longest-first to
 *  prevent partial matches (e.g. "ba mươi mốt" must be checked before "ba"). */
const VIET_DAY_NUMS: Array<[string, number]> = [
  ['ba mươi mốt', 31], ['ba mươi', 30],
  ['hai mươi chín', 29], ['hai mươi tám', 28], ['hai mươi bảy', 27],
  ['hai mươi sáu', 26], ['hai mươi lăm', 25], ['hai mươi bốn', 24],
  ['hai mươi ba', 23], ['hai mươi hai', 22], ['hai mươi mốt', 21], ['hai mươi', 20],
  ['mười chín', 19], ['mười tám', 18], ['mười bảy', 17], ['mười sáu', 16],
  ['mười lăm', 15], ['mười bốn', 14], ['mười ba', 13], ['mười hai', 12],
  ['mười một', 11], ['mười', 10],
  ['chín', 9], ['tám', 8], ['bảy', 7], ['sáu', 6],
  ['năm', 5], ['bốn', 4], ['ba', 3], ['hai', 2], ['một', 1],
];

function extractDate(lower: string): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysAgo = (n: number): Date => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };

  // Relative keywords — check 'hôm kia' before 'hôm qua' to avoid prefix collision
  if (lower.includes('hôm kia'))  return daysAgo(2);
  if (lower.includes('hôm qua'))  return daysAgo(1);
  if (lower.includes('hôm nay'))  return daysAgo(0);

  // Day of week — most recent past occurrence (never same-day)
  const DOW_MAP: Array<[string, number]> = [
    ['thứ hai', 1], ['thứ ba', 2], ['thứ tư', 3],
    ['thứ năm', 4], ['thứ sáu', 5], ['thứ bảy', 6], ['chủ nhật', 0],
  ];
  for (const [name, dow] of DOW_MAP) {
    if (lower.includes(name)) {
      const d = new Date(today);
      let diff = today.getDay() - dow;
      if (diff <= 0) diff += 7; // always go back at least 1 day
      d.setDate(d.getDate() - diff);
      return d;
    }
  }

  // Full numeric date: "ngày 15 tháng 3"
  const fullNumMatch = lower.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})/);
  if (fullNumMatch) {
    const day   = parseInt(fullNumMatch[1], 10);
    const month = parseInt(fullNumMatch[2], 10) - 1;
    const d = new Date(today.getFullYear(), month, day);
    if (d > today) d.setFullYear(d.getFullYear() - 1);
    return d;
  }

  // Slash date: "15/3"
  const slashMatch = lower.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (slashMatch) {
    const day   = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const d = new Date(today.getFullYear(), month, day);
      if (d > today) d.setFullYear(d.getFullYear() - 1);
      return d;
    }
  }

  // Vietnamese word day: "ngày mười lăm" (longest-first to avoid partial match)
  for (const [word, num] of VIET_DAY_NUMS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`ngày\\s+${escaped}(?:\\s|$)`);
    if (re.test(lower)) {
      const d = new Date(today.getFullYear(), today.getMonth(), num);
      if (d > today) d.setMonth(d.getMonth() - 1);
      return d;
    }
  }

  // Day-only numeric: "ngày 5"
  const dayOnlyMatch = lower.match(/ngày\s+(\d{1,2})(?!\s*tháng)/);
  if (dayOnlyMatch) {
    const day = parseInt(dayOnlyMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const d = new Date(today.getFullYear(), today.getMonth(), day);
      if (d > today) d.setMonth(d.getMonth() - 1);
      return d;
    }
  }

  return null;
}

// Regex patterns used to strip date expressions from the note.
// Applied in priority order (longest/most-specific first).
const DATE_STRIP_PATTERNS: RegExp[] = [
  /hôm kia/gi,
  /hôm qua/gi,
  /hôm nay/gi,
  /thứ\s+(?:hai|ba|tư|năm|sáu|bảy)/gi,
  /chủ\s*nhật/gi,
  /ngày\s+\d{1,2}\s+tháng\s+\d{1,2}/gi,             // full date (must come before day-only)
  /\b\d{1,2}\/\d{1,2}\b/gi,                          // slash date
  new RegExp(                                          // Vietnamese word days (longest-first)
    `ngày\\s+(?:${VIET_DAY_NUMS.map(([w]) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?:\\s|$)`,
    'gi',
  ),
  /ngày\s+\d{1,2}/gi,                                // day-only numeric (must come last)
];

// ---------------------------------------------------------------------------
// Note extraction
//
// Strips amounts AND date expressions from the transcript.
// Type-indicating verbs ("mua", "chi", "thu"…) are intentionally KEPT because
// they often form part of a meaningful description:
//   "50.000 mua thuốc" → note "Mua thuốc"  (not just "thuốc")
//   "100.000 đi chợ mua gà" → note "Đi chợ mua gà"
// ---------------------------------------------------------------------------

// Regex to detect and remove word-based amounts in note extraction
// Matches patterns like "Một triệu", "Năm mươi nghìn", "Hai trăm nghìn"
//
// (?:^|\s) left-boundary: prevents matching number words that are part of
// another word (e.g. "tư" in "đầu tư" could otherwise start a match).
// (?=\s|$) right-boundary: same protection on the trailing multiplier word.
const VN_NUMBER_WORD = '(?:một|hai|ba|bốn|tư|năm|lăm|sáu|bảy|tám|chín|mười|mươi)';
const VN_MULTIPLIER_WORD = '(?:tỷ|triệu|trăm\\s+nghìn|trăm\\s+ngàn|nghìn|ngàn|trăm)';
const WORD_AMOUNT_RE = new RegExp(
  `(?:^|\\s)${VN_NUMBER_WORD}(?:\\s+${VN_NUMBER_WORD}){0,3}\\s+${VN_MULTIPLIER_WORD}(?=\\s|$)`,
  'gi',
);

function extractNote(original: string): string {
  let text = original;

  // Remove date expressions first (before amounts, since dates can contain digits
  // e.g. "15/3" must be removed before AMOUNT_REGEX strips the "15")
  for (const pat of DATE_STRIP_PATTERNS) {
    text = text.replace(pat, ' ');
  }

  // Remove digit-based amounts (e.g. "50.000", "100k", "2 triệu")
  AMOUNT_REGEX.lastIndex = 0;
  text = text.replace(AMOUNT_REGEX, '');

  // Remove word-based amounts (e.g. "Một triệu", "Năm mươi nghìn")
  WORD_AMOUNT_RE.lastIndex = 0;
  text = text.replace(WORD_AMOUNT_RE, '');

  // Remove lone đ/Đ (đồng symbol) that AMOUNT_REGEX leaves behind when the
  // speech recogniser attaches it directly to a number ("100.000đ mua gà" →
  // after amount removal → "đ mua gà"). Match it at any position so it is
  // caught whether it ends up at the start, middle, or end of the note.
  text = text.replace(/(?:^|\s)[đĐ](?=\s|$)/g, ' ');

  // Clean up punctuation and extra whitespace, then capitalize first letter
  text = text.replace(/[,.\-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function parseVoiceTransaction(
  transcript: string,
  categories: CategoryLike[],
): ParsedTransaction {
  const lower = transcript.toLowerCase().trim();

  const detectedType = detectType(lower);
  const amount       = extractAmount(lower);
  const categoryId   = matchCategory(lower, categories, detectedType);
  const note         = extractNote(transcript);

  // Sync transaction type to the matched category's declared type, BUT only
  // when there are no explicit income/expense signal words in the transcript.
  //
  // Rule:
  //   - Explicit keyword present (e.g. "nhận", "thu", "chi", "mua") → trust
  //     the detected type; the user was clear about income or expense.
  //   - No explicit keyword (default 'expense' was used) → defer to the
  //     category's own type, which may be 'income' (e.g. "Đầu tư", "Lương"
  //     categories the user defines as income).
  //
  // This prevents the fallback "Khác" (expense) category from silently
  // overriding a transcript that clearly signals income (e.g. "thu 500 nghìn").
  const hasExplicitType =
    INCOME_KEYWORDS.some(kw => hasKeyword(lower, kw)) ||
    EXPENSE_KEYWORDS.some(kw => hasKeyword(lower, kw));
  const matchedCat = categoryId ? categories.find(c => c.id === categoryId) : undefined;
  const type = (!hasExplicitType && matchedCat)
    ? (matchedCat.type as 'income' | 'expense')
    : detectedType;

  const date = extractDate(lower) ?? undefined;

  return { type, amount, categoryId, note, date };
}
