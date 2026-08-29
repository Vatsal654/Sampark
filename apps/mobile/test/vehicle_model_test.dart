import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/features/vehicles/models/vehicle.dart';

void main() {
  group('Vehicle.fromJson', () {
    test('parses every field the backend returns (packages/api-contracts/src/vehicle.ts#vehicleViewSchema)', () {
      final vehicle = Vehicle.fromJson({
        'id': 'vehicle-1',
        'displayLabel': 'Blue Scooter',
        'category': 'scooter',
        'plateNumber': 'BA1PA1234',
        'plateNumberMasked': 'BA•••34',
        'make': 'Honda',
        'model': 'Dio',
        'variant': 'STD',
        'manufacturingYear': 2022,
        'fuelType': 'petrol',
        'color': 'Blue',
        'vinNumber': 'MH1JF5115K1234567',
        'engineNumber': 'JF51E1234567',
        'tagId': 'tag-1',
        'tagStatus': 'active',
      });

      expect(vehicle.id, 'vehicle-1');
      expect(vehicle.displayLabel, 'Blue Scooter');
      expect(vehicle.plateNumber, 'BA1PA1234');
      expect(vehicle.plateNumberMasked, 'BA•••34');
      expect(vehicle.make, 'Honda');
      expect(vehicle.model, 'Dio');
      expect(vehicle.variant, 'STD');
      expect(vehicle.manufacturingYear, 2022);
      expect(vehicle.fuelType, 'petrol');
      expect(vehicle.color, 'Blue');
      expect(vehicle.vinNumber, 'MH1JF5115K1234567');
      expect(vehicle.engineNumber, 'JF51E1234567');
      expect(vehicle.tagId, 'tag-1');
      expect(vehicle.tagStatus, 'active');
    });

    test('leaves optional detail fields null when the backend omits them (a bare-minimum vehicle)', () {
      final vehicle = Vehicle.fromJson({
        'id': 'vehicle-2',
        'displayLabel': 'Bare Bones',
        'category': 'car',
        'plateNumber': 'BA1XX0001',
        'plateNumberMasked': 'BA•••01',
        'make': null,
        'model': null,
        'variant': null,
        'manufacturingYear': null,
        'fuelType': null,
        'color': null,
        'vinNumber': null,
        'engineNumber': null,
        'tagId': null,
        'tagStatus': null,
      });

      expect(vehicle.make, isNull);
      expect(vehicle.manufacturingYear, isNull);
      expect(vehicle.tagId, isNull);
      expect(vehicle.tagStatus, isNull);
    });
  });
}
