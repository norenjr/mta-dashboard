# Native App Setup Guide

## First-time setup (run once on your Mac)

```bash
npm install
npx cap add ios
npx cap add android
npx cap sync
```

This generates the `ios/` and `android/` native project folders.

## Open in Xcode / Android Studio

```bash
npm run open:ios       # opens Xcode
npm run open:android   # opens Android Studio
```

## How to push an update

Every code change you push to GitHub Pages updates the website automatically.

For the **native app**, push a version tag to trigger an automated build + submission:

```bash
git tag v1.0.1
git push origin v1.0.1
```

This runs the GitHub Actions workflows that build and submit to App Store Connect (TestFlight) and Google Play (internal track).

---

## GitHub Secrets required

Add these in **Settings → Secrets and variables → Actions**:

### iOS
| Secret | How to get it |
|---|---|
| `IOS_CERTIFICATE_P12` | Base64-encoded `.p12` distribution certificate from Keychain Access |
| `IOS_CERTIFICATE_PASSWORD` | Password for the `.p12` |
| `IOS_PROVISIONING_PROFILE` | Base64-encoded `.mobileprovision` from developer.apple.com |
| `IOS_PROVISIONING_PROFILE_NAME` | Name of the provisioning profile (shown in Xcode) |
| `APPLE_TEAM_ID` | Your 10-character Team ID from developer.apple.com |
| `APP_STORE_CONNECT_API_KEY_ID` | Key ID from App Store Connect → Users → Keys |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID from the same page |

### Android
| Secret | How to get it |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -i release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | Password you chose when creating the keystore |
| `ANDROID_KEY_ALIAS` | Alias you chose when creating the keystore |
| `ANDROID_KEY_PASSWORD` | Key password |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | JSON key from Google Play Console → Setup → API access |

---

## iOS Info.plist (location permission string)

After running `npx cap add ios`, open `ios/App/App/Info.plist` and confirm this key exists (Capacitor adds it, but double-check):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>NYC Trains uses your location to show real-time arrivals for the subway stations nearest to you.</string>
```

A clear, specific usage description is important for App Store approval.
