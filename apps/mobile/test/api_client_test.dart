import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/network/api_client.dart';
import 'package:sampark/core/storage/secure_token_storage.dart';

void main() {
  group('ApiClient base URL', () {
    test('uses the explicit baseUrl override when one is provided', () {
      final client = ApiClient(
        tokenStorage: SecureTokenStorage(),
        baseUrl: 'http://192.168.1.8:3001/v1',
      );
      // requestOtp and verifyOtp (see features/auth/providers/auth_controller.dart) both call
      // through this same client.raw — there is exactly one base URL for the whole app, so
      // verifying it here covers both endpoints at once.
      expect(client.raw.options.baseUrl, 'http://192.168.1.8:3001/v1');
    });
  });
}
