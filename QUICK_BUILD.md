# Quick Build Instructions - Keyboard Fix Applied

## ✅ CMake Cache Cleaned!

The CMake build cache has been cleared. You can now build directly.

## 🚀 Build Now

### Option 1: Use your normal command (RECOMMENDED)
```bash
eas build --profile=preview --platform=android --local --output ./dist/expense-app-1.0.0.apk
```

### Option 2: Use the build script
```bash
./build-eas.sh
```

## ⚠️ Important Notes

1. **Cache is already cleaned** - No need to run gradlew clean again
2. **Just build directly** with EAS
3. **After installing** the new APK, test the keyboard

## 🔍 What Was Cleaned

- ✅ CMake cache (`.cxx` folders)
- ✅ Gradle build cache
- ✅ Expo cache
- ✅ Node modules cache
- ✅ React Native module build artifacts

## 📱 After Build - Installation

```bash
# Uninstall old app
adb uninstall com.expenseapp.personalfinance

# Install new APK
adb install ./dist/expense-app-1.0.0.apk
```

## ✅ Test Keyboard

1. Open app
2. Tap search box ("Tìm kiếm")
3. **Expected:** Search box moves up, visible above keyboard
4. Add transaction
5. **Expected:** Input fields stay above keyboard

## 🎯 The keyboard fix is applied!

All keyboard fix changes are in place:
- ✅ Edge-to-edge disabled
- ✅ MainActivity configured
- ✅ AndroidManifest updated
- ✅ Gradle properties set

Just build and test!
