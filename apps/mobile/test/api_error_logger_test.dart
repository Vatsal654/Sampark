import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/network/api_error_logger.dart';

void main() {
  group('redactForLog', () {
    test('masks phone/otp/token-shaped keys regardless of casing/separators', () {
      final result = redactForLog({
        'phoneE164': '+9779812345678',
        'code': '482913',
        'accessToken': 'secret-token',
        'refresh_token': 'another-secret',
        'label': 'My Car',
      });
      expect(result, {
        'phoneE164': '[redacted]',
        'code': '[redacted]',
        'accessToken': '[redacted]',
        'refresh_token': '[redacted]',
        'label': 'My Car',
      });
    });

    test('deep-redacts nested maps and lists', () {
      final result = redactForLog({
        'errors': [
          {'phone': '+9779812345678', 'reason': 'invalid'},
        ],
      });
      expect(result, {
        'errors': [
          {'phone': '[redacted]', 'reason': 'invalid'},
        ],
      });
    });

    test('leaves non-sensitive primitive values untouched', () {
      expect(redactForLog('plain text'), 'plain text');
      expect(redactForLog(404), 404);
      expect(redactForLog(null), null);
    });
  });

  group('logApiError', () {
    test('does not throw for a DioException with a response body', () {
      final requestOptions = RequestOptions(path: '/auth/otp/verify', baseUrl: 'http://192.168.1.42:3001/v1');
      final error = DioException(
        requestOptions: requestOptions,
        response: Response(
          requestOptions: requestOptions,
          statusCode: 401,
          data: {'message': 'Invalid or expired code'},
        ),
        type: DioExceptionType.badResponse,
      );
      expect(() => logApiError('verifyOtp', error), returnsNormally);
    });

    test('does not throw for a connection-level DioException (unreachable host)', () {
      final requestOptions = RequestOptions(path: '/auth/otp/request', baseUrl: 'http://10.0.2.2:3001/v1');
      final error = DioException(requestOptions: requestOptions, type: DioExceptionType.connectionError);
      expect(() => logApiError('requestOtp', error), returnsNormally);
    });

    test('does not throw for a non-Dio error', () {
      expect(() => logApiError('requestOtp', Exception('boom')), returnsNormally);
    });
  });
}
