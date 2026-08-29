import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/features/alerts/models/alert_event.dart';

void main() {
  group('AlertEvent.fromJson', () {
    test('parses scannerLocationExact when the backend includes it (packages/api-contracts/src/alert.ts#alertEventViewSchema)', () {
      final event = AlertEvent.fromJson({
        'id': 'alert-1',
        'category': 'blocking_access',
        'severity': 'normal',
        'note': null,
        'scannerLocationLabel': 'Near scan location',
        'scannerLocationExact': {'latitude': 27.7, 'longitude': 85.3},
        'createdAt': '2026-01-01T00:00:00.000Z',
        'acknowledgedAt': null,
        'archivedAt': null,
        'deliveries': <dynamic>[],
      });

      expect(event.scannerLocationExact, isNotNull);
      expect(event.scannerLocationExact!.latitude, 27.7);
      expect(event.scannerLocationExact!.longitude, 85.3);
    });

    test('leaves scannerLocationExact null when the scanner did not opt in to sharing location', () {
      final event = AlertEvent.fromJson({
        'id': 'alert-2',
        'category': 'parking_concern',
        'severity': 'normal',
        'note': null,
        'scannerLocationLabel': null,
        'scannerLocationExact': null,
        'createdAt': '2026-01-01T00:00:00.000Z',
        'acknowledgedAt': null,
        'archivedAt': null,
        'deliveries': <dynamic>[],
      });

      expect(event.scannerLocationExact, isNull);
    });

    test('accepts integer-valued coordinates (JSON numbers without a decimal point still parse as double)', () {
      final event = AlertEvent.fromJson({
        'id': 'alert-3',
        'category': 'other',
        'severity': 'normal',
        'note': null,
        'scannerLocationLabel': 'Near scan location',
        'scannerLocationExact': {'latitude': 28, 'longitude': 85},
        'createdAt': '2026-01-01T00:00:00.000Z',
        'acknowledgedAt': null,
        'archivedAt': null,
        'deliveries': <dynamic>[],
      });

      expect(event.scannerLocationExact!.latitude, 28.0);
      expect(event.scannerLocationExact!.longitude, 85.0);
    });
  });

  group('mapsUriFor', () {
    test('builds a Google Maps search URL from the exact coordinates, and nothing else', () {
      const location = ScannerLocation(latitude: 27.7172, longitude: 85.324);
      final uri = mapsUriFor(location);

      expect(uri.toString(), 'https://www.google.com/maps/search/?api=1&query=27.7172,85.324');
    });

    test('a negative-coordinate location still round-trips through the URL correctly', () {
      const location = ScannerLocation(latitude: -33.8688, longitude: 151.2093);
      final uri = mapsUriFor(location);

      expect(uri.queryParameters['query'], '-33.8688,151.2093');
    });
  });
}
