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

### Running on a physical phone (real Android or iPhone, not an emulator/simulator)

Neither `10.0.2.2` nor `localhost` reaches your computer from a real
device — those only work for an emulator/simulator, which shares the
host's network stack. A physical phone needs your computer's actual LAN
IP address, and both devices must be on the **same Wi-Fi network**:

```bash
# On the Mac running the backend, find its LAN IP:
ipconfig getifaddr en0
# prints something like 192.168.1.42 — if it prints nothing, try en1 instead of en0
```

Then run the app with that address:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.42:3001/v1   # use YOUR IP from above
```

**Before you conclude the app is broken**, confirm the phone can even
reach the API on its own: open Safari/Chrome on the phone and go to
`http://192.168.1.42:3001/v1/health` — you should see `{"status":"ok",...}`.
If that fails in the browser too, it's a network/firewall issue (same
Wi-Fi? macOS Firewall blocking incoming connections to Node?), not an app
bug — fix that first.

If a request fails, the real cause (status code, response body, or "can't
reach this host at all") is printed to the `flutter run` console and to
Flutter DevTools' Logging view under the `sampark.api` log name — see
`core/network/api_error_logger.dart`. The on-screen error message stays
generic on purpose; the console log has the actual detail.

Every request `ApiClient` sends is also traced under that same
`sampark.api` log name, success or failure: a `-> METHOD baseUrl+path`
line right before it leaves the device, and a `<- status METHOD path`
line when a response comes back. This is what actually answers "did the
request even leave the app, and to which host/port" — if you tap Send
code and never see the matching `-> POST .../auth/otp/request` line at
all, the tap isn't reaching `ApiClient` (a UI/state bug); if you see the
`->` line but never a matching `<-` line, the request left the device but
got no response (network/firewall/host problem, not an app bug); if you
see both, the request reached *some* server and got a response — at that
point check the API process is actually running your latest pulled code
(the dev-mock OTP print and `/v1/dev/simulator` need it) and check
`GET http://<host>:3001/v1/dev/simulator` directly, which needs no auth
and works independent of what shows up in the terminal.

## Architecture

```
lib/
  core/
    network/api_client.dart       Dio client with auth + token-refresh interceptor
    network/api_error_logger.dart  redacted console logging for caught API errors
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
