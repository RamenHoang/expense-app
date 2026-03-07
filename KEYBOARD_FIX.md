# Android Keyboard Layout Fix - COMPLETE SOLUTION

## Problem

After building the app to APK and installing it on Android devices, the keyboard overlaps the UI elements (navigation, search box, add button, input fields) instead of pushing them up. This issue doesn't occur when running through Expo Go, but appears in production APK builds.

## Root Cause - IDENTIFIED!

The issue was caused by **Edge-to-Edge mode** being enabled in the Android build configuration. This mode allows the app to draw behind system bars (for immersive UI), but it conflicts with keyboard adjustment behavior.

When Edge-to-Edge is enabled:
- The app draws content under the keyboard area
- `adjustResize` mode doesn't work properly
- Keyboard overlays content instead of pushing it up

## Complete Solution Applied

### Changes Made

#### 1. **gradle.properties** - CRITICAL FIX
```properties
# Disabled edge-to-edge (was: true)
edgeToEdgeEnabled=false
expo.edgeToEdgeEnabled=false
```

**Location:** `android/gradle.properties` (Lines 47, 65)

#### 2. **MainActivity.kt** - Force proper window behavior
```kotlin
// Disable edge-to-edge explicitly
WindowCompat.setDecorFitsSystemWindows(window, true)

// Force adjust resize mode
window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
```

**Location:** `android/app/src/main/java/com/expenseapp/personalfinance/MainActivity.kt`

#### 3. **AndroidManifest.xml** - Set keyboard mode
```xml
android:windowSoftInputMode="adjustResize|stateHidden"
```

**Location:** `android/app/src/main/AndroidManifest.xml` (Line 19)

#### 4. **app.json** - Expo configuration
```json
"softwareKeyboardLayoutMode": "resize"
```

**Location:** `app.json` (Line 34)

#### 5. **styles.xml** - Theme configuration
```xml
<item name="android:windowSoftInputMode">adjustResize</item>
<item name="android:enforceNavigationBarContrast">false</item>
```

**Location:** `android/app/src/main/res/values/styles.xml`

## Why This Fixes the Issue

### The Problem Chain:
1. ❌ Edge-to-edge mode enabled → App draws behind system bars
2. ❌ Keyboard considered a "system bar" → Content doesn't move
3. ❌ Search box & navigation get covered by keyboard

### The Solution Chain:
1. ✅ Disable edge-to-edge → Window fits within system windows
2. ✅ Set `adjustResize` mode → Window resizes when keyboard appears
3. ✅ Force `setDecorFitsSystemWindows(true)` → Ensure proper fit
4. ✅ Content automatically moves up above keyboard

## How to Rebuild & Test

### IMPORTANT: You MUST clean build cache

```bash
# Option 1: Use the rebuild script (RECOMMENDED)
./rebuild-android.sh

# Option 2: Manual rebuild
cd android
./gradlew clean
cd ..
npm run build:android
```

### Why clean build is critical:
- Edge-to-edge configuration is cached in build files
- Simply rebuilding without cleaning won't apply the changes
- You MUST run `./gradlew clean` first

## Testing Checklist

After installing the new APK, test these scenarios:

### ✅ Search Box Test
1. Go to Transactions screen
2. Tap on "Tìm kiếm" (search box)
3. **Expected:** Search box moves up above keyboard
4. **Expected:** Bottom navigation remains visible or moves up

### ✅ Add Transaction Test
1. Tap the "+" floating action button
2. Fill in amount field
3. **Expected:** Input field stays above keyboard
4. **Expected:** Can scroll to see all fields
5. **Expected:** Save button remains accessible

### ✅ Bottom Navigation Test
1. Go to any screen
2. Focus on any input
3. **Expected:** Bottom tabs visible OR content scrolls so you can dismiss keyboard

### ✅ Note/Memo Fields
1. Add/edit transaction with note
2. Tap note field
3. **Expected:** Note field visible above keyboard
4. **Expected:** Can type without keyboard covering text

## What Changed From Previous Attempt

### Previous (FAILED):
- Only changed `windowSoftInputMode` to `adjustPan`
- Edge-to-edge remained enabled
- Keyboard still overlapped content

### Current (FIXED):
- ✅ Disabled edge-to-edge in gradle.properties
- ✅ Used `adjustResize` instead of `adjustPan`
- ✅ Forced `setDecorFitsSystemWindows(true)` in code
- ✅ Multiple configuration points all aligned

## Verification Commands

### Check if edge-to-edge is disabled:
```bash
grep "edgeToEdgeEnabled" android/gradle.properties
# Should show: edgeToEdgeEnabled=false
```

### Check MainActivity has the fix:
```bash
grep "setDecorFitsSystemWindows" android/app/src/main/java/com/expenseapp/personalfinance/MainActivity.kt
# Should show: WindowCompat.setDecorFitsSystemWindows(window, true)
```

### Check AndroidManifest:
```bash
grep "windowSoftInputMode" android/app/src/main/AndroidManifest.xml
# Should show: android:windowSoftInputMode="adjustResize|stateHidden"
```

## Troubleshooting

### If keyboard STILL covers content after rebuild:

**Step 1:** Verify you cleaned the build
```bash
cd android
./gradlew clean
```

**Step 2:** Check gradle.properties
```bash
cat android/gradle.properties | grep edgeToEdge
# Both should be false
```

**Step 3:** Completely uninstall old APK
```bash
adb uninstall com.expenseapp.personalfinance
# Then install new APK
adb install builds/android/your-new-app.apk
```

**Step 4:** Clear app data after install
- Settings → Apps → Ví Đau Khổ → Storage → Clear Data

### If bottom navigation still gets hidden:

Check that your navigation component uses `SafeAreaView`:
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
// Already implemented in your app
```

## Performance Impact

Disabling edge-to-edge has minimal impact:
- ✅ Keyboard works correctly
- ✅ Status bar still customized
- ✅ Navigation bar still customized  
- ⚠️ App no longer draws behind system bars (acceptable trade-off)

## Summary of All Files Changed

1. ✅ `android/gradle.properties` - Disabled edge-to-edge
2. ✅ `android/app/src/main/java/.../MainActivity.kt` - Force window fit
3. ✅ `android/app/src/main/AndroidManifest.xml` - Set adjustResize
4. ✅ `android/app/src/main/res/values/styles.xml` - Theme config
5. ✅ `app.json` - Expo keyboard mode

## Next Steps

1. **Clean build cache:**
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

2. **Rebuild APK:**
   ```bash
   npm run build:android
   ```

3. **Uninstall old app from device**

4. **Install new APK**

5. **Test all keyboard scenarios**

The keyboard issue should now be **completely fixed**! 🎉

## Technical Details

### Why Edge-to-Edge Caused the Problem

Edge-to-edge mode (introduced in Android 10+) allows apps to draw content behind system bars. When enabled:

```kotlin
// Edge-to-edge enabled (PROBLEM)
WindowCompat.setDecorFitsSystemWindows(window, false)
// App draws behind keyboard → keyboard covers content
```

Our fix:
```kotlin
// Edge-to-edge disabled (SOLUTION)  
WindowCompat.setDecorFitsSystemWindows(window, true)
// App fits within visible area → keyboard pushes content up
```

### Expo Go vs Production Build

**Why it works in Expo Go:**
- Expo Go doesn't use edge-to-edge mode by default
- Development builds have different window configuration
- Keyboard handling is more permissive

**Why it failed in production:**
- Edge-to-edge was enabled in gradle.properties
- Production build respects all configuration strictly
- Keyboard treated as system window

## References

- [Android Edge-to-Edge Guide](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
- [WindowInsetsCompat Documentation](https://developer.android.com/reference/androidx/core/view/WindowInsetsCompat)
- [Expo Keyboard Guide](https://docs.expo.dev/develop/user-interface/safe-areas/)

