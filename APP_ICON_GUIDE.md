# App Icon & Splash Screen Setup Guide

## Task 79: Add App Icon and Splash Screen

### Current Status
The app currently uses default Expo icons. Let's create professional app icons.

### App Icon Design

**Theme**: Personal Finance Management  
**Colors**: 
- Primary: #6200ee (Purple)
- Accent: #4caf50 (Green - money)
- Background: White/Gradient

**Icon Concept**: 
- Wallet or money symbol
- Simple and recognizable
- Works well at small sizes

### Step 1: Create App Icon

#### Option A: Use Online Tool (Recommended)
1. Go to https://www.appicon.co or https://icon.kitchen
2. Upload a 1024x1024 icon design
3. Select "Expo/React Native"
4. Download the generated assets
5. Replace files in `assets/` folder

#### Option B: Use Figma/Sketch
1. Create 1024x1024 design
2. Export as PNG
3. Use `expo-icon-generator`:
   ```bash
   npx expo-generate-icons --icon ./assets/app-icon.png
   ```

### Step 2: Icon Sizes Required

```
assets/
  ├── icon.png          # 1024x1024 (App icon)
  ├── adaptive-icon.png # 1024x1024 (Android adaptive)
  ├── favicon.png       # 48x48 (Web)
  └── splash-icon.png   # 1284x2778 (Splash screen)
```

### Step 3: Update app.json

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#6200ee"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

### Step 4: Create Splash Screen

**Splash Screen Design:**
- App logo/icon in center
- App name: "Personal Finance"
- Tagline: "Manage your money with ease"
- Background color: #6200ee or gradient
- Size: 1284x2778 (iPhone 13 Pro Max)

### Design Specifications

#### App Icon
- **Size**: 1024x1024px
- **Format**: PNG with transparency
- **Safe Area**: Keep important content within 90% center
- **No Text**: Icons work better without text at small sizes

#### Splash Screen
- **Size**: 1284x2778px (or any resolution with 9:19.5 ratio)
- **Format**: PNG
- **Elements**:
  - Centered logo (256x256 or larger)
  - App name below logo
  - Background color matching brand

### Simple DIY Icon (If no designer available)

1. **Background**: Purple circle (#6200ee)
2. **Symbol**: White wallet icon or dollar sign
3. **Border**: Optional white ring

### Quick Setup (Temporary)

For now, we can use the default icons and update them later with professional designs.

### Recommended Tools

**Free Icon Creators:**
- [Canva](https://www.canva.com) - Templates for app icons
- [Figma](https://www.figma.com) - Professional design tool
- [AppIcon.co](https://www.appicon.co) - Auto-generate all sizes

**Icon Generator:**
```bash
npm install -g expo-icon-generator
expo-generate-icons --icon ./design/icon.png
```

### Color Palette (For Designer)

```
Primary Purple: #6200ee
Green (Money):  #4caf50  
Red (Expense):  #f44336
White:          #ffffff
Background:     #f5f5f5
```

### After Creating Icons

1. Replace files in `assets/` folder
2. Run `expo prebuild --clean` if using EAS
3. Test on device to verify icons appear correctly

### Notes

- Icons should work well in both light and dark themes
- Android adaptive icons need foreground + background
- iOS icons are automatically rounded
- Keep designs simple for better recognition

---

**Status**: Guide created  
**Action Needed**: Create icon designs or hire designer  
**Timeline**: Can be done in parallel with development
