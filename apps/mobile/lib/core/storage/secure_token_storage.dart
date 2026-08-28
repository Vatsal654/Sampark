/// Purpose: Stores the owner's access/refresh tokens using platform
/// secure storage (Keychain on iOS, Keystore-backed EncryptedSharedPreferences
/// on Android) — never SharedPreferences or a plain file, per
/// docs/SECURITY.md "Mobile-specific (MASVS-informed)".
/// Responsibilities: get/set/clear for the two tokens.
/// Security: This is the ONLY place tokens are persisted on-device. No
/// other module should write these values anywhere else (widget state,
/// logs, crash reports).
library;

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureTokenStorage {
  SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'sampark_access_token';
  static const _refreshTokenKey = 'sampark_refresh_token';

  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);
  Future<String?> readRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
