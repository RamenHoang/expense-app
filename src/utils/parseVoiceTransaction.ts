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

// Vietnamese synonyms for common category names.
// Keys are lowercase category names as they typically appear in the app.
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'ăn uống': ['cà phê', 'cafe', 'coffee', 'bún', 'phở', 'cơm', 'trà sữa', 'nhà hàng', 'quán', 'ăn sáng', 'ăn trưa', 'ăn tối', 'đồ ăn', 'snack', 'bánh', 'trà', 'nước'],
  'đi lại': ['xăng', 'xe', 'grab', 'taxi', 'bus', 'xe buýt', 'uber', 'vé', 'gửi xe', 'đổ xăng', 'giao thông'],
  'mua sắm': ['quần áo', 'giày', 'túi', 'thời trang', 'siêu thị', 'chợ', 'shopee', 'lazada', 'tiki'],
  'giải trí': ['phim', 'game', 'cinema', 'nhạc', 'concert', 'vui chơi', 'rạp', 'karaoke', 'du lịch'],
  'sức khỏe': ['thuốc', 'bệnh viện', 'khám', 'y tế', 'gym', 'spa', 'phòng khám', 'bác sĩ'],
  'hóa đơn': ['điện', 'nước', 'internet', 'wifi', 'tiền nhà', 'thuê nhà', 'hóa đơn', 'điện thoại'],
  'giáo dục': ['học phí', 'sách', 'khóa học', 'trường', 'gia sư', 'học online'],
  'lương': ['lương', 'thưởng', 'tiền lương', 'salary', 'bonus'],
  'đầu tư': ['đầu tư', 'cổ phiếu', 'crypto', 'tiết kiệm', 'chứng khoán'],
  'thu nhập khác': ['hoàn tiền', 'bán hàng', 'bán', 'kiếm', 'freelance', 'làm thêm'],
};

const EXPENSE_KEYWORDS = ['chi', 'tiêu', 'mua', 'trả', 'thanh toán', 'nộp', 'đóng', 'tốn', 'mất', 'bỏ ra', 'đổ', 'gửi', 'trả tiền'];
const INCOME_KEYWORDS  = ['thu', 'nhận', 'lương', 'bán', 'kiếm', 'được', 'hoàn tiền', 'thu nhập', 'nhập', 'nhận được'];

// Number + optional Vietnamese multiplier unit.
// Note: "m" is intentionally excluded — too ambiguous (matches "mì", "mua", etc.)
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

// In Vietnamese, period is the thousands separator ("50.000" = 50,000)
// and comma may be used as decimal separator ("50,5" = 50.5).
function parseVietnameseNumber(str: string): number {
  // Strip all periods (thousands separator) then treat comma as decimal point
  const noThousands = str.replace(/\./g, '');
  const normalized = noThousands.replace(',', '.');
  return parseFloat(normalized);
}

function detectType(lower: string): 'income' | 'expense' {
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw)) return 'income';
  }
  for (const kw of EXPENSE_KEYWORDS) {
    if (lower.includes(kw)) return 'expense';
  }
  return 'expense'; // default to expense (most common)
}

function extractAmount(lower: string): number | null {
  AMOUNT_REGEX.lastIndex = 0;
  const match = AMOUNT_REGEX.exec(lower);
  if (!match) return null;

  const raw = parseVietnameseNumber(match[1]);
  const unit = match[2]?.toLowerCase() ?? '';
  const multiplier = MULTIPLIERS[unit] ?? 1;
  return Math.round(raw * multiplier);
}

function matchCategory(lower: string, categories: CategoryLike[], detectedType: 'income' | 'expense'): string | undefined {
  const scores = categories.map(cat => {
    const catName = cat.name.toLowerCase();
    let score = 0;

    // Signal 1: exact category name in transcript
    if (lower.includes(catName)) score += 10;

    // Signal 2: each meaningful word of category name found in transcript
    const catWords = catName.split(/\s+/).filter(w => w.length > 1);
    catWords.forEach(word => { if (lower.includes(word)) score += 3; });

    // Signal 3: predefined Vietnamese synonym lookup
    const synonyms = CATEGORY_SYNONYMS[catName] ?? [];
    if (synonyms.some(s => lower.includes(s))) score += 5;

    return { id: cat.id, score, type: cat.type };
  });

  // Prefer categories matching the detected transaction type
  const typed = scores.filter(s => s.type === detectedType && s.score > 0);
  const pool  = typed.length > 0 ? typed : scores.filter(s => s.score > 0);

  return pool.sort((a, b) => b.score - a.score)[0]?.id;
}

function extractNote(original: string, amount: number | null, detectedType: 'income' | 'expense'): string {
  let text = original.toLowerCase();

  // Remove type keywords
  const allKeywords = [...EXPENSE_KEYWORDS, ...INCOME_KEYWORDS];
  for (const kw of allKeywords) {
    text = text.replace(new RegExp(`\\b${kw}\\b`, 'g'), '');
  }

  // Remove amount pattern
  AMOUNT_REGEX.lastIndex = 0;
  text = text.replace(AMOUNT_REGEX, '');

  // Clean up extra whitespace and punctuation
  return text.replace(/[,.\-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseVoiceTransaction(
  transcript: string,
  categories: CategoryLike[],
): ParsedTransaction {
  const lower = transcript.toLowerCase().trim();

  const type       = detectType(lower);
  const amount     = extractAmount(lower);
  const categoryId = matchCategory(lower, categories, type);
  const note       = extractNote(transcript, amount, type);

  return { type, amount, categoryId, note };
}
