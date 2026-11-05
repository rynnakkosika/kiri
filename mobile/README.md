# Kiri for Android

This folder packages the game for Google Play with [Capacitor](https://capacitorjs.com).
The game files live one folder up and still run without any build. Here they're only copied
into `www/` and wrapped in an Android app.

## Needs

- Node.js (LTS)
- JDK 21 (`JAVA_HOME`), for example Eclipse Temurin 21
- Android SDK (`ANDROID_HOME`) with `platforms;android-36`, `build-tools;36.0.0` and `platform-tools`.
  Android Studio installs these too.

Run `npm install` here once.

## Commands

| Command | What it does |
|---|---|
| `npm run sync` | Copies the game into `www/` and updates the Android project. Run after every game change. |
| `npm run apk` | Builds a debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`. |
| `npm run bundle` | Builds the signed Play Store bundle: `android/app/build/outputs/bundle/release/app-release.aab`. |
| `npm run images` | Renders the SVG artwork into icons, the splash screen and store graphics. |
| `npm run open` | Opens the project in Android Studio. |
| `node scripts/screenshots.mjs` | Takes 1080×1920 store screenshots (needs the dev server on port 8765). |

Before each new Play Store upload, raise `versionCode` (and `versionName`) in `android/app/build.gradle`.

## Signing key: keep it safe

`keys/kiri-upload.jks` is the upload key, and `android/keystore.properties` holds its password.
Both are kept out of git on purpose. **Copy the whole `keys/` folder somewhere safe**, such as a
USB stick or a password manager. With Play App Signing, Google can reset a lost upload key, but
it takes time.

## Install on your own phone without the Play Store

1. On the phone, turn on **Settings → About phone → tap Build number 7 times**, then
   **Developer options → USB debugging**.
2. Connect the phone with USB and run: `%ANDROID_HOME%\platform-tools\adb install -r android\app\build\outputs\apk\debug\app-debug.apk`

Or copy the APK to the phone and open it there (allow installing from that app when asked).
