# 📱 Android Setup Guide - Two Options

You have two ways to run the app on Android. Choose based on your needs:

---

## ✅ **OPTION 1: Expo Go (Recommended for Now)**

**Best for:**
- ✅ Quick testing
- ✅ Rapid development
- ✅ No build time needed
- ✅ Works immediately

### Steps:

1. **Install Expo Go on your phone:**
   - Open Google Play Store
   - Search for "Expo Go"
   - Install the app

2. **Make sure phone and computer are on same WiFi**

3. **Start the dev server:**
   ```bash
   cd /Users/er_macbook_185/Projects/pfm/expense-app
   npm start
   ```

4. **Connect your phone:**
   - Open Expo Go app
   - Tap "Scan QR code"
   - Scan the QR code from your terminal
   - App loads instantly! 🚀

### ✅ Advantages:
- No build process
- Updates instantly on code changes
- Works for 95% of development

### ⚠️ Limitations:
- Can't use custom native modules (we don't need them yet)
- Requires Expo Go app installed

---

## 🔧 **OPTION 2: Development Build (Advanced)**

**Best for:**
- Production-ready testing
- Custom native modules
- Standalone app testing

### Prerequisites:
- Android Studio installed
- Android SDK configured
- `ANDROID_HOME` environment variable set

### Steps:

**1. Install development client (already done):**
```bash
npx expo install expo-dev-client
```

**2. Build the development app:**

**Option A: Build locally (requires Android Studio)**
```bash
npm run android
```

This will:
- Generate Android project files
- Build the APK
- Install on connected device/emulator

**Option B: Build with EAS (cloud build, easier)**
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project
eas build:configure

# Build for Android
eas build --platform android --profile development

# Install the APK on your device when done
```

**3. Run the app:**
```bash
npm start --dev-client
```

Then press `a` for Android.

---

## 🎯 **Which Option Should You Choose?**

| Scenario | Recommended Option |
|----------|-------------------|
| Just starting development | **Option 1: Expo Go** |
| Testing UI and features | **Option 1: Expo Go** |
| Need to test on physical device quickly | **Option 1: Expo Go** |
| Need custom native code | **Option 2: Development Build** |
| Preparing for production | **Option 2: Development Build** |

---

## 🚀 **Quick Fix for Your Current Issue:**

**Right now, use Expo Go:**

```bash
cd /Users/er_macbook_185/Projects/pfm/expense-app
npm start
```

Then:
1. Press `r` to reload
2. Open Expo Go app on your phone
3. Scan QR code
4. ✅ App runs!

**OR** test on web (fastest):
```bash
npm start
# Press 'w' for web
```

---

## 🔍 **Troubleshooting:**

### Issue: "Unable to connect to Metro"
**Fix:** Make sure phone and computer are on the same WiFi network.

### Issue: "Expo Go app crashes"
**Fix:** 
```bash
# Clear cache and restart
npm start -- --clear
```

### Issue: "QR code won't scan"
**Fix:** 
- Type the URL manually in Expo Go
- URL shown in terminal: `exp://192.168.x.x:8081`

### Issue: Want to use development build but getting errors
**Fix:**
- Make sure Android Studio is installed
- Set up Android SDK properly
- Or use EAS cloud build instead

---

## 💡 **Recommended Path:**

1. **Now**: Use Expo Go to test (5 seconds to start)
2. **Later**: When you need custom native features, build development build
3. **Production**: Use EAS Build for final APK

---

## 📚 **More Resources:**

- **Expo Go**: https://expo.dev/go
- **Development Builds**: https://docs.expo.dev/develop/development-builds/introduction/
- **EAS Build**: https://docs.expo.dev/build/introduction/

---

**TL;DR**: Just use Expo Go app for now! It's the fastest way to test. 🚀

