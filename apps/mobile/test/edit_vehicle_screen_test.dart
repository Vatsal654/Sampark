import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sampark/core/i18n/translations.dart';
import 'package:sampark/features/vehicles/models/vehicle.dart';
import 'package:sampark/features/vehicles/providers/vehicles_controller.dart';
import 'package:sampark/features/vehicles/screens/edit_vehicle_screen.dart';

const _vehicle = Vehicle(
  id: 'vehicle-1',
  displayLabel: 'Blue Scooter',
  category: 'scooter',
  plateNumberMasked: 'BA•••34',
  make: 'Honda',
  model: 'Dio',
  variant: 'STD',
  manufacturingYear: 2022,
  fuelType: 'petrol',
  color: 'Blue',
  vinNumber: 'MH1JF5115K1234567',
  engineNumber: 'JF51E1234567',
  tagId: null,
  tagStatus: null,
);

class _RecordingVehiclesController extends VehiclesController {
  Map<String, dynamic>? lastUpdateCall;

  @override
  Future<List<Vehicle>> build() async => [_vehicle];

  @override
  Future<void> updateVehicle({
    required String vehicleId,
    String? displayLabel,
    String? category,
    String? plateNumber,
    String? make,
    String? model,
    String? variant,
    int? manufacturingYear,
    String? fuelType,
    String? color,
    String? vinNumber,
    String? engineNumber,
  }) async {
    // Deliberately does NOT call super/hit the network — this captures the call so the test can
    // assert what EditVehicleScreen actually sent, without a Dio/backend dependency.
    lastUpdateCall = {
      'vehicleId': vehicleId,
      'displayLabel': displayLabel,
      'category': category,
      'plateNumber': plateNumber,
      'make': make,
      'model': model,
      'variant': variant,
      'manufacturingYear': manufacturingYear,
      'fuelType': fuelType,
      'color': color,
      'vinNumber': vinNumber,
      'engineNumber': engineNumber,
    };
  }
}

void main() {
  testWidgets('prefills every editable field from the existing vehicle, except plate number', (tester) async {
    final controller = _RecordingVehiclesController();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [vehiclesControllerProvider.overrideWith(() => controller)],
        child: const MaterialApp(home: EditVehicleScreen(vehicleId: 'vehicle-1')),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Blue Scooter'), findsOneWidget);
    expect(find.text('Honda'), findsOneWidget);
    expect(find.text('Dio'), findsOneWidget);
    expect(find.text('STD'), findsOneWidget);
    expect(find.text('2022'), findsOneWidget);
    expect(find.text('Blue'), findsOneWidget);
    expect(find.text('MH1JF5115K1234567'), findsOneWidget);
    expect(find.text('JF51E1234567'), findsOneWidget);
    // The full plate is never returned by the backend, so there is nothing to prefill it with.
    expect(find.text('BA•••34'), findsNothing);
  });

  testWidgets('saving without touching the plate field omits plateNumber, and pops back on success', (tester) async {
    final controller = _RecordingVehiclesController();
    // A real GoRouter with somewhere to pop back to: EditVehicleScreen calls context.pop() on a
    // successful save (see edit_vehicle_screen.dart), which needs an actual GoRouter ancestor and
    // a previous route on the stack — a bare MaterialApp(home: ...) has neither.
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(path: '/', builder: (context, state) => const Scaffold(body: Text('vehicle list'))),
        GoRoute(path: '/edit', builder: (context, state) => const EditVehicleScreen(vehicleId: 'vehicle-1')),
      ],
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [vehiclesControllerProvider.overrideWith(() => controller)],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    router.push('/edit');
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, translate(AppLocale.en, 'saveChanges')));
    await tester.pumpAndSettle();

    expect(controller.lastUpdateCall, isNotNull);
    expect(controller.lastUpdateCall!['vehicleId'], 'vehicle-1');
    expect(controller.lastUpdateCall!['displayLabel'], 'Blue Scooter');
    expect(controller.lastUpdateCall!['make'], 'Honda');
    expect(controller.lastUpdateCall!['plateNumber'], isNull);
    // Confirms the screen actually popped back to the previous route on success.
    expect(find.text('vehicle list'), findsOneWidget);
  });
}
