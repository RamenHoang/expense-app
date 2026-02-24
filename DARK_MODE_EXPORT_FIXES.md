# Dark Mode & Export Fixes

**Date**: 2026-02-24  
**Issues Fixed**: Dark mode colors & UTF-8 export errors

---

## 🌙 Dark Mode Improvements

### Problem
Dark mode had poor contrast and was hard to read.

### Solution
Updated to proper Material Design 3 color schemes with better contrast.

### New Colors

**Light Theme:**
```
Background: #ffffff (clean white)
Surface: #ffffff
Primary: #6200ee (vivid purple)
Text: #1c1b1f (dark gray)
```

**Dark Theme:**
```
Background: #1c1b1f (proper dark, not pure black)
Surface: #1c1b1f (consistent)
SurfaceVariant: #2b2930 (elevated cards)
Primary: #d0bcff (light purple)
Text: #e6e1e5 (high contrast white)
OnSurfaceVariant: #cac4d0 (secondary text)
```

### Changes Made:
1. ✅ Updated theme.ts with MD3 colors
2. ✅ Removed hardcoded colors from Settings
3. ✅ Created useAppTheme hook
4. ✅ Better text contrast
5. ✅ Proper surface elevation

### Before vs After:
- **Before**: Muddy grays, poor contrast
- **After**: Clear, readable, proper MD3 design

---

## 📤 Export UTF-8 Fixes

### Problem
Export failed with UTF-8 encoding error:
```
Error: Method readAsStringAsync imported from "expo-file-system" is deprecated
```

### Solution
Fixed deprecated API and improved CSV encoding.

### Changes Made:

1. **Fixed Encoding API**
   ```typescript
   // Before (deprecated)
   encoding: FileSystem.EncodingType.UTF8
   
   // After (correct)
   encoding: 'utf8'
   ```

2. **Added BOM for Excel**
   ```typescript
   const csv = '\uFEFF' + csvContent  // UTF-8 BOM
   ```

3. **Proper CSV Escaping**
   ```typescript
   const escapeCSV = (value) => {
     if (contains comma, quote, or newline)
       return `"${value.replace(/"/g, '""')}"`
     return value
   }
   ```

4. **Better Error Logging**
   - Console logs for debugging
   - Detailed error messages

5. **Added UTI for iOS**
   ```typescript
   UTI: 'public.comma-separated-values-text'
   ```

### Now Supports:
- ✅ UTF-8 characters (Vietnamese, Chinese, etc.)
- ✅ Special characters in notes
- ✅ Excel/Google Sheets compatibility
- ✅ Proper quote escaping
- ✅ Multi-line notes

---

## 🎨 useAppTheme Hook

Created new hook for theme-aware styling:

```typescript
import { useAppTheme } from '../hooks/useAppTheme';

const MyComponent = () => {
  const theme = useAppTheme();
  
  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ color: theme.text }}>Hello</Text>
    </View>
  );
};
```

### Available Colors:
- `theme.background` - Screen background
- `theme.surface` - Card background
- `theme.surfaceVariant` - Elevated cards
- `theme.primary` - Primary color
- `theme.text` - Main text
- `theme.textSecondary` - Secondary text
- `theme.income` - Green for income
- `theme.expense` - Red for expense
- `theme.warning` - Orange for warnings

---

## ✅ Testing

### Dark Mode
1. Go to Settings
2. Toggle Dark Mode
3. Check all screens:
   - ✅ Dashboard (readable)
   - ✅ Transactions (good contrast)
   - ✅ Budget (visible progress bars)
   - ✅ Settings (clean look)

### Export
1. Go to Settings → Export Data
2. Choose JSON or CSV
3. Test with:
   - ✅ Vietnamese characters (₫ 50,000)
   - ✅ Special notes ("Test, with quotes")
   - ✅ Multi-line notes
4. Open in Excel/Google Sheets
5. ✅ All characters display correctly

---

## 📝 Future Improvements

**Dark Mode:**
- [ ] Update more screens to use useAppTheme
- [ ] Add custom dark mode for charts
- [ ] Smooth theme transition animation

**Export:**
- [ ] Export all data as ZIP file
- [ ] Include receipts in export
- [ ] Import data feature

---

**Status**: Both issues fixed ✅  
**Ready**: For testing with real data
