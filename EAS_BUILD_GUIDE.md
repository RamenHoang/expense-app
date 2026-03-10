# EAS Build Guide - Keyboard Fix Applied

## Building with EAS Build (Your Current Method)

You're using EAS Build to create your APK. This is the correct approach for Expo projects.

## ⚠️ CRITICAL: Clean Build Required

EAS Build caches configurations. You **MUST** clean the cache before building, or the keyboard fix won't be applied.

## 🚀 Build Commands (Choose One)

### Option 1: Use the Build Script (RECOMMENDED)
```bash
./build-eas.sh
```

This script:
- ✅ Cleans Android build cache
- ✅ Clears EAS cache
- ✅ Verifies all keyboard fix settings
- ✅ Builds with EAS
- ✅ Shows installation instructions

### Option 2: Manual Clean + Build
```bash
# Step 1: Clean Android cache
cd android
./gradlew clean
cd ..

# Step 2: Clear EAS cache
rm -rf .expo
rm -rf node_modules/.cache

# Step 3: Build with EAS
eas build --profile=preview --platform=android --local --output ./dist/expense-app.apk
```

### Option 3: Use npm script
```bash
# Clean first
npm run build:clean

# Then build
npm run build:eas
```

## 📋 Pre-Build Verification

Before building, verify the keyboard fix is in place:

```bash
# Check gradle.properties
grep "edgeToEdgeEnabled" android/gradle.properties
# Should show: edgeToEdgeEnabled=false

# Check MainActivity
grep "setDecorFitsSystemWindows" android/app/src/main/java/com/expenseapp/personalfinance/MainActivity.kt
# Should show: WindowCompat.setDecorFitsSystemWindows(window, true)

# Check AndroidManifest
grep "windowSoftInputMode" android/app/src/main/AndroidManifest.xml
# Should show: adjustResize|stateHidden
```

## 📱 Installation & Testing

### Step 1: Uninstall Old App
```bash
# Via ADB
adb uninstall com.expenseapp.personalfinance

# Or manually on device:
# Settings → Apps → Ví Đau Khổ → Uninstall
```

### Step 2: Install New APK
```bash
# Via ADB
adb install ./dist/expense-app-1.0.0.apk

# Or manually:
# Transfer APK to device and tap to install
```

### Step 3: Clear App Data (Optional but Recommended)
```bash
# Via ADB
adb shell pm clear com.expenseapp.personalfinance

# Or manually:
# Settings → Apps → Ví Đau Khổ → Storage → Clear Data
```

### Step 4: Test Keyboard Behavior

Test these specific scenarios:

#### ✅ Test 1: Search Box
1. Open app
2. Go to Transactions screen
3. Tap "Tìm kiếm" (search box)
4. **Expected:** Search box visible above keyboard
5. **Expected:** Bottom navigation visible or moved up

#### ✅ Test 2: Add Transaction
1. Tap the "+" button (FAB)
2. Tap amount field
3. **Expected:** Amount field visible above keyboard
4. Tap note field
5. **Expected:** Note field visible, can scroll if needed
6. **Expected:** Save button accessible

#### ✅ Test 3: Edit Transaction
1. Tap any transaction to edit
2. Tap note field
3. **Expected:** Keyboard doesn't cover the note field
4. **Expected:** Can see what you're typing

## 🔧 Troubleshooting

### Issue: Keyboard still covers UI after rebuild

**Cause:** Build cache not cleared properly

**Solution:**
```bash
# Full cache clear
cd android
./gradlew clean
./gradlew cleanBuildCache
cd ..

# Clear Expo cache
rm -rf .expo
rm -rf node_modules/.cache
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*

# Clear EAS build cache
eas build:cancel --all  # Cancel any running builds
rm -rf ~/Library/Caches/eas-cli

# Rebuild
./build-eas.sh
```

### Issue: EAS build fails

**Check:**
1. Are you logged into EAS? `eas login`
2. Is the project configured? `eas build:configure`
3. Try updating EAS CLI: `npm install -g eas-cli`

### Issue: Build succeeds but keyboard still overlaps

**Verify the fix is actually in the APK:**

1. **Check if you cleaned before building**
   ```bash
   # You MUST see "clean" in the build log
   # If not, the cache wasn't cleared
   ```

2. **Completely uninstall old app**
   ```bash
   adb uninstall com.expenseapp.personalfinance
   # Then install new APK
   ```

3. **Check Android version**
   ```bash
   adb shell getprop ro.build.version.sdk
   # Should be 30+ (Android 11+)
   ```

## 📊 Build Output

After successful build, you should see:

```
✅ Build completed successfully!

📱 APK Location: ./dist/expense-app-1.0.0.apk

Size: ~XX MB
```

## 🔄 Version Management

Update version before building:

```json
// package.json
{
  "version": "1.0.1"  // Increment this
}
```

The build script will use this version in the APK filename.

## ⚙️ EAS Configuration

Your `eas.json` is configured for local builds:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    }
  }
}
```

This ensures:
- ✅ APK output (not AAB)
- ✅ Release build with optimizations
- ✅ Local build (no cloud upload)

## 📝 Important Notes

### Why Clean Build is Critical for EAS

1. **Gradle cache:** Contains compiled edge-to-edge code
2. **EAS cache:** May reuse previous build artifacts
3. **Metro cache:** May bundle old JavaScript
4. **Expo cache:** May contain old configuration

All must be cleared for the keyboard fix to apply.

### What Gets Fixed

The keyboard fix modifies:
- **Native Android code** (MainActivity.kt)
- **Build configuration** (gradle.properties)
- **Manifest settings** (AndroidManifest.xml)
- **Theme resources** (styles.xml)

These are baked into the APK during build, so you MUST rebuild with clean cache.

## 🎯 Quick Reference

```bash
# Full clean build workflow
./build-eas.sh

# Or manually:
cd android && ./gradlew clean && cd ..
rm -rf .expo node_modules/.cache
eas build --profile=preview --platform=android --local --output ./dist/expense-app.apk

# Install
adb uninstall com.expenseapp.personalfinance
adb install ./dist/expense-app.apk
```

## ✅ Success Checklist

After building and installing:

- [ ] Build completed without errors
- [ ] APK installed successfully
- [ ] Search box moves up when tapped
- [ ] Add transaction form fully accessible
- [ ] Edit transaction note field visible
- [ ] Bottom navigation doesn't get covered
- [ ] All input fields work correctly

## 🆘 Still Having Issues?

If keyboard still covers UI after following all steps:

1. **Take a screenshot** showing the issue
2. **Check build log** for any warnings about edge-to-edge
3. **Verify settings:**
   ```bash
   # These should all return results:
   grep "edgeToEdgeEnabled=false" android/gradle.properties
   grep "setDecorFitsSystemWindows" android/app/src/main/java/com/expenseapp/personalfinance/MainActivity.kt
   grep "adjustResize" android/app/src/main/AndroidManifest.xml
   ```

4. **Try a production build instead of preview:**
   ```bash
   eas build --profile=production --platform=android --local
   ```

## 📚 Related Documentation

- [EAS Build Local](https://docs.expo.dev/build/setup/)
- [Expo Keyboard Handling](https://docs.expo.dev/develop/user-interface/safe-areas/)
- [Android Window Insets](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
