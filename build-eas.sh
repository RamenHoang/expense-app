#!/bin/bash

# EAS Build Script with Keyboard Fix - Clean Build
# This script ensures a clean build with all keyboard fixes applied

echo "🔧 EAS Build - Keyboard Fix Applied"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if eas-cli is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing eas-cli..."
    npm install -g eas-cli
fi

# Step 1: Clean Android build cache (deep clean for CMake issues)
echo "🧹 Step 1: Deep cleaning Android build cache..."
if [ -d "android" ]; then
    echo "  Removing CMake and Gradle cache..."
    rm -rf android/app/.cxx
    rm -rf android/app/build
    rm -rf android/.gradle
    rm -rf android/build
    
    echo "  Running gradlew clean..."
    cd android
    ./gradlew clean 2>/dev/null || echo "  Note: gradlew clean had warnings (expected)"
    cd ..
    
    echo "✅ Deep clean complete"
else
    echo "⚠️  Android directory not found, skipping gradle clean"
fi
echo ""

# Step 2: Clear EAS and Expo build cache
echo "🗑️  Step 2: Clearing EAS and Expo build cache..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf node_modules/@react-native-async-storage/async-storage/android/build
rm -rf node_modules/react-native-screens/android/build
rm -rf node_modules/react-native-safe-area-context/android/build
echo "✅ Cache cleared"
echo ""

# Step 3: Verify keyboard fix settings
echo "🔍 Step 3: Verifying keyboard fix settings..."
echo ""

echo "Checking gradle.properties:"
if grep -q "edgeToEdgeEnabled=false" android/gradle.properties; then
    echo "  ✅ edgeToEdgeEnabled=false"
else
    echo "  ❌ edgeToEdgeEnabled is NOT false - Fix may not work!"
fi

if grep -q "expo.edgeToEdgeEnabled=false" android/gradle.properties; then
    echo "  ✅ expo.edgeToEdgeEnabled=false"
else
    echo "  ❌ expo.edgeToEdgeEnabled is NOT false - Fix may not work!"
fi

echo ""
echo "Checking AndroidManifest.xml:"
if grep -q "adjustResize" android/app/src/main/AndroidManifest.xml; then
    echo "  ✅ windowSoftInputMode contains adjustResize"
else
    echo "  ❌ adjustResize NOT found in AndroidManifest"
fi

echo ""
echo "Checking MainActivity.kt:"
if grep -q "setDecorFitsSystemWindows" android/app/src/main/java/com/expenseapp/personalfinance/MainActivity.kt; then
    echo "  ✅ setDecorFitsSystemWindows configured"
else
    echo "  ❌ setDecorFitsSystemWindows NOT found in MainActivity"
fi

echo ""

# Step 4: Build with EAS
echo "🏗️  Step 4: Building with EAS..."
echo "This may take several minutes..."
echo ""

# Get version from package.json or use default
VERSION=$(node -p "require('./package.json').version || '1.0.0'")
OUTPUT_FILE="./dist/expense-app-${VERSION}.apk"

# Create dist directory if it doesn't exist
mkdir -p dist

echo "Building version: $VERSION"
echo "Output file: $OUTPUT_FILE"
echo ""

# Run EAS build
eas build --profile=preview --platform=android --local --output "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ =========================================="
    echo "✅ Build completed successfully!"
    echo "✅ =========================================="
    echo ""
    echo "📱 APK Location: $OUTPUT_FILE"
    echo ""
    echo "Next steps:"
    echo "1. Uninstall old app from device:"
    echo "   adb uninstall com.expenseapp.personalfinance"
    echo ""
    echo "2. Install new APK:"
    echo "   adb install $OUTPUT_FILE"
    echo ""
    echo "3. Test keyboard behavior:"
    echo "   - Tap search box (Tìm kiếm)"
    echo "   - Add transaction with note"
    echo "   - Verify keyboard doesn't cover UI"
    echo ""
else
    echo ""
    echo "❌ =========================================="
    echo "❌ Build failed!"
    echo "❌ =========================================="
    echo ""
    echo "Troubleshooting:"
    echo "1. Check error messages above"
    echo "2. Ensure you're logged into EAS: eas login"
    echo "3. Try regenerating android folder:"
    echo "   npx expo prebuild --clean"
    echo ""
    exit 1
fi
