# Oli Sir Academy — Android App Build Guide

This project is set up with **Capacitor** to wrap the existing web app into a real native Android app. Same code, same design, same features.

## What you (or your developer) need

- A computer with **Android Studio** installed → https://developer.android.com/studio
- **Node.js 18+** and **Git**
- A Google Play Console account ($25 one-time) to publish

## One-time setup (5 minutes)

```bash
# 1. Clone the project on your computer
git clone <your-github-repo-url>
cd <project-folder>

# 3. Install dependencies
npm install

# 4. Add the Android platform (creates the /android folder)
npx cap add android
```

## Build the app (every time you want a new APK)

```bash
# 1. Pull latest changes
git pull

# 2. Build the web app
npm run build

# 3. Sync changes to Android
npx cap sync android

# 4. Open in Android Studio
npx cap open android
```

In Android Studio:
- Click **Run ▶️** to test on emulator or connected phone
- Or **Build → Generate Signed Bundle / APK** to create a release file for Play Store

## How updates work

The app is configured for production builds from the local `dist` output. Rebuild and sync the Android project whenever web code changes.

## App identity

- **App ID**: `com.olisiracademy.app`
- **App Name**: `olisiracademy`
- **Splash screen color**: Emerald green (#10b981)
- **Status bar color**: Emerald green (#10b981)

## Custom icon & splash screen

The default icon is the Capacitor logo. To use the Oli Sir Academy logo:

1. Go to https://icon.kitchen/ or https://easyappicon.com/
2. Upload `/public/logo.png`
3. Download the generated Android icon set
4. Replace files in `android/app/src/main/res/mipmap-*` folders
5. Run `npx cap sync android`

## Going to production (publishing on Play Store)

When ready to publish (not just test):

1. Run `npm run build && npx cap sync android`
2. In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**
3. Upload the `.aab` to Google Play Console

## Troubleshooting

- **"SDK location not found"** → Open Android Studio once, accept SDK licenses, then retry
- **Blank white screen** → Run `npm run build && npx cap sync android`, then rebuild the app
- **Build fails** → Run `cd android && ./gradlew clean` then retry

## Read more

- Capacitor docs: https://capacitorjs.com/docs/android
