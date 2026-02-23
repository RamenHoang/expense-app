# Supabase Setup - SQL Scripts

This folder contains SQL scripts to set up your Supabase database.

## 📁 Files

1. **01-schema.sql** - Creates all database tables
2. **02-rls-policies.sql** - Sets up Row Level Security policies
3. **03-seed-categories.sql** - Auto-creates default categories for new users

## 🚀 How to Use

### Method 1: Copy & Paste (Recommended)
1. Open Supabase Dashboard → SQL Editor
2. Click "New query"
3. Open `01-schema.sql` in your text editor
4. Copy the entire content
5. Paste into Supabase SQL Editor
6. Click "Run"
7. Repeat for `02-rls-policies.sql` and `03-seed-categories.sql`

### Method 2: Run in Order
Run each file in order:
1. First: `01-schema.sql` (creates tables)
2. Second: `02-rls-policies.sql` (secures data)
3. Third: `03-seed-categories.sql` (adds default categories)

## ✅ Verification

After running all scripts, verify:
- [ ] 4 tables exist in Table Editor
- [ ] All tables have 🔒 RLS enabled
- [ ] Function `create_default_categories` exists
- [ ] Trigger `on_auth_user_created` exists

## 🆘 Troubleshooting

**Error: "relation already exists"**
- You've already created the tables
- Skip to the next script

**Error: "permission denied"**
- Make sure you're running in Supabase SQL Editor
- Check you're logged into the correct project

**Tables created but no RLS badge**
- Refresh the Table Editor page
- Run `02-rls-policies.sql` again

## 📝 Notes

- These scripts are safe to run in development
- For production, consider using Supabase migrations
- Don't modify these files unless you know what you're doing
