# Budget Table Migration Guide

## Issue
The budgets table schema in the database doesn't match the app implementation.

**Database has:** `month`, `year` columns  
**App expects:** `period`, `start_date`, `end_date` columns

## Solution

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com
2. Open your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run Migration Script
1. Click **"+ New query"**
2. Copy the entire content from `budget_table_migration.sql`
3. Paste it into the SQL Editor
4. Click **"Run"** (or press Cmd+Enter)
5. ✅ You should see: **"Success. No rows returned"**

### Step 3: Verify Table Structure
1. Click **"Table Editor"** in left sidebar
2. Click on **"budgets"** table
3. Verify columns:
   - ✅ id (uuid)
   - ✅ user_id (uuid)
   - ✅ category_id (uuid)
   - ✅ amount (numeric)
   - ✅ period (text) - NEW!
   - ✅ start_date (date) - NEW!
   - ✅ end_date (date) - NEW!
   - ✅ created_at (timestamp)
   - ✅ updated_at (timestamp)

### Step 4: Test Budget Creation
1. Open the app
2. Go to Budget tab
3. Tap "Add Budget" FAB button
4. Select a category
5. Enter an amount
6. Choose period (Monthly/Yearly)
7. Tap "Set Budget"
8. ✅ Should save successfully!

## What the Migration Does

1. **Drops old table** - Removes the old budgets table with wrong schema
2. **Creates new table** - Creates budgets table with correct columns:
   - `period` - 'monthly' or 'yearly'
   - `start_date` - Budget start date
   - `end_date` - Optional budget end date
3. **Adds constraints** - Ensures data integrity
4. **Creates indexes** - For better query performance
5. **Enables RLS** - Row Level Security policies
6. **Sets up triggers** - Auto-update `updated_at` timestamp

## Notes

⚠️ **Warning:** This will delete any existing budget data. If you have important data, backup first.

✅ After running this migration, budget saving will work correctly!
