import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/features/auth/screens/phone_entry_screen.dart';

void main() {
  group('normalizeNepaliPhone', () {
    test('normalizes a bare 10-digit number', () {
      expect(normalizeNepaliPhone('9812345678'), '+9779812345678');
    });

    test('normalizes a number with a leading 0', () {
      expect(normalizeNepaliPhone('09812345678'), '+9779812345678');
    });

    test('normalizes a number already carrying +977', () {
      expect(normalizeNepaliPhone('+9779812345678'), '+9779812345678');
    });

    test('normalizes a number with spaces and dashes', () {
      expect(normalizeNepaliPhone('+977 981-234-5678'), '+9779812345678');
    });

    test('rejects a non-Nepali number', () {
      expect(normalizeNepaliPhone('+14155552671'), isNull);
    });

    test('rejects garbage input', () {
      expect(normalizeNepaliPhone('not-a-phone'), isNull);
    });
  });
}
