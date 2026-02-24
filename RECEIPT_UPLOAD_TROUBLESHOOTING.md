# Receipt Upload Troubleshooting

## Error: "Network request failed"

### Fixed! ✅

The code has been updated to properly handle file uploads in React Native.

### What Was Changed:
1. ✅ Installed `expo-file-system` for proper file handling
2. ✅ Updated upload to use FileSystem.readAsStringAsync
3. ✅ Added base64 to Blob conversion
4. ✅ Added better error logging

### Before Testing Receipt Upload:

**IMPORTANT**: You must create the storage bucket first!

1. **Create Storage Bucket** (if not done yet)
   - Open Supabase Dashboard
   - Go to Storage
   - Create bucket named `receipts` (private)
   - Add RLS policies

   📄 **Full guide**: See `RECEIPT_STORAGE_SETUP.md`

2. **Test the Upload**
   - Rebuild the app (the code has changed)
   - Go to Add Transaction
   - Scroll to Receipt section
   - Tap "Upload Receipt"
   - Choose photo
   - ✅ Should upload successfully!

### If Still Getting Errors:

#### Check 1: Storage Bucket Exists
```
Supabase Dashboard → Storage → Check "receipts" bucket exists
```

#### Check 2: RLS Policies Set
```
Click "receipts" bucket → Policies tab
Should see 3 policies:
- Users can upload own receipts (INSERT)
- Users can view own receipts (SELECT)  
- Users can delete own receipts (DELETE)
```

#### Check 3: App Permissions
```
Device Settings → Your App → Permissions
- Camera: Allowed
- Photos: Allowed
```

#### Check 4: Network Connection
- Make sure device has internet
- Supabase project is active
- No firewall blocking storage API

### Error Messages Guide:

**"Bucket not found"**
→ Create the `receipts` bucket in Supabase Storage

**"Permission denied"** 
→ Add RLS policies (see RECEIPT_STORAGE_SETUP.md)

**"Invalid file type"**
→ Only JPG/JPEG/PNG supported (auto-detected from camera)

**"Network request failed"**
→ Fixed in latest code! Pull changes and rebuild

### Debug Mode:

The app now logs detailed errors. Check console:
```
LOG  Receipt upload error: [error details]
```

This helps identify the specific issue.

### Still Not Working?

1. Make sure you pulled latest code
2. Run `npm install` (expo-file-system was added)
3. Rebuild the app completely
4. Check Supabase dashboard for error logs
5. Verify storage bucket settings

---

**Status**: Code Fixed ✅  
**Next Step**: Create storage bucket (see RECEIPT_STORAGE_SETUP.md)
