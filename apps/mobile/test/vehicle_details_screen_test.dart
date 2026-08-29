import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/i18n/translations.dart';
import 'package:sampark/features/tags/providers/tags_controller.dart';
import 'package:sampark/features/vehicles/models/vehicle.dart';
import 'package:sampark/features/vehicles/providers/vehicles_controller.dart';
import 'package:sampark/features/vehicles/screens/vehicle_details_screen.dart';

const _base = Vehicle(
  id: 'vehicle-1',
  displayLabel: 'Blue Scooter',
  category: 'scooter',
  plateNumber: 'BA1PA1234',
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

Vehicle _withTag(String? tagStatus) => Vehicle(
      id: _base.id,
      displayLabel: _base.displayLabel,
      category: _base.category,
      plateNumber: _base.plateNumber,
      plateNumberMasked: _base.plateNumberMasked,
      make: _base.make,
      model: _base.model,
      variant: _base.variant,
      manufacturingYear: _base.manufacturingYear,
      fuelType: _base.fuelType,
      color: _base.color,
      vinNumber: _base.vinNumber,
      engineNumber: _base.engineNumber,
      tagId: tagStatus == null ? null : 'tag-1',
      tagStatus: tagStatus,
    );

class _FakeVehiclesController extends VehiclesController {
  _FakeVehiclesController(this.seed);
  final List<Vehicle> seed;

  @override
  Future<List<Vehicle>> build() async => seed;
}

class _FakeTagsController extends TagsController {
  _FakeTagsController(Ref ref) : super(ref);
  final calls = <String>[];

  @override
  Future<void> pause(String tagId) async => calls.add('pause:$tagId');
  @override
  Future<void> resume(String tagId) async => calls.add('resume:$tagId');
  @override
  Future<void> reportLost(String tagId) async => calls.add('reportLost:$tagId');
}

Future<_FakeTagsController> _pump(WidgetTester tester, List<Vehicle> seed) async {
  late _FakeTagsController fakeTags;
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        vehiclesControllerProvider.overrideWith(() => _FakeVehiclesController(seed)),
        tagsControllerProvider.overrideWith((ref) {
          fakeTags = _FakeTagsController(ref);
          return fakeTags;
        }),
      ],
      child: const MaterialApp(home: VehicleDetailsScreen(vehicleId: 'vehicle-1')),
    ),
  );
  await tester.pumpAndSettle();
  return fakeTags;
}

void main() {
  testWidgets('shows the full plate number and an Activate Tag action when no tag is associated', (tester) async {
    await _pump(tester, [_base]);

    expect(find.text('Blue Scooter'), findsOneWidget);
    expect(find.text('BA1PA1234'), findsOneWidget);
    expect(find.text('BA•••34'), findsNothing);
    expect(find.text('Honda'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'activateTag')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'noTagAssociated')), findsOneWidget);
  });

  testWidgets('shows human-friendly category/fuel labels, never the raw lowercase enum values', (tester) async {
    await _pump(tester, [_base]);

    expect(find.text('Scooter'), findsOneWidget);
    expect(find.text('Petrol'), findsOneWidget);
    expect(find.text('scooter'), findsNothing);
    expect(find.text('petrol'), findsNothing);
  });

  testWidgets('active tag shows Pause Tag and Report Lost actions, not Activate Tag', (tester) async {
    await _pump(tester, [_withTag('active')]);

    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'activateTag')), findsNothing);
    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'pauseTag')), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'reportLostAction')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'tagStatus_active')), findsOneWidget);
  });

  testWidgets('paused tag shows Resume Tag and Report Lost actions', (tester) async {
    await _pump(tester, [_withTag('paused')]);

    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'resumeTag')), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'reportLostAction')), findsOneWidget);
  });

  testWidgets('reported-lost tag shows its status but no activate/pause/reactivate/report-lost actions', (tester) async {
    await _pump(tester, [_withTag('reported_lost')]);

    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'activateTag')), findsNothing);
    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'pauseTag')), findsNothing);
    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'resumeTag')), findsNothing);
    expect(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'reportLostAction')), findsNothing);
    expect(find.text(translate(AppLocale.en, 'tagStatus_reported_lost')), findsOneWidget);
  });

  testWidgets('pausing requires confirmation before calling TagsController.pause', (tester) async {
    final fakeTags = await _pump(tester, [_withTag('active')]);

    await tester.tap(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'pauseTag')));
    await tester.pumpAndSettle();

    // The confirmation dialog is up — pause() must not have been called yet.
    expect(fakeTags.calls, isEmpty);
    expect(find.text(translate(AppLocale.en, 'pauseTagConfirmTitle')), findsOneWidget);

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'pause')));
    await tester.pumpAndSettle();

    expect(fakeTags.calls, ['pause:tag-1']);
  });

  testWidgets('dismissing the pause confirmation does not call TagsController.pause', (tester) async {
    final fakeTags = await _pump(tester, [_withTag('active')]);

    await tester.tap(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'pauseTag')));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'cancel')));
    await tester.pumpAndSettle();

    expect(fakeTags.calls, isEmpty);
  });

  testWidgets('reporting lost requires confirmation before calling TagsController.reportLost', (tester) async {
    final fakeTags = await _pump(tester, [_withTag('active')]);

    await tester.tap(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'reportLostAction')));
    await tester.pumpAndSettle();
    expect(fakeTags.calls, isEmpty);
    expect(find.text(translate(AppLocale.en, 'reportTagLostConfirmTitle')), findsOneWidget);

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'reportLostAction')));
    await tester.pumpAndSettle();

    expect(fakeTags.calls, ['reportLost:tag-1']);
  });

  testWidgets('reactivating a paused tag calls TagsController.resume without a confirmation dialog', (tester) async {
    final fakeTags = await _pump(tester, [_withTag('paused')]);

    await tester.tap(find.widgetWithText(OutlinedButton, translate(AppLocale.en, 'resumeTag')));
    await tester.pumpAndSettle();

    expect(fakeTags.calls, ['resume:tag-1']);
  });
}
