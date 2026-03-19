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

Key features: transactions (with receipt photo upload via Expo Image Picker + Supabase Storage), categories (custom icons & colors), budgets (per-category), family sharing, dashboard analytics (react-native-chart-kit), data export (CSV/JSON), onboarding, dark mode, i18n (English + Vietnamese via i18next).

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
