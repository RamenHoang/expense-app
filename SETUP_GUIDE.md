# 🚀 Setup Guide - Personal Expense App

## ✅ Completed Setup (Tasks 1-5)

### What's Been Done:
1. ✅ **React Native Expo Project** - TypeScript template initialized
2. ✅ **Dependencies Installed:**
   - @supabase/supabase-js (Backend)
   - @react-navigation (Navigation)
   - @tanstack/react-query (Data fetching)
   - zustand (State management)
   - react-native-paper (Material UI)
   - @expo/vector-icons (Icons)
   - expo-image-picker, expo-file-system (File handling)

3. ✅ **Navigation Structure:**
   - Root Navigator (Auth/Main switch)
   - Auth Stack (Login, Register, Forgot Password)
   - Main Tab Navigator (Dashboard, Transactions, Budget, Settings)

4. ✅ **Folder Structure:**
   ```
   src/
   ├── config/          ✅ Supabase & theme config
   ├── features/        ✅ Auth, Dashboard, Transactions, Budget, Settings
   ├── navigation/      ✅ Navigators configured
   ├── store/           ✅ Auth store (Zustand)
   ├── types/           ✅ Navigation types
   ├── components/      📁 (ready for shared components)
   ├── hooks/           📁 (ready for custom hooks)
   ├── services/        📁 (ready for API services)
   └── utils/           📁 (ready for utilities)
   ```

5. ✅ **Placeholder Screens Created:**
   - Login, Register, Forgot Password
   - Dashboard, Transactions, Budget, Settings

---

## 🔜 Next Steps (Tasks 6-10)

### 1. Create Supabase Project

Go to [supabase.com](https://supabase.com) and:
1. Sign up / Login
2. Create new project
3. Set project name: `personal-expense-app`
4. Set strong database password
5. Choose region (closest to you)

### 2. Get Supabase Credentials

After project is ready:
1. Go to **Settings** → **API**
2. Copy:
   - Project URL
   - `anon` public key

### 3. Configure Environment

Create `.env` file in `expense-app/` directory:
```bash
cd expense-app
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Create Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(15, 2) NOT NULL,
  note TEXT,
  transaction_date DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id, month, year)
);

-- Indexes for performance
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
```

### 5. Set Up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);
```

### 6. Set Up Storage Bucket

In Supabase Dashboard:
1. Go to **Storage**
2. Create new bucket: `receipts`
3. Make it **private**
4. Set up policy:

```sql
-- Allow users to upload their own receipts
CREATE POLICY "Users can upload own receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view own receipts
CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 7. Seed Default Categories (Optional)

```sql
-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (user_id, name, type, icon, color) VALUES
    -- Income categories
    (NEW.id, 'Salary', 'income', 'cash', '#4CAF50'),
    (NEW.id, 'Freelance', 'income', 'laptop', '#8BC34A'),
    (NEW.id, 'Investment', 'income', 'chart-line', '#00BCD4'),
    
    -- Expense categories
    (NEW.id, 'Food & Dining', 'expense', 'food', '#FF5722'),
    (NEW.id, 'Transportation', 'expense', 'car', '#FF9800'),
    (NEW.id, 'Shopping', 'expense', 'shopping', '#E91E63'),
    (NEW.id, 'Entertainment', 'expense', 'movie', '#9C27B0'),
    (NEW.id, 'Bills & Utilities', 'expense', 'file-document', '#F44336'),
    (NEW.id, 'Healthcare', 'expense', 'hospital', '#03A9F4'),
    (NEW.id, 'Education', 'expense', 'school', '#3F51B5'),
    (NEW.id, 'Others', 'expense', 'dots-horizontal', '#607D8B');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create categories on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_categories();
```

---

## 🧪 Test the Setup

1. **Start the app:**
   ```bash
   cd expense-app
   npm start
   ```

2. **Test navigation:**
   - Should show Login screen (no user authenticated)
   - Navigation structure is ready

3. **Next: Build Auth UI** (Tasks 11-17)

---

## 📝 Progress

**Completed:** Tasks 1-5 (Setup & Infrastructure) ✅  
**Current:** Tasks 6-10 (Database & Backend)  
**Next:** Tasks 11-17 (Authentication Module)

