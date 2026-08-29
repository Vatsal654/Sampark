import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/features/vehicles/vehicle_validation.dart';

void main() {
  group('isValidPlateNumber', () {
    test('accepts a plate within the 4-12 character range the backend enforces', () {
      expect(isValidPlateNumber('BA1PA1234'), isTrue);
    });
    test('rejects a plate shorter than 4 characters', () {
      expect(isValidPlateNumber('BA1'), isFalse);
    });
    test('rejects a plate longer than 12 characters', () {
      expect(isValidPlateNumber('BA1PA1234567890'), isFalse);
    });
    test('trims surrounding whitespace before checking length', () {
      expect(isValidPlateNumber('  BA1PA1234  '), isTrue);
    });
  });

  group('isValidManufacturingYear', () {
    test('accepts a recent year', () {
      expect(isValidManufacturingYear(2022), isTrue);
    });
    test('rejects a year before 1980', () {
      expect(isValidManufacturingYear(1975), isFalse);
    });
    test('rejects a year more than one year in the future', () {
      expect(isValidManufacturingYear(DateTime.now().year + 5), isFalse);
    });
  });

  group('isValidVinNumber', () {
    test('accepts a standard 17-character VIN', () {
      expect(isValidVinNumber('MH1JF5115K1234567'), isTrue);
    });
    test('rejects a too-short value', () {
      expect(isValidVinNumber('ABC'), isFalse);
    });
  });

  group('isValidEngineNumber', () {
    test('accepts a typical engine number', () {
      expect(isValidEngineNumber('JF51E1234567'), isTrue);
    });
    test('rejects a single character', () {
      expect(isValidEngineNumber('A'), isFalse);
    });
  });
}
