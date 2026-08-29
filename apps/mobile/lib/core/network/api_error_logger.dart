/// Purpose: Turns a caught API error into a single structured line on the
/// `flutter run` / DevTools console, so a failure never surfaces to the
/// developer as only a generic "Something went wrong" with nothing in the
/// log — the exact bug reported against the OTP flow, where every screen's
/// `catch (_) { ... }` discarded the real DioException before anything was
/// printed.
/// Responsibilities: `logApiError` prints the HTTP method/path, the Dio
/// failure type, status code and response body (redacted) when present,
/// and — for a connection-level failure specifically — a hint about the
/// most common physical-device cause (API_BASE_URL pointing at an address
/// the phone can't reach; see apps/mobile/README.md).
/// Security: Mirrors services/api's redaction policy on the client side —
/// `redactForLog` masks phone/OTP/token-shaped fields before they ever
/// reach the console, consistent with docs/SECURITY.md's "never log PII"
/// rule applying to every log sink, not just the backend's.
/// Related: features/auth/screens/phone_entry_screen.dart,
/// features/auth/screens/otp_verify_screen.dart, core/network/api_client.dart.
library;

import 'dart:developer' as developer;

import 'package:dio/dio.dart';

const _sensitiveKeys = {
  'phone',
  'phonenumber',
  'phonee164',
  'code',
  'otp',
  'otpcode',
  'accesstoken',
  'refreshtoken',
  'token',
};

/// Deep-redacts a decoded JSON-ish value (Map/List/primitive) for logging,
/// masking any key whose normalized name looks like PII/a secret.
dynamic redactForLog(dynamic value) {
  if (value is Map) {
    return value.map((key, val) {
      final normalized = key.toString().toLowerCase().replaceAll(RegExp(r'[_\s-]'), '');
      return MapEntry(key, _sensitiveKeys.contains(normalized) ? '[redacted]' : redactForLog(val));
    });
  }
  if (value is List) {
    return value.map(redactForLog).toList();
  }
  return value;
}

/// Logs a caught API-call error with enough detail to diagnose it, without
/// ever printing a raw phone number, OTP code, or token.
void logApiError(String context, Object error, [StackTrace? stackTrace]) {
  if (error is DioException) {
    final request = error.requestOptions;
    final response = error.response;
    final buffer = StringBuffer()
      ..writeln('[$context] ${request.method} ${request.path} failed: ${error.type.name}')
      ..writeln('  message: ${error.message}');
    if (response != null) {
      buffer.writeln('  status: ${response.statusCode}');
      buffer.writeln('  body: ${redactForLog(response.data)}');
    }
    if (error.type == DioExceptionType.connectionError || error.type == DioExceptionType.connectionTimeout) {
      buffer.writeln(
        '  hint: could not reach ${request.baseUrl}${request.path}. On a physical device, '
        '"localhost" and "10.0.2.2" do NOT point at your Mac — pass '
        '--dart-define=API_BASE_URL=http://<your-mac-LAN-IP>:3001/v1 and make sure the phone '
        'and Mac are on the same Wi-Fi (see apps/mobile/README.md).',
      );
    }
    developer.log(buffer.toString(), name: 'sampark.api', error: error, stackTrace: stackTrace);
    return;
  }
  developer.log('[$context] $error', name: 'sampark.api', error: error, stackTrace: stackTrace);
}
