# Deeplink and Supabase Auth Redirect Setup

This guide explains how to set up deeplinking for Supabase authentication redirects.

## Overview

After a user authenticates via Supabase (email verification, password reset, etc.), they are redirected to a static HTML page that automatically opens your app using a deeplink, passing the authentication tokens.

## Files Created

### 1. Static Redirect Page
- **Location**: `/dist/auth-redirect.html`
- **Purpose**: Displays success message and redirects to the app
- **Features**:
  - Auto-opens app with authentication tokens
  - Beautiful UI with success animation
  - Cross-platform support (iOS, Android, Web)
  - Manual fallback button if auto-open fails

## Setup Instructions

### Step 1: Configure App Scheme

The app scheme `expenseapp://` is already configured in `app.json`:

```json
"scheme": "expenseapp"
```

### Step 2: Host the Static Page

You need to host the `auth-redirect.html` file on a public URL. Options:

#### Option A: GitHub Pages (Free)
1. Create a repository for your static page
2. Upload `auth-redirect.html` as `index.html`
3. Enable GitHub Pages in repository settings
4. Your URL will be: `https://yourusername.github.io/yourrepo/`

#### Option B: Vercel (Free)
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to the `dist` folder
3. Run `vercel` and follow prompts
4. You'll get a URL like: `https://your-project.vercel.app/auth-redirect.html`

#### Option C: Netlify (Free)
1. Drag and drop the `dist` folder to Netlify Drop
2. You'll get a URL like: `https://random-name.netlify.app/auth-redirect.html`

#### Option D: Your Own Server
Upload the file to your web server and note the public URL.

### Step 3: Configure Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set the **Site URL** to your hosted page URL:
   ```
   https://your-domain.com/auth-redirect.html
   ```
4. Add the same URL to **Redirect URLs**:
   ```
   https://your-domain.com/auth-redirect.html
   ```

### Step 4: Update Supabase Configuration in App

Update `src/config/supabase.ts` to handle deeplink authentication:

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable URL detection (we'll handle via deeplink)
  },
});
```

### Step 5: Handle Deeplink in App

Add deeplink handling in your `App.tsx` or auth service:

```typescript
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from './src/config/supabase';

// Add this to your main App component
useEffect(() => {
  // Handle initial URL when app is opened via deeplink
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink(url);
    }
  });

  // Handle deeplinks while app is running
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });

  return () => {
    subscription.remove();
  };
}, []);

async function handleDeepLink(url: string) {
  const { hostname, path, queryParams } = Linking.parse(url);
  
  // Handle auth callback
  if (hostname === 'auth' && path === 'callback') {
    const { access_token, refresh_token } = queryParams || {};
    
    if (access_token && refresh_token) {
      // Set the session in Supabase
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      
      if (error) {
        console.error('Error setting session:', error);
      } else {
        console.log('Successfully authenticated via deeplink');
        // Navigate to home screen or trigger auth state update
      }
    }
  }
}
```

### Step 6: Test the Flow

1. **Build and install your app** on a device
2. **Trigger a Supabase auth action**:
   - Sign up with email
   - Request password reset
   - Magic link login
3. **Check your email** and click the verification link
4. You should be redirected to the static page
5. The app should automatically open with authentication completed

## Deeplink URL Structure

The deeplink format is:
```
expenseapp://auth/callback?access_token=xxx&refresh_token=yyy&token_type=bearer&expires_in=3600
```

## Customization

### Update App Store ID (iOS)
If your app is published on the App Store, update the `IOS_APP_STORE_ID` in `auth-redirect.html`:

```javascript
const IOS_APP_STORE_ID = 'your-app-store-id';
```

### Update Package Name (Android)
The Android package name is already set to match your `app.json`:
```javascript
const ANDROID_PACKAGE = 'com.expenseapp.personalfinance';
```

### Customize UI
Edit the HTML/CSS in `auth-redirect.html` to match your branding.

## Troubleshooting

### App doesn't open automatically
- Ensure the app is installed on the device
- Check that the scheme matches in `app.json` and the HTML file
- Try the manual "Open Expense App" button

### Authentication doesn't complete
- Check browser console for errors
- Verify tokens are being passed in the URL
- Ensure `handleDeepLink` function is implemented

### iOS Universal Links (Optional)
For a better iOS experience, set up Universal Links:
1. Create an `apple-app-site-association` file
2. Host it at `https://your-domain.com/.well-known/apple-app-site-association`
3. Add associated domains in `app.json`

### Android App Links (Optional)
For a better Android experience, set up Android App Links:
1. Create a `assetlinks.json` file
2. Host it at `https://your-domain.com/.well-known/assetlinks.json`
3. Add intent filters to `android/app/src/main/AndroidManifest.xml`

## Security Notes

- The static page only passes authentication tokens via deeplink
- Tokens are handled by Supabase's secure session management
- The page can be accessed publicly, but tokens are only valid once
- Consider implementing rate limiting on your hosting platform

## Next Steps

1. Host the `auth-redirect.html` file
2. Update Supabase dashboard with the hosted URL
3. Implement deeplink handling in your app
4. Test the complete authentication flow
5. (Optional) Set up Universal/App Links for production
