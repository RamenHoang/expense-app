# 📱 Personal Expense Management App

A React Native expense tracking app built with Expo and Supabase.

## 🚀 Tech Stack

- **Frontend:** React Native (Expo)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **UI Library:** React Native Paper (Material Design)
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Navigation:** React Navigation

## 📁 Project Structure

```
src/
├── features/          # Feature modules (auth, transactions, dashboard, etc.)
├── components/        # Reusable components
├── hooks/            # Custom React hooks
├── services/         # API services (Supabase queries)
├── utils/            # Utility functions
├── types/            # TypeScript types/interfaces
├── navigation/       # Navigation configuration
├── store/            # Zustand stores
├── config/           # App configuration
└── assets/           # Images, fonts, etc.
```

## 🛠️ Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key

3. **Run the app:**
   ```bash
   npm start
   # or
   npm run android
   npm run ios
   ```

## 📋 Development Status

See [TASK_PLAN.md](../TASK_PLAN.md) for detailed task tracking.

## 🔐 Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

