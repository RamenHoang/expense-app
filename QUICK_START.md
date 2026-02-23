# 🚀 Quick Start - Running Your App

## ✅ **Your App is Now Fixed and Ready!**

---

## 📱 **How to Run the App:**

### **1. Start the Development Server**

```bash
cd /Users/er_macbook_185/Projects/pfm/expense-app
npm start
```

This starts the server in **Expo Go mode** (no build required).

---

### **2. Choose How to View:**

#### **Option A: On Your Phone (Recommended)**

1. Install **Expo Go** from Google Play Store
2. Make sure phone and computer are on **same WiFi**
3. Open Expo Go app
4. Tap **"Scan QR code"**
5. Scan the QR code from your terminal
6. ✅ App loads!

#### **Option B: In Web Browser (Fastest)**

- With server running, press **`w`**
- App opens in Chrome/Safari instantly!

#### **Option C: Android Emulator**

- Make sure Android Studio emulator is running
- Press **`a`** in terminal
- App opens in emulator

---

## 📋 **Available Commands:**

```bash
# Start server (Expo Go mode)
npm start

# Start and open web browser
npm run web

# Start and open on Android device
npm run android

# Start for development build (advanced)
npm run start:dev
```

---

## 🎯 **What You'll See:**

When the app loads, you'll see the **Login screen**.

Right now it's just UI - you can't login yet because we haven't set up Supabase backend.

**Next steps:**
1. ✅ App is running
2. ⏳ Set up Supabase (follow SUPABASE_SETUP_GUIDE.md)
3. ⏳ Test login/register functionality

---

## 🔧 **Useful Keyboard Shortcuts:**

While dev server is running:

- **`r`** - Reload app
- **`w`** - Open web
- **`a`** - Open Android
- **`j`** - Open debugger
- **`m`** - Toggle menu
- **`?`** - Show all commands
- **`Ctrl+C`** - Stop server

---

## ⚠️ **Troubleshooting:**

### Can't connect on phone?
- Make sure phone and computer are on **same WiFi**
- Some corporate/school WiFi blocks device communication

### QR code won't scan?
- Type the URL manually in Expo Go
- URL format: `exp://192.168.x.x:8081`

### App crashes on open?
```bash
npm start -- --clear
```

### Want to use development build instead?
```bash
npm run start:dev
```
But you'll need to build the app first (see ANDROID_SETUP.md)

---

## ✅ **You're All Set!**

The app is running! Continue with:
- **SUPABASE_SETUP_GUIDE.md** - Set up backend
- **TASK_PLAN.md** - See what's next

---

**Pro Tip:** Keep the dev server running while you code. It auto-reloads on file changes! 🔥

