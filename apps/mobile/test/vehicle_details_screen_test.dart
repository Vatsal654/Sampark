import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/i18n/translations.dart';
import 'package:sampark/features/vehicles/models/vehicle.dart';
import 'package:sampark/features/vehicles/providers/vehicles_controller.dart';
import 'package:sampark/features/vehicles/screens/vehicle_details_screen.dart';

const _vehicleWithoutTag = Vehicle(
  id: 'vehicle-1',
  displayLabel: 'Blue Scooter',
  category: 'scooter',
  plateNumberMasked: 'BA•••34',
  make: 'Honda',
  model: 'Dio',
  variant: null,
  manufacturingYear: 2022,
  fuelType: 'petrol',
  color: 'Blue',
  vinNumber: null,
  engineNumber: null,
  tagId: null,
  tagStatus: null,
);

class _FakeVehiclesController extends VehiclesController {
  _FakeVehiclesController(this.seed);
  final List<Vehicle> seed;

  @override
  Future<List<Vehicle>> build() async => seed;
}

Future<void> _pump(WidgetTester tester, List<Vehicle> seed) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [vehiclesControllerProvider.overrideWith(() => _FakeVehiclesController(seed))],
      child: const MaterialApp(home: VehicleDetailsScreen(vehicleId: 'vehicle-1')),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('shows the vehicle detail fields and an Activate Tag action when no tag is associated',
      (tester) async {
    await _pump(tester, [_vehicleWithoutTag]);

    expect(find.text('Blue Scooter'), findsOneWidget);
    expect(find.text('BA•••34'), findsOneWidget);
    expect(find.text('Honda'), findsOneWidget);
    expect(find.text('Dio'), findsOneWidget);
    expect(find.text('2022'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'activateTag')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'noTagAssociated')), findsOneWidget);
  });

  testWidgets('shows the active tag status instead of an Activate Tag action once a tag is bound',
      (tester) async {
    final vehicle = Vehicle(
      id: _vehicleWithoutTag.id,
      displayLabel: _vehicleWithoutTag.displayLabel,
      category: _vehicleWithoutTag.category,
      plateNumberMasked: _vehicleWithoutTag.plateNumberMasked,
      make: _vehicleWithoutTag.make,
      model: _vehicleWithoutTag.model,
      variant: _vehicleWithoutTag.variant,
      manufacturingYear: _vehicleWithoutTag.manufacturingYear,
      fuelType: _vehicleWithoutTag.fuelType,
      color: _vehicleWithoutTag.color,
      vinNumber: _vehicleWithoutTag.vinNumber,
      engineNumber: _vehicleWithoutTag.engineNumber,
      tagId: 'tag-1',
      tagStatus: 'active',
    );
    await _pump(tester, [vehicle]);

    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'activateTag')), findsNothing);
    expect(find.text(translate(AppLocale.en, 'tagStatus_active')), findsOneWidget);
  });
}
