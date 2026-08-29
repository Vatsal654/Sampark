import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/i18n/translations.dart';
import 'package:sampark/features/vehicles/vehicle_display.dart';

void main() {
  group('categoryDisplayLabel', () {
    test('capitalizes every known category instead of showing the raw lowercase enum value', () {
      final expected = {
        'car': 'Car',
        'bike': 'Bike',
        'scooter': 'Scooter',
        'taxi': 'Taxi',
        'commercial': 'Commercial',
        'other': 'Other',
      };
      for (final entry in expected.entries) {
        final label = categoryDisplayLabel(AppLocale.en, entry.key);
        expect(label, entry.value);
        expect(label, isNot(entry.key), reason: 'raw enum value "${entry.key}" must never be shown to the user');
      }
    });

    test('falls back to a capitalized form for an unrecognized category rather than a blank label', () {
      expect(categoryDisplayLabel(AppLocale.en, 'quadbike'), 'Quadbike');
    });
  });

  group('fuelTypeDisplayLabel', () {
    test('capitalizes every known fuel type instead of showing the raw lowercase enum value', () {
      final expected = {
        'petrol': 'Petrol',
        'diesel': 'Diesel',
        'electric': 'Electric',
        'hybrid': 'Hybrid',
        'cng': 'CNG',
        'other': 'Other',
      };
      for (final entry in expected.entries) {
        final label = fuelTypeDisplayLabel(AppLocale.en, entry.key);
        expect(label, entry.value);
        expect(label, isNot(entry.key), reason: 'raw enum value "${entry.key}" must never be shown to the user');
      }
    });

    test('shows a "not set" label rather than blank when fuelType is null', () {
      expect(fuelTypeDisplayLabel(AppLocale.en, null), translate(AppLocale.en, 'fuelTypeNotSet'));
    });
  });
}
