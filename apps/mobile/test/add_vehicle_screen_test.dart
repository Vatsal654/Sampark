import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/i18n/translations.dart';
import 'package:sampark/features/vehicles/screens/add_vehicle_screen.dart';

void main() {
  testWidgets('renders the expanded vehicle detail fields, organized into sections', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: AddVehicleScreen())),
    );

    expect(find.text(translate(AppLocale.en, 'vehicleInformationSection')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'identificationSection')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'category')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'displayLabel')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'plateNumber')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'make')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'model')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'variant')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'manufacturingYear')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'fuelType')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'vehicleColor')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'vinNumber')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'engineNumber')), findsOneWidget);
    // Make/Model/Variant helper text distinguishing the three, per the product spec.
    expect(find.text(translate(AppLocale.en, 'makeHelper')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'modelHelper')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'variantHelper')), findsOneWidget);
  });

  testWidgets('the vehicle type dropdown defaults to a human-friendly label, never the raw lowercase enum value', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: AddVehicleScreen())),
    );

    // The dropdown defaults to 'car' — its closed-state display should read "Car", not "car".
    expect(find.text('Car'), findsOneWidget);
    expect(find.text('car'), findsNothing);

    final dropdown = tester.widget<DropdownButtonFormField<String>>(find.byType(DropdownButtonFormField<String>));
    final itemTexts = dropdown.items!.map((item) => (item.child as Text).data).toList();
    expect(itemTexts, ['Car', 'Bike', 'Scooter', 'Taxi', 'Commercial', 'Other']);
  });

  testWidgets('rejects a too-short plate number before ever calling the backend', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: AddVehicleScreen())),
    );

    await tester.enterText(find.widgetWithText(TextField, translate(AppLocale.en, 'displayLabel')), 'My Car');
    await tester.enterText(find.widgetWithText(TextField, translate(AppLocale.en, 'plateNumber')), 'BA1');
    await tester.tap(find.widgetWithText(FilledButton, translate(AppLocale.en, 'save')));
    await tester.pump();

    expect(find.text(translate(AppLocale.en, 'invalidPlateNumber')), findsOneWidget);
  });

  testWidgets('rejects an out-of-range manufacturing year before ever calling the backend', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: AddVehicleScreen())),
    );

    await tester.enterText(find.widgetWithText(TextField, translate(AppLocale.en, 'displayLabel')), 'My Car');
    await tester.enterText(find.widgetWithText(TextField, translate(AppLocale.en, 'plateNumber')), 'BA1PA1234');
    await tester.enterText(find.widgetWithText(TextField, translate(AppLocale.en, 'manufacturingYear')), '1899');
    await tester.tap(find.widgetWithText(FilledButton, translate(AppLocale.en, 'save')));
    await tester.pump();

    expect(find.text(translate(AppLocale.en, 'invalidManufacturingYear')), findsOneWidget);
  });
}
