/// Purpose: Configured Dio HTTP client for every call the app makes to
/// the Sampark API — the single place base URL, auth headers, and token
/// refresh live.
/// Responsibilities: Attaches the current access token to every request;
/// on a 401, attempts one refresh via `/auth/refresh` and retries the
/// original request once before giving up and signaling a forced logout.
/// Security: Certificate pinning is a documented production hardening
/// step (see docs/SECURITY.md) — intentionally left off in this dev/demo
/// build so the app can talk to the local mock stack without a custom CA.
/// Related: core/storage/secure_token_storage.dart.
library;

import 'dart:developer' as developer;

import 'package:dio/dio.dart';

import '../storage/secure_token_storage.dart';

/// Android emulator reaches the host machine via 10.0.2.2; override for a
/// physical device or iOS simulator with --dart-define=API_BASE_URL=...
const String _defaultBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3001/v1',
);

class ForcedLogoutException implements Exception {}

class ApiClient {
  ApiClient({required this.tokenStorage, Dio? dio, String? baseUrl})
      : _dio = dio ?? Dio(BaseOptions(baseUrl: baseUrl ?? _defaultBaseUrl)) {
    // Every call this app makes — including both /auth/otp/request and /auth/otp/verify — goes
    // through this single Dio instance, so there is exactly one base URL for the whole app; it
    // cannot drift between endpoints. This line exists so that's actually verifiable at a glance:
    // print it once at startup instead of having to guess whether --dart-define took effect.
    developer.log('API base URL: ${_dio.options.baseUrl}', name: 'sampark.api');
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Logs the exact outbound method + full URL (never the body, which can hold a phone
          // number, OTP code, or token) for every request the app makes, success or failure. This
          // is what actually answers "did the OTP request even leave the device, and to where" —
          // the per-screen error logging only fires once something has already gone wrong.
          developer.log('-> ${options.method} ${options.baseUrl}${options.path}', name: 'sampark.api');
          final token = await tokenStorage.readAccessToken();
          if (token != null && !options.path.startsWith('/public/') && !options.path.startsWith('/auth/otp')) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          developer.log(
            '<- ${response.statusCode} ${response.requestOptions.method} ${response.requestOptions.path}',
            name: 'sampark.api',
          );
          handler.next(response);
        },
        onError: (error, handler) async {
          final isUnauthorized = error.response?.statusCode == 401;
          final alreadyRetried = error.requestOptions.extra['retried'] == true;
          // Only requests that actually carried an access token (see onRequest above) can mean
          // "the token expired" on a 401. A 401 from an unauthenticated call — e.g. /auth/otp/verify
          // rejecting a wrong code — is a normal business response, not a session expiry: treating
          // it as one used to discard the real error (message like "Invalid or expired code") and
          // replace it with a misleading ForcedLogoutException, which is exactly what made the OTP
          // screens' error handling impossible to diagnose.
          final wasAuthenticatedRequest = error.requestOptions.headers['Authorization'] != null;
          if (isUnauthorized && wasAuthenticatedRequest && !alreadyRetried) {
            final refreshed = await _tryRefresh();
            if (refreshed) {
              final retryOptions = error.requestOptions;
              retryOptions.extra['retried'] = true;
              final token = await tokenStorage.readAccessToken();
              retryOptions.headers['Authorization'] = 'Bearer $token';
              try {
                final response = await _dio.fetch<dynamic>(retryOptions);
                return handler.resolve(response);
              } catch (_) {
                // fall through to forced logout below
              }
            }
            await tokenStorage.clear();
            return handler.reject(DioException(requestOptions: error.requestOptions, error: ForcedLogoutException()));
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;
  final SecureTokenStorage tokenStorage;

  Future<bool> _tryRefresh() async {
    final refreshToken = await tokenStorage.readRefreshToken();
    if (refreshToken == null) return false;
    try {
      final response = await _dio.post<Map<String, dynamic>>('/auth/refresh', data: {'refreshToken': refreshToken});
      final data = response.data;
      if (data == null) return false;
      await tokenStorage.saveTokens(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Dio get raw => _dio;
}
