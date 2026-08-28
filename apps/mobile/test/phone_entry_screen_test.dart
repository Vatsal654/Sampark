import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/features/auth/screens/phone_entry_screen.dart';

void main() {
  testWidgets('PhoneEntryScreen renders the phone field and disables submit until a number is present', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: PhoneEntryScreen()),
      ),
    );

    expect(find.text('Sampark'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Send code'), findsOneWidget);
  });

  testWidgets('shows a validation error for an invalid phone number', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: PhoneEntryScreen()),
      ),
    );

    await tester.enterText(find.byType(TextField), '123');
    await tester.tap(find.widgetWithText(FilledButton, 'Send code'));
    await tester.pump();

    expect(find.text('Enter a valid Nepali mobile number'), findsOneWidget);
  });
}
