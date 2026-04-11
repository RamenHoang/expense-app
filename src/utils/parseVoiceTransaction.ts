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
 */

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number | null;
  categoryId: string | undefined;
  note: string;
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
    'bánh', 'nước', 'bia', 'trà', 'gà', 'cá', 'thịt', 'rau', 'mì',
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
    'bệnh viện', 'khám bệnh', 'vắc xin', 'vaccine', 'nha khoa', 'phòng khám',
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
    'chứng chỉ', 'gia sư', 'trường', 'sách', 'thi',
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
// Amount parsing
// ---------------------------------------------------------------------------

// "m" excluded — too ambiguous (matches "mì", "mua", "mất"…)
const AMOUNT_REGEX = /(\d+(?:[.,]\d{1,3})*)\s*(k|nghìn|ngàn|triệu|củ|lít|tỷ|đồng|đ|vnd)?/gi;

const MULTIPLIERS: Record<string, number> = {
  k:      1_000,
  nghìn:  1_000,
  ngàn:   1_000,
  triệu:  1_000_000,
  củ:     1_000_000,
  lít:    1_000_000,
  tỷ:     1_000_000_000,
  đồng:   1,
  đ:      1,
  vnd:    1,
};

/**
 * Parses a Vietnamese-formatted number string.
 * "50.000" → 50000  (period = thousands separator)
 * "50,5"   → 50.5   (comma = decimal separator)
 */
function parseVietnameseNumber(str: string): number {
  const noThousands = str.replace(/\./g, '');
  return parseFloat(noThousands.replace(',', '.'));
}

// ---------------------------------------------------------------------------
// Type detection
// ---------------------------------------------------------------------------
const EXPENSE_KEYWORDS = ['chi', 'tiêu', 'mua', 'trả', 'thanh toán', 'nộp', 'đóng', 'tốn', 'mất', 'bỏ ra', 'đổ', 'trả tiền'];
const INCOME_KEYWORDS  = ['thu', 'nhận', 'lương', 'bán', 'kiếm', 'được', 'hoàn tiền', 'thu nhập', 'nhận được'];

function detectType(lower: string): 'income' | 'expense' {
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw)) return 'income';
  }
  for (const kw of EXPENSE_KEYWORDS) {
    if (lower.includes(kw)) return 'expense';
  }
  return 'expense'; // default — expense is far more frequent
}

// ---------------------------------------------------------------------------
// Amount extraction
// ---------------------------------------------------------------------------
function extractAmount(lower: string): number | null {
  AMOUNT_REGEX.lastIndex = 0;
  const match = AMOUNT_REGEX.exec(lower);
  if (!match) return null;

  const raw = parseVietnameseNumber(match[1]);
  const unit = match[2]?.toLowerCase() ?? '';
  const multiplier = MULTIPLIERS[unit] ?? 1;
  return Math.round(raw * multiplier);
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

function matchCategory(
  lower: string,
  categories: CategoryLike[],
  detectedType: 'income' | 'expense',
): string | undefined {
  // Step 1: score each domain by how many of its keywords appear in the transcript
  const domainScores: Record<string, number> = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    // Check longest keywords first so "đổ xăng" is found before "xăng"
    const sorted = [...keywords].sort((a, b) => b.length - a.length);
    for (const kw of sorted) {
      if (lower.includes(kw)) {
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
    // Try type-matched categories first, then all
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
    if (catLower.length > 1 && lower.includes(catLower)) {
      return cat.id;
    }
  }

  // Step 5: last resort — "Khác" / "Other"
  return categories.find(c =>
    ['khác', 'other', 'linh tinh'].includes(c.name.toLowerCase())
  )?.id;
}

// ---------------------------------------------------------------------------
// Note extraction — remove amount + type verbs from transcript
// ---------------------------------------------------------------------------
function extractNote(original: string): string {
  let text = original.toLowerCase();

  // Remove type keywords (verbs only, not nouns that carry meaning)
  const verbsOnly = [...EXPENSE_KEYWORDS, ...INCOME_KEYWORDS];
  for (const kw of verbsOnly) {
    text = text.replace(new RegExp(`\\b${kw}\\b`, 'g'), '');
  }

  // Remove amount pattern
  AMOUNT_REGEX.lastIndex = 0;
  text = text.replace(AMOUNT_REGEX, '');

  return text.replace(/[,.\-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function parseVoiceTransaction(
  transcript: string,
  categories: CategoryLike[],
): ParsedTransaction {
  const lower = transcript.toLowerCase().trim();

  const type       = detectType(lower);
  const amount     = extractAmount(lower);
  const categoryId = matchCategory(lower, categories, type);
  const note       = extractNote(transcript);

  return { type, amount, categoryId, note };
}
