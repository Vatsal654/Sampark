import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/i18n/translations.dart';
import 'package:sampark/features/vehicles/screens/add_vehicle_screen.dart';

void main() {
  testWidgets('renders the expanded vehicle detail fields', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: AddVehicleScreen())),
    );

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
