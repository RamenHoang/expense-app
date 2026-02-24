# Receipt Upload Storage Setup

## Issue
Receipt upload fails because the Supabase Storage bucket doesn't exist.

## Solution - Create Storage Bucket

### Step 1: Open Supabase Storage
1. Go to https://supabase.com
2. Open your project
3. Click **"Storage"** in the left sidebar

### Step 2: Create Receipts Bucket
1. Click **"+ New bucket"**
2. **Name**: `receipts`
3. **Public bucket**: Toggle OFF (keep it private)
4. Click **"Create bucket"**

### Step 3: Set Up Storage Policies
1. Click on the **`receipts`** bucket
2. Click **"Policies"** tab
3. Click **"+ New Policy"**

#### Policy 1: Users can upload own receipts
- **Policy name**: `Users can upload own receipts`
- **Allowed operations**: INSERT
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
```

Click **"Review"** → **"Save policy"**

#### Policy 2: Users can view own receipts
- **Policy name**: `Users can view own receipts`
- **Allowed operations**: SELECT
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
```

Click **"Review"** → **"Save policy"**

#### Policy 3: Users can delete own receipts
- **Policy name**: `Users can delete own receipts`
- **Allowed operations**: DELETE
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
```

Click **"Review"** → **"Save policy"**

### Step 4: Verify Setup
1. Go to **Storage** → **receipts** bucket
2. Click **"Policies"** tab
3. You should see 3 policies:
   - ✅ Users can upload own receipts (INSERT)
   - ✅ Users can view own receipts (SELECT)
   - ✅ Users can delete own receipts (DELETE)

### Step 5: Test Upload
1. Open the app
2. Go to **Transactions** tab
3. Tap **"+ Add Transaction"**
4. Fill in the details
5. Scroll down to **Receipt** section
6. Tap **"Upload Receipt"**
7. Choose **"Take Photo"** or **"Choose from Gallery"**
8. ✅ Photo should upload successfully!

## Alternative: SQL Script Method

If you prefer SQL, you can also run this in **SQL Editor**:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false);

-- Policy 1: Upload
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: View
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Delete
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## How It Works

Files are organized by user:
```
receipts/
  └── {user_id}/
      └── {transaction_id}/
          └── receipt_1234567890.jpg
```

Each user can only access their own receipts - enforced by RLS policies.

## Troubleshooting

### Error: "Bucket not found"
- Make sure you created the `receipts` bucket exactly
- Check spelling is correct

### Error: "Permission denied"
- Verify all 3 policies are created
- Check policies are for `authenticated` role
- Ensure bucket is created with `public = false`

### Error: "Invalid file type"
- App accepts: JPG, JPEG, PNG
- Camera photos should work automatically

## Testing

After setup, test by:
1. Adding a transaction
2. Taking a photo for receipt
3. Saving the transaction
4. Viewing the transaction details
5. ✅ Receipt image should display

---

**Setup Time**: ~5 minutes  
**Status**: Required for receipt uploads to work
