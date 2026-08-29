import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/i18n/translations.dart';
import 'package:sampark/features/alerts/models/alert_event.dart';
import 'package:sampark/features/alerts/providers/alerts_controller.dart';
import 'package:sampark/features/alerts/screens/alerts_inbox_screen.dart';

/// A test double standing in for the real backend round trip: acknowledge()/archive() mutate an
/// in-memory "server" (`_alerts`) only on success, then invalidateSelf() + await future exactly
/// like the real AlertsController — so a widget test exercising this double is exercising the same
/// "never optimistic, UI only reflects a real post-mutation refetch" contract the real controller
/// makes, not a shortcut around it. `acknowledgeShouldFail`/`archiveShouldFail` simulate a rejected
/// or unreachable backend without needing a real Dio/HTTP dependency.
class _FakeAlertsController extends AlertsController {
  _FakeAlertsController(List<AlertEvent> seed, {this.acknowledgeShouldFail = false, this.archiveShouldFail = false})
      : _alerts = seed;

  List<AlertEvent> _alerts;
  bool acknowledgeShouldFail;
  bool archiveShouldFail;

  @override
  Future<List<AlertEvent>> build() async => _alerts;

  @override
  Future<void> acknowledge(String alertId) async {
    if (acknowledgeShouldFail) {
      throw Exception('simulated network failure');
    }
    _alerts = [
      for (final a in _alerts)
        if (a.id == alertId)
          AlertEvent(
            id: a.id,
            category: a.category,
            severity: a.severity,
            note: a.note,
            scannerLocationLabel: a.scannerLocationLabel,
            scannerLocationExact: a.scannerLocationExact,
            createdAt: a.createdAt,
            acknowledgedAt: DateTime(2026, 1, 1),
            archivedAt: a.archivedAt,
            deliveries: a.deliveries,
          )
        else
          a,
    ];
    ref.invalidateSelf();
    await future;
  }

  @override
  Future<void> archive(String alertId) async {
    if (archiveShouldFail) {
      throw Exception('simulated network failure');
    }
    _alerts = [
      for (final a in _alerts)
        if (a.id == alertId)
          AlertEvent(
            id: a.id,
            category: a.category,
            severity: a.severity,
            note: a.note,
            scannerLocationLabel: a.scannerLocationLabel,
            scannerLocationExact: a.scannerLocationExact,
            createdAt: a.createdAt,
            acknowledgedAt: a.acknowledgedAt,
            archivedAt: DateTime(2026, 1, 1),
            deliveries: a.deliveries,
          )
        else
          a,
    ];
    ref.invalidateSelf();
    await future;
  }
}

AlertEvent _seedAlert() => AlertEvent(
      id: 'alert-1',
      category: 'blocking_access',
      severity: 'normal',
      note: null,
      scannerLocationLabel: null,
      scannerLocationExact: null,
      createdAt: DateTime(2026, 1, 1),
      acknowledgedAt: null,
      archivedAt: null,
      deliveries: const [],
    );

void main() {
  testWidgets('acknowledge success: shows a persisted "Acknowledged" state only after the mutation resolves', (tester) async {
    final controller = _FakeAlertsController([_seedAlert()]);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [alertsControllerProvider.overrideWith(() => controller)],
        child: const MaterialApp(home: AlertsInboxScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'acknowledge')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'acknowledgedLabel')), findsNothing);

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'acknowledge')));
    await tester.pumpAndSettle();

    // The confirmation comes from the fake's refetched list (its "server"), not an optimistic
    // local flip — and the button that triggered it is gone, replaced by a persisted state label.
    expect(find.text(translate(AppLocale.en, 'acknowledgedLabel')), findsOneWidget);
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'acknowledge')), findsNothing);
  });

  testWidgets('acknowledge failure: shows an error and leaves the button in place for retry, never a silent disappearance', (tester) async {
    final controller = _FakeAlertsController([_seedAlert()], acknowledgeShouldFail: true);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [alertsControllerProvider.overrideWith(() => controller)],
        child: const MaterialApp(home: AlertsInboxScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'acknowledge')));
    await tester.pump(); // let the SnackBar animate in
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text(translate(AppLocale.en, 'errorGeneric')), findsOneWidget);
    // The alert was never actually acknowledged — the button must still be there to retry.
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'acknowledge')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'acknowledgedLabel')), findsNothing);
  });

  testWidgets('archive success: shows a persisted "Archived" state only after the mutation resolves', (tester) async {
    final controller = _FakeAlertsController([_seedAlert()]);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [alertsControllerProvider.overrideWith(() => controller)],
        child: const MaterialApp(home: AlertsInboxScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'archive')));
    await tester.pumpAndSettle();

    expect(find.text(translate(AppLocale.en, 'archivedLabel')), findsOneWidget);
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'archive')), findsNothing);
  });

  testWidgets('archive failure: shows an error and leaves the button in place for retry', (tester) async {
    final controller = _FakeAlertsController([_seedAlert()], archiveShouldFail: true);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [alertsControllerProvider.overrideWith(() => controller)],
        child: const MaterialApp(home: AlertsInboxScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'archive')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text(translate(AppLocale.en, 'errorGeneric')), findsOneWidget);
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'archive')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'archivedLabel')), findsNothing);
  });

  test('state persists after a fresh refetch (simulating reopening the screen / an app restart)', () async {
    final controller = _FakeAlertsController([_seedAlert()]);
    final container = ProviderContainer(overrides: [alertsControllerProvider.overrideWith(() => controller)]);
    addTearDown(container.dispose);

    await container.read(alertsControllerProvider.future);
    await container.read(alertsControllerProvider.notifier).acknowledge('alert-1');
    expect((await container.read(alertsControllerProvider.future)).single.acknowledgedAt, isNotNull);

    // A brand new provider read (e.g. after re-navigating to the screen, or a full app restart)
    // must ask the "server" again rather than trusting any client-side cache — invalidating and
    // re-reading here is exactly that, and it must still see the acknowledged state, because the
    // fake's `_alerts` field (standing in for the real database) was mutated, not just some
    // in-memory UI flag that a fresh instance wouldn't have.
    container.invalidate(alertsControllerProvider);
    final refetched = await container.read(alertsControllerProvider.future);
    expect(refetched.single.acknowledgedAt, isNotNull);
  });
}
