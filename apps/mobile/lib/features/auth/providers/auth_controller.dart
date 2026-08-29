/// Purpose: Owner authentication state — phone OTP request/verify,
/// session bootstrap on app start, and logout.
/// Responsibilities: Wraps ApiClient calls to /auth/*, persists tokens via
/// SecureTokenStorage, and exposes a simple AuthStatus for the router's
/// redirect guard.
/// Security: Never holds the phone number or OTP code in provider state
/// longer than the current screen's lifetime — nothing here is persisted
/// beyond the tokens themselves (which SecureTokenStorage keeps in
/// platform secure storage, not app memory/state).
/// Related: core/network/api_client.dart, core/storage/secure_token_storage.dart.
library;

import 'dart:developer' as developer;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_token_storage.dart';

enum AuthStatus { unknown, signedOut, signedIn }

class AuthState {
  const AuthState({required this.status});
  final AuthStatus status;
}

final secureTokenStorageProvider = Provider<SecureTokenStorage>((ref) => SecureTokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(tokenStorage: ref.watch(secureTokenStorageProvider));
});

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._apiClient, this._tokenStorage) : super(const AuthState(status: AuthStatus.unknown)) {
    _bootstrap();
  }

  final ApiClient _apiClient;
  final SecureTokenStorage _tokenStorage;

  Future<void> _bootstrap() async {
    // Temporary diagnostic — timestamps this against the router's redirect log line (see
    // app_router.dart) to show whether redirect() ran (with status still `unknown`) before or
    // after this resolves. Logs only whether a token exists, never its value.
    developer.log('bootstrap start (status=unknown until this resolves)', name: 'sampark.auth');
    final token = await _tokenStorage.readAccessToken();
    developer.log('bootstrap resolved: hasStoredToken=${token != null}', name: 'sampark.auth');
    state = AuthState(status: token != null ? AuthStatus.signedIn : AuthStatus.signedOut);
  }

  Future<int> requestOtp(String phoneE164) async {
    final response = await _apiClient.raw.post<Map<String, dynamic>>('/auth/otp/request', data: {'phoneE164': phoneE164});
    return (response.data?['retryAfterSeconds'] as num?)?.toInt() ?? 60;
  }

  Future<void> verifyOtp(String phoneE164, String code) async {
    final response = await _apiClient.raw.post<Map<String, dynamic>>(
      '/auth/otp/verify',
      data: {'phoneE164': phoneE164, 'code': code, 'deviceName': 'Mobile app'},
    );
    final data = response.data!;
    await _tokenStorage.saveTokens(accessToken: data['accessToken'] as String, refreshToken: data['refreshToken'] as String);
    state = const AuthState(status: AuthStatus.signedIn);
  }

  Future<void> signOut() async {
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken != null) {
      try {
        await _apiClient.raw.post<void>('/auth/logout', data: {'refreshToken': refreshToken});
      } catch (_) {
        // Best-effort server-side revoke; local sign-out proceeds regardless.
      }
    }
    await _tokenStorage.clear();
    state = const AuthState(status: AuthStatus.signedOut);
  }

  Future<void> signOutAllDevices() async {
    try {
      await _apiClient.raw.post<void>('/auth/logout-all');
    } catch (_) {
      // Ignore — local sign-out still proceeds.
    }
    await _tokenStorage.clear();
    state = const AuthState(status: AuthStatus.signedOut);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(apiClientProvider), ref.watch(secureTokenStorageProvider));
});
