import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/features/tags/providers/tags_controller.dart';

void main() {
  group('extractOpaqueIdFromScan', () {
    test('extracts the opaque id from a full scanner URL', () {
      expect(
        extractOpaqueIdFromScan('https://scan.sampark.example/t/0123456789abcdef0123456789abcdef.SIGNATURE'),
        '0123456789abcdef0123456789abcdef',
      );
    });

    test('extracts the opaque id from a bare "id.sig" NFC payload', () {
      expect(extractOpaqueIdFromScan('0123456789abcdef0123456789abcdef.SIGNATURE'), '0123456789abcdef0123456789abcdef');
    });

    test('returns null for a payload with no signature separator', () {
      expect(extractOpaqueIdFromScan('not-a-valid-payload'), isNull);
    });

    test('returns null for a payload ending in a bare dot', () {
      expect(extractOpaqueIdFromScan('abc123.'), isNull);
    });
  });
}
