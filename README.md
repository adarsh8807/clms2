# CLMS React Native App
**College Leave Management System** — Expo + React Native

Same logic, same Supabase DB, same UI design as the web app — fully mobile-native.

---

## Quick Start (Run Locally)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Dev Server
```bash
npx expo start
```
- Press **`a`** → Android emulator/device  
- Press **`i`** → iOS simulator (Mac only)  
- Scan QR with **Expo Go** app on your phone

---

## Build APK (Android — for direct install / testing)

### Option A — EAS Build (Recommended, cloud-based, no Android Studio needed)

**Step 1: Install EAS CLI**
```bash
npm install -g eas-cli
```

**Step 2: Login to Expo**
```bash
eas login
```

**Step 3: Configure your project (first time only)**
```bash
eas build:configure
```

**Step 4: Build APK**
```bash
npm run build:apk
# or directly:
eas build --platform android --profile preview
```

This produces a `.apk` file you can download and install on any Android device.

---

### Option B — Local Build (requires Android Studio)

**Prerequisites:**
- Android Studio installed
- Java 17 (JDK)
- `ANDROID_HOME` environment variable set

```bash
# Generate native Android project
npx expo prebuild --platform android

# Build APK
cd android
./gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## Publish to Google Play Store

### Step 1: Build an AAB (Android App Bundle)
```bash
eas build --platform android --profile production
```
This creates a `.aab` file — required by Play Store.

### Step 2: Sign your app
EAS handles signing automatically. On first build you'll be asked to:
- Generate a new keystore (EAS stores it securely), OR
- Upload your own existing keystore

**⚠️ IMPORTANT:** Save the keystore credentials — you need them for every future update.

### Step 3: Create Play Store listing
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app → **CLMS** / **College Leave Management**
3. Fill in:
   - App name, description, screenshots
   - Content rating questionnaire
   - Privacy policy URL (required)
   - Target audience

### Step 4: Upload the AAB
1. Play Console → **Release** → **Production**
2. Upload the `.aab` from EAS
3. Add release notes
4. Submit for review (usually 1–3 days)

### Step 5: Future Updates
Bump `versionCode` in `app.json` for every update:
```json
"versionCode": 2  // increment each release
```

---

## Publish to Apple App Store

### Prerequisites
- Mac with Xcode 15+
- Apple Developer account ($99/year)
- Bundle ID registered at [developer.apple.com](https://developer.apple.com)

### Step 1: Build for iOS
```bash
eas build --platform ios --profile production
```

EAS will ask for:
- Apple ID credentials
- Team ID (from developer.apple.com)
- Bundle identifier: `com.csc.clms`

### Step 2: Submit to TestFlight / App Store
```bash
eas submit --platform ios
```
Or manually upload the `.ipa` via **Transporter** app on Mac.

### Step 3: App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app → select bundle ID
3. Fill in metadata: name, description, screenshots (required sizes)
4. Add the build from TestFlight
5. Submit for review (usually 1–2 days)

---

## Project Structure

```
clms-rn/
├── app/
│   ├── _layout.tsx          # Root layout (providers)
│   ├── index.tsx            # Auth redirect
│   ├── (auth)/
│   │   └── sign-in.tsx      # Sign in + Register
│   └── (app)/
│       ├── admin.tsx        # Admin panel
│       └── (tabs)/
│           ├── dashboard.tsx
│           ├── apply.tsx
│           ├── leaves.tsx
│           ├── schedule.tsx
│           ├── proxies.tsx
│           ├── payroll.tsx
│           ├── requests.tsx  # HOD/Principal approval
│           ├── mark-leave.tsx
│           ├── notices.tsx
│           ├── teachers.tsx
│           ├── departments.tsx
│           ├── holidays.tsx
│           ├── reports.tsx
│           └── profile.tsx
├── components/
│   ├── ui.tsx               # Shared UI components
│   └── AppShell.tsx         # Page wrapper
├── lib/
│   ├── supabase.ts          # DB client
│   ├── auth.tsx             # Auth context + profile
│   └── leave.ts             # Leave types, helpers
├── hooks/
│   └── useBalances.ts       # Leave balance hook
├── assets/                  # Icons & splash screens
├── app.json                 # Expo config
└── eas.json                 # EAS build profiles
```

---

## Role-Based Access

| Screen         | Teacher | HOD | Principal | Admin |
|----------------|---------|-----|-----------|-------|
| Dashboard      | ✅      | ✅  | ✅        | —     |
| Apply Leave    | ✅      | ✅  | —         | —     |
| My Leaves      | ✅      | ✅  | —         | —     |
| Schedule       | ✅      | ✅  | —         | —     |
| Proxies        | ✅      | ✅  | —         | —     |
| Payroll        | ✅      | ✅  | —         | —     |
| Requests       | —       | ✅  | ✅        | —     |
| Mark Leave     | —       | ✅  | ✅        | —     |
| Notices        | View    | Post| Post      | —     |
| Teachers       | —       | ✅  | ✅        | —     |
| Departments    | —       | —   | ✅        | —     |
| Holidays       | View    | View| Edit      | Edit  |
| Reports        | —       | ✅  | ✅        | —     |
| Admin Panel    | —       | —   | —         | ✅    |

---

## Environment / Config

The Supabase URL and anon key are in `lib/supabase.ts`.  
Same database as the web app — no migration needed.

---

## Changing App Name / Bundle ID

Edit `app.json`:
```json
{
  "expo": {
    "name": "Your App Name",
    "ios": { "bundleIdentifier": "com.yourorg.yourapp" },
    "android": { "package": "com.yourorg.yourapp" }
  }
}
```

---

## Replace Placeholder Icons

Replace these files with real images before publishing:
- `assets/icon.png` — 1024×1024 PNG (no transparency)
- `assets/adaptive-icon.png` — 1024×1024 PNG (Android adaptive icon foreground)
- `assets/splash.png` — 1284×2778 PNG (splash screen)
- `assets/favicon.png` — 64×64 PNG (web)

Use [Expo's icon tool](https://docs.expo.dev/guides/app-icons/) or any image editor.

---

## Troubleshooting

**`Metro bundler` errors:**
```bash
npx expo start --clear
```

**Android build fails locally:**
```bash
cd android && ./gradlew clean && cd ..
npx expo prebuild --clean
```

**Supabase auth not persisting:**  
AsyncStorage is used automatically — no config needed.

**"Unable to resolve module" errors:**
```bash
npm install
npx expo install
```

---

## Run on Web Browser

Expo supports running the app directly in a browser — same codebase, same features.

### Start web dev server
```bash
npm run web
# or
npx expo start --web
```
Opens at **http://localhost:8081** in your browser.

### Build for production (static site)
```bash
npm run build:web
# Output in: dist/
```

Deploy the `dist/` folder to any static host:
- **Vercel**: `npx vercel dist/`
- **Netlify**: drag-drop the `dist/` folder
- **GitHub Pages**: push `dist/` to `gh-pages` branch

### Web vs Mobile differences
| Feature | Mobile | Web |
|---------|--------|-----|
| `Alert.prompt` (salary edit) | Native dialog | Falls back gracefully |
| AsyncStorage | Device storage | Browser localStorage |
| Expo splash screen | Native | Skipped automatically |
| Tab bar | Bottom nav | Bottom nav (same) |
| All data / DB | Same Supabase | Same Supabase |

The app is fully functional on web — all screens, all logic, all roles.
