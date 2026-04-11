/**
 * Test suite for parseVoiceTransaction.
 * Run with: npx tsx src/utils/__tests__/parseVoiceTransaction.test.ts
 */

import { parseVoiceTransaction } from '../parseVoiceTransaction';

// ---------------------------------------------------------------------------
// Test harness (no external dependencies)
// ---------------------------------------------------------------------------
let pass = 0, fail = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    pass++;
  } catch (e: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${e.message}`);
    fail++;
  }
}

function describe(suiteName: string, fn: () => void) {
  console.log(`\n${suiteName}`);
  fn();
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected)
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null)
        throw new Error(`expected null, got ${JSON.stringify(actual)}`);
    },
    toContain(sub: string) {
      if (typeof actual !== 'string' || !actual.includes(sub))
        throw new Error(`expected "${actual}" to contain "${sub}"`);
    },
    not: {
      toBe(expected: unknown) {
        if (actual === expected)
          throw new Error(`expected NOT ${JSON.stringify(expected)}, but got it`);
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Mock category list (mirrors typical user data)
// ---------------------------------------------------------------------------
const CATS = [
  { id: 'food',          name: 'Ăn uống',   type: 'expense' },
  { id: 'transport',     name: 'Di chuyển', type: 'expense' },
  { id: 'health',        name: 'Sức khỏe',  type: 'expense' },
  { id: 'shopping',      name: 'Mua sắm',   type: 'expense' },
  { id: 'entertainment', name: 'Giải trí',  type: 'expense' },
  { id: 'bills',         name: 'Hóa đơn',   type: 'expense' },
  { id: 'education',     name: 'Học tập',   type: 'expense' },
  { id: 'gifts',         name: 'Quà cáp',   type: 'expense' },
  { id: 'salary',        name: 'Lương',      type: 'income' },
  { id: 'freelance',     name: 'Freelance',  type: 'income' },
  { id: 'investment',    name: 'Đầu tư',    type: 'expense' },
  { id: 'other',         name: 'Khác',       type: 'expense' },
  { id: 'apple',         name: 'Táo',        type: 'expense' },
];

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe('BUG FIXES — user-reported issues', () => {
  test('[Bug 1] "100.000 đi chợ mua gà" — note should not start with "i"', () => {
    const r = parseVoiceTransaction('100.000 đi chợ mua gà', CATS);
    expect(r.type).toBe('expense');
    expect(r.amount).toBe(100_000);
    expect(r.categoryId).toBe('food');
    // note must start with "Đ", not "i" (AMOUNT_REGEX must not eat "đ" from "đi")
    expect(r.note.charAt(0)).toBe('Đ');
    expect(r.note).toContain('Đi chợ');
  });

  test('[Bug 2] "Một triệu tiền vác xin cho Táo" — word number should parse to 1,000,000', () => {
    const r = parseVoiceTransaction('Một triệu tiền vác xin cho Táo', CATS);
    expect(r.amount).toBe(1_000_000);
    expect(r.categoryId).toBe('health'); // vắc xin → sức khỏe
    // note must NOT contain "Một triệu"
    expect(r.note).not.toBe('Một triệu tiền vác xin cho Táo');
    expect(r.note).toContain('Tiền');
  });

  test('[Bug 3] "50.000 mua thuốc" — type must be expense, not income', () => {
    const r = parseVoiceTransaction('50.000 mua thuốc', CATS);
    expect(r.type).toBe('expense');   // "thu" in "thuốc" must not trigger income
    expect(r.amount).toBe(50_000);
    expect(r.categoryId).toBe('health');
    expect(r.note).toContain('thuốc'); // "thuốc" must not be mangled to "ốc"
  });
});

describe('TYPE DETECTION', () => {
  test('"thu" standalone → income', () => {
    expect(parseVoiceTransaction('thu 500 nghìn', CATS).type).toBe('income');
  });

  test('"thuốc" does not trigger income', () => {
    expect(parseVoiceTransaction('mua thuốc 30k', CATS).type).toBe('expense');
  });

  test('"chín" (số 9) does not trigger expense via "chi"', () => {
    // "chín" contains "chi" but must not be mistaken for the expense keyword
    const r = parseVoiceTransaction('nhận chín mươi nghìn', CATS);
    expect(r.type).toBe('income');
  });

  test('"được" alone does not force income', () => {
    // "được" is too ambiguous; should fall back to default (expense)
    const r = parseVoiceTransaction('mua được 50k', CATS);
    expect(r.type).toBe('expense');
  });

  test('"nhận lương" → income', () => {
    expect(parseVoiceTransaction('nhận lương tháng ba', CATS).type).toBe('income');
  });

  test('"chi tiêu" → expense', () => {
    expect(parseVoiceTransaction('chi tiêu 200k hôm nay', CATS).type).toBe('expense');
  });
});

describe('AMOUNT — digit-based', () => {
  test('"50.000" parses to 50,000 (VN thousands separator)', () => {
    expect(parseVoiceTransaction('50.000 mì quảng ăn sáng', CATS).amount).toBe(50_000);
  });

  test('"100k" → 100,000', () => {
    expect(parseVoiceTransaction('chi 100k cà phê', CATS).amount).toBe(100_000);
  });

  test('"2 triệu" → 2,000,000', () => {
    expect(parseVoiceTransaction('nhận 2 triệu lương', CATS).amount).toBe(2_000_000);
  });

  test('"1.500.000" → 1,500,000', () => {
    expect(parseVoiceTransaction('chi 1.500.000 tiền nhà', CATS).amount).toBe(1_500_000);
  });
});

describe('AMOUNT — word-based', () => {
  test('"Một triệu" → 1,000,000', () => {
    expect(parseVoiceTransaction('Một triệu tiền vắc xin', CATS).amount).toBe(1_000_000);
  });

  test('"Hai trăm nghìn" → 200,000', () => {
    expect(parseVoiceTransaction('Hai trăm nghìn tiền điện', CATS).amount).toBe(200_000);
  });

  test('"Năm mươi nghìn" → 50,000', () => {
    expect(parseVoiceTransaction('Năm mươi nghìn mua thuốc', CATS).amount).toBe(50_000);
  });

  test('"Ba triệu" → 3,000,000', () => {
    expect(parseVoiceTransaction('nhận ba triệu lương', CATS).amount).toBe(3_000_000);
  });

  test('"Mười lăm nghìn" → 15,000', () => {
    expect(parseVoiceTransaction('mua bánh mì mười lăm nghìn', CATS).amount).toBe(15_000);
  });
});

describe('CATEGORY MATCHING', () => {
  test('"mua gà" → Ăn uống (not Mua sắm)', () => {
    expect(parseVoiceTransaction('mua gà 50k', CATS).categoryId).toBe('food');
  });

  test('"tiêm vắc xin" → Sức khỏe', () => {
    expect(parseVoiceTransaction('tiêm vắc xin 200k', CATS).categoryId).toBe('health');
  });

  test('"đổ xăng" → Di chuyển', () => {
    expect(parseVoiceTransaction('đổ xăng 150 nghìn', CATS).categoryId).toBe('transport');
  });

  test('"mua quần áo shopee" → Mua sắm', () => {
    expect(parseVoiceTransaction('mua quần áo shopee 300k', CATS).categoryId).toBe('shopping');
  });

  test('"xem phim" → Giải trí', () => {
    expect(parseVoiceTransaction('xem phim cgv 100k', CATS).categoryId).toBe('entertainment');
  });

  test('"học tiếng anh online" → Học tập', () => {
    expect(parseVoiceTransaction('học tiếng anh online 500k', CATS).categoryId).toBe('education');
  });

  test('"tiền điện" → Hóa đơn', () => {
    expect(parseVoiceTransaction('tiền điện tháng 8 300k', CATS).categoryId).toBe('bills');
  });

  test('"nhận lương" → Lương (income category)', () => {
    expect(parseVoiceTransaction('nhận lương tháng 5 triệu', CATS).categoryId).toBe('salary');
  });

  test('"mua táo" — custom category "Táo" matched via name fallback', () => {
    expect(parseVoiceTransaction('mua táo 20k', CATS).categoryId).toBe('apple');
  });
});

describe('USER-REPORTED BUGS (round 2)', () => {
  test('[Bug 4] "100.000 mua vé xem phim" → Giải trí (not Di chuyển)', () => {
    // "vé xe" (transport) was substring-matching inside "vé xem" → false transport match
    const r = parseVoiceTransaction('100.000 mua vé xem phim', CATS);
    expect(r.amount).toBe(100_000);
    expect(r.categoryId).toBe('entertainment');
  });

  test('[Bug 5] "Một triệu tiền đầu tư cổ phiếu" → type syncs from investment category', () => {
    // investment category type='expense' in test CATS, so type should match
    const r = parseVoiceTransaction('Một triệu tiền đầu tư cổ phiếu', CATS);
    expect(r.amount).toBe(1_000_000);
    expect(r.categoryId).toBe('investment');
    // type must equal the investment category's type (expense in test CATS)
    expect(r.type).toBe('expense');
  });

  test('[Bug 5b] type syncs to income when matched category is income type', () => {
    // salary category has type='income' — even without explicit income keyword,
    // the type should be 'income' because the category is income
    const r = parseVoiceTransaction('500k tiền lương tháng này', CATS);
    expect(r.categoryId).toBe('salary');
    expect(r.type).toBe('income');
  });

  test('[Bug 6] "Một triệu tiền đầu tư cổ phiếu" → note is "Tiền đầu tư cổ phiếu"', () => {
    // WORD_AMOUNT_RE must not consume "tư" from "đầu tư"
    const r = parseVoiceTransaction('Một triệu tiền đầu tư cổ phiếu', CATS);
    expect(r.note).toBe('Tiền đầu tư cổ phiếu');
  });
});

describe('NOTE EXTRACTION', () => {
  test('"100.000 đi chợ mua gà" → "Đi chợ mua gà"', () => {
    expect(parseVoiceTransaction('100.000 đi chợ mua gà', CATS).note).toBe('Đi chợ mua gà');
  });

  test('"50.000 mua thuốc" → "Mua thuốc" (not "ốc")', () => {
    expect(parseVoiceTransaction('50.000 mua thuốc', CATS).note).toBe('Mua thuốc');
  });

  test('"Một triệu tiền vác xin cho Táo" → "Tiền vác xin cho Táo"', () => {
    expect(parseVoiceTransaction('Một triệu tiền vác xin cho Táo', CATS).note).toBe('Tiền vác xin cho Táo');
  });

  test('"50 nghìn mì quảng ăn sáng" → note contains "mì quảng"', () => {
    expect(parseVoiceTransaction('50 nghìn mì quảng ăn sáng', CATS).note).toContain('Mì quảng');
  });
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
