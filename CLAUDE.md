# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server
npm start              # expo start --go

# Build
npm run build:android  # EAS local Android build (outputs to ./builds/android)
npm run build:eas      # EAS cloud build via shell script
npm run prebuild       # expo prebuild --clean (regenerate native folders)
npm run build:clean    # Clean Android Gradle build

# TypeScript type checking (no separate lint/test scripts configured)
npx tsc --noEmit
```

## Environment Setup

Requires a `.env` file with Supabase credentials (see `.env.example`):
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Architecture

**Stack**: React Native 0.81 + Expo 54 + TypeScript (strict), Supabase backend, Zustand state management, TanStack React Query for caching, React Navigation, React Native Paper (Material Design 3).

### Data Flow

```
Screen/Component
  → Zustand Store (useTransactionStore, useCategoryStore, etc.)
    → Service (src/services/*.ts)
      → Supabase client (src/config/supabase.ts)
```

There is no intermediate REST API — services call the Supabase JS client directly. Supabase Row Level Security (RLS) enforces data isolation per user/family.

### Navigation

```
RootNavigator
├── AuthNavigator  (unauthenticated: Login, Register, ForgotPassword)
└── MainNavigator  (authenticated: Bottom Tabs)
    ├── Dashboard, Transactions, Budget, Family, Settings tabs
    └── Stack screens pushed from tabs: Categories, AddTransaction, EditTransaction,
        SetBudget, CurrencySelection, CreateFamily, InviteMember, EditFamily
```

Auth state is held in `authStore`; `RootNavigator` switches between stacks based on `session`.

### State Management

Seven Zustand stores in `src/store/`:
- `authStore` — session, user, sign-in/out
- `transactionStore` — paginated transactions (30/page), filters, infinite scroll
- `categoryStore` — category CRUD
- `budgetStore` — budget tracking
- `familyStore` — family groups, members, invitations
- `userStore` — user profile
- `themeStore` — dark/light mode preference

### Feature Modules

Features live under `src/features/<feature>/` and contain their own screens and sub-components. Shared/reusable components live in `src/components/`.

Key features: transactions (with receipt photo upload via Expo Image Picker + Supabase Storage), categories (custom icons & colors), budgets (per-category), family sharing, dashboard analytics (react-native-chart-kit), data export (CSV/JSON), onboarding, dark mode, i18n (English + Vietnamese via i18next), **voice transaction creation**.

### Voice Transaction Feature

Users can create transactions by speaking in Vietnamese. Entry points:
- Dashboard & TransactionList: FAB.Group with mic action → opens `VoiceInputModal`
- AddTransaction screen: mic `IconButton` in the header → opens `VoiceInputModal`

**Flow**: voice input → transcript → parse → pre-fill AddTransactionScreen → user reviews & submits.

**Key files:**
- `src/features/transactions/components/VoiceInputModal.tsx` — recording UI, uses `expo-speech-recognition` with `lang: 'vi-VN'`. Calls `fetchCategories()` every time it opens so category list is always fresh.
- `src/utils/parseVoiceTransaction.ts` — pure parsing logic (no React). See file-level JSDoc for full algorithm description.
- `src/types/navigation.ts` — `AddTransaction` route accepts optional `VoiceTransactionParams` (`initialType`, `initialAmount`, `initialCategoryId`, `initialNote`).

**`parseVoiceTransaction` algorithm** — Two-Level Domain Matching:

The core insight is **nouns determine category, not verbs**. "mua gà" → food ("gà"), not shopping ("mua").

1. **DOMAIN_KEYWORDS**: maps abstract domains (`food`, `transport`, `health`…) to Vietnamese noun/phrase triggers. Verbs like "mua" are intentionally excluded. Score by keyword length:
   - length > 4 chars → 3 pts  (e.g. `"vắc xin"`, `"đổ xăng"`, `"tiền điện"`)
   - length > 2 chars → 2 pts  (e.g. `"xăng"`, `"phim"`, `"thuốc"`)
   - length ≤ 2 chars → 1 pt   (e.g. `"xe"`, `"gà"`) — short, possible false positives
2. **DOMAIN_CATEGORY_ALIASES**: maps each domain to possible category name variations. The user's actual category name ("Di chuyển", "Đi lại", "Transport") is matched against these aliases — decouples fixed keyword knowledge from variable user-defined names.
3. **Fallback chain**: domain match → category name in transcript (custom names like "Táo", "Freelance") → "Khác" / "Other" → undefined.

Quick examples:

| Voice | Top domain | User category matched |
| ----- | ---------- | --------------------- |
| "tiêm vắc xin 200k" | health (3 pts) | Sức khỏe |
| "mua gà 50k" | food (1 pt: "gà") | Ăn uống |
| "mua quần áo shopee" | shopping (5 pts) | Mua sắm |
| "đổ xăng 150 nghìn" | transport (5 pts) | Di chuyển |
| "học tiếng anh online" | education (5 pts) | Học tập |
| "mua táo" | none → fallback name match | Táo (custom) |

Amount parsing handles Vietnamese number formats: `50.000` (period = thousands sep) → 50,000; multipliers `k/nghìn/triệu/tỷ` supported. `m` is excluded (ambiguous: matches "mì", "mua"…).

**Build note**: `expo-speech-recognition` is a native module — requires a dev client build, not Expo Go.
```bash
npm run prebuild       # regenerate native code after adding the plugin
npm run build:android  # local EAS build
```
Both commands set `JAVA_HOME` (Java 21) and `ANDROID_HOME` automatically.

### Types & Utilities

TypeScript types are in `src/types/`. Utility helpers:
- `src/utils/date.ts` — date formatting (`formatDateForDisplay`, etc.)
- `src/utils/currency.ts` — currency formatting
- `src/i18n/` — i18next setup with locale files in `src/i18n/locales/`
- `src/hooks/useAppTheme.ts` — theme access hook

### Key Patterns

- All screens consume Zustand store hooks; they don't call services directly.
- React Query client (5-min stale time) is configured in `App.tsx` but most data fetching happens through Zustand store actions rather than `useQuery` hooks.
- Supabase storage for receipts uses signed URLs for private files.
- `softwareKeyboardLayoutMode: "resize"` is set in `app.json` for Android keyboard handling.
