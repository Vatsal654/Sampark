# Sampark Owner App (`apps/mobile`)

Flutter app for vehicle owners: onboarding, vehicle management, tag
activation (QR/NFC), the alert inbox, emergency profile, secure document
vault, and privacy/notification settings.

> **Note on this checkout**: this repository was authored in an
> environment without the Flutter SDK installed, so `lib/` and `test/`
> were hand-written and have **not** been run through `flutter analyze`
> / `flutter test` / a real build — unlike every other app in this
> monorepo, which was built and tested. Before relying on this app,
> run the one-time platform scaffolding step below and then
> `flutter analyze` to catch anything a real SDK run would surface.

## One-time setup

Flutter's tooling generates the `android/` and `ios/` platform project
folders deterministically from `pubspec.yaml` — they are intentionally
not checked in by hand here (hand-writing Gradle/Xcode project files
risks silently drifting from what the real toolchain expects). Generate
them once:

```bash
cd apps/mobile
flutter create --project-name sampark --org com.sampark .
flutter pub get
```

Then add the platform permissions Sampark needs (camera for QR scanning,
NFC for tag taps, biometrics for app lock):

- **Android** (`android/app/src/main/AndroidManifest.xml`): add
  `<uses-permission android:name="android.permission.CAMERA"/>`,
  `<uses-permission android:name="android.permission.NFC"/>`, and
  `<uses-permission android:name="android.permission.USE_BIOMETRIC"/>`.
- **iOS** (`ios/Runner/Info.plist`): add `NSCameraUsageDescription`,
  `NFCReaderUsageDescription`, and `NSFaceIDUsageDescription` with
  plain-language justifications (product spec §10's plain-language
  privacy copy requirement applies here too).

## Running

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/v1   # Android emulator
flutter run --dart-define=API_BASE_URL=http://localhost:3001/v1  # iOS simulator
```

## Architecture

```
lib/
  core/
    network/api_client.dart       Dio client with auth + token-refresh interceptor
    storage/secure_token_storage.dart   platform secure storage (Keychain/Keystore)
    router/app_router.dart         go_router graph + auth redirect guard
    theme/app_theme.dart           Material 3 theme
    i18n/                          hand-written English/Nepali dictionary
  features/
    auth/           phone OTP onboarding
    vehicles/        vehicle CRUD
    tags/             QR/NFC tag activation
    alerts/           alert inbox
    emergency/        emergency profile + share toggles
    documents/        secure document vault
    settings/         notification preferences, biometric lock, privacy actions
  shared/widgets/home_shell.dart   bottom-nav shell
```

## Testing

```bash
flutter test
```

`test/` covers the phone-normalization and tag-ID-extraction pure logic,
plus a widget test for the phone entry screen. Wider integration tests for
the full onboarding → activation → alerts flow are the natural next
addition once the platform folders above are generated and a device/
emulator is available to run them against.
