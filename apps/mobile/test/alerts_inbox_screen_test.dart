import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/i18n/translations.dart';
import 'package:sampark/features/alerts/models/alert_event.dart';
import 'package:sampark/features/alerts/providers/alerts_controller.dart';
import 'package:sampark/features/alerts/screens/alerts_inbox_screen.dart';

/// A test double standing in for the real backend round trip:
/// acknowledge()/archive()/unarchive() mutate an in-memory "server" (`_alerts`) only on
/// simulated success, then invalidateSelf() + await future exactly like the real
/// AlertsController — so a widget test exercising this double is exercising the same "never
/// optimistic, UI only reflects a real post-mutation refetch" contract the real controller makes,
/// not a shortcut around it. The `*ShouldFail` flags simulate a rejected/unreachable backend
/// without needing a real Dio/HTTP dependency.
class _FakeAlertsController extends AlertsController {
  _FakeAlertsController(
    List<AlertEvent> seed, {
    this.acknowledgeShouldFail = false,
    this.archiveShouldFail = false,
    this.unarchiveShouldFail = false,
  }) : _alerts = seed;

  List<AlertEvent> _alerts;
  bool acknowledgeShouldFail;
  bool archiveShouldFail;
  bool unarchiveShouldFail;

  @override
  Future<List<AlertEvent>> build() async => _alerts;

  AlertEvent _copyWith(AlertEvent a, {DateTime? acknowledgedAt, Object? archivedAt = _unset}) => AlertEvent(
        id: a.id,
        category: a.category,
        severity: a.severity,
        note: a.note,
        scannerLocationLabel: a.scannerLocationLabel,
        scannerLocationExact: a.scannerLocationExact,
        createdAt: a.createdAt,
        acknowledgedAt: acknowledgedAt ?? a.acknowledgedAt,
        archivedAt: identical(archivedAt, _unset) ? a.archivedAt : archivedAt as DateTime?,
        deliveries: a.deliveries,
      );

  @override
  Future<void> acknowledge(String alertId) async {
    if (acknowledgeShouldFail) throw Exception('simulated network failure');
    _alerts = [
      for (final a in _alerts) if (a.id == alertId) _copyWith(a, acknowledgedAt: DateTime(2026, 1, 1)) else a,
    ];
    ref.invalidateSelf();
    await future;
  }

  @override
  Future<void> archive(String alertId) async {
    if (archiveShouldFail) throw Exception('simulated network failure');
    _alerts = [
      for (final a in _alerts) if (a.id == alertId) _copyWith(a, archivedAt: DateTime(2026, 1, 1)) else a,
    ];
    ref.invalidateSelf();
    await future;
  }

  @override
  Future<void> unarchive(String alertId) async {
    if (unarchiveShouldFail) throw Exception('simulated network failure');
    _alerts = [
      for (final a in _alerts) if (a.id == alertId) _copyWith(a, archivedAt: null) else a,
    ];
    ref.invalidateSelf();
    await future;
  }
}

const _unset = Object();

AlertEvent _seedAlert({String id = 'alert-1', String category = 'blocking_access', ScannerLocation? scannerLocationExact}) =>
    AlertEvent(
      id: id,
      category: category,
      severity: 'normal',
      note: null,
      scannerLocationLabel: scannerLocationExact != null ? 'Near scan location' : null,
      scannerLocationExact: scannerLocationExact,
      createdAt: DateTime(2026, 1, 1),
      acknowledgedAt: null,
      archivedAt: null,
      deliveries: const [],
    );

Future<void> _pumpScreen(WidgetTester tester, _FakeAlertsController controller) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [alertsControllerProvider.overrideWith(() => controller)],
      child: const MaterialApp(home: AlertsInboxScreen()),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _switchToArchivedTab(WidgetTester tester) async {
  await tester.tap(find.widgetWithText(Tab, translate(AppLocale.en, 'archivedAlertsTab')));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('renders an alert from the Active tab with its category, acknowledge, and archive actions', (tester) async {
    final controller = _FakeAlertsController([_seedAlert()]);
    await _pumpScreen(tester, controller);

    expect(find.text('blocking access'), findsOneWidget); // category with underscores replaced by spaces
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'acknowledge')), findsOneWidget);
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'archive')), findsOneWidget);
  });

  testWidgets('acknowledge success: shows a persisted "Acknowledged" state only after the mutation resolves', (tester) async {
    final controller = _FakeAlertsController([_seedAlert()]);
    await _pumpScreen(tester, controller);

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
    await _pumpScreen(tester, controller);

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'acknowledge')));
    await tester.pump(); // let the SnackBar animate in
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text(translate(AppLocale.en, 'errorGeneric')), findsOneWidget);
    // The alert was never actually acknowledged — the button must still be there to retry.
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'acknowledge')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'acknowledgedLabel')), findsNothing);
  });

  testWidgets('archive moves the alert out of Active and into Archived, leaving an unrelated alert in Active untouched', (tester) async {
    final controller = _FakeAlertsController([
      _seedAlert(id: 'alert-1', category: 'blocking_access'),
      _seedAlert(id: 'alert-2', category: 'lights_on'),
    ]);
    await _pumpScreen(tester, controller);

    expect(find.text('blocking access'), findsOneWidget);
    expect(find.text('lights on'), findsOneWidget);

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'archive')).first);
    await tester.pumpAndSettle();

    // Active tab: the archived alert is gone, the untouched one remains.
    expect(find.text('blocking access'), findsNothing);
    expect(find.text('lights on'), findsOneWidget);

    // Archived tab: exactly the archived alert appears there, with an Unarchive action — proving
    // this is a real server-state-driven filter (the fake's refetched `_alerts` list), not a
    // local-only "hide this card" flag.
    await _switchToArchivedTab(tester);
    expect(find.text('blocking access'), findsOneWidget);
    expect(find.text('lights on'), findsNothing);
    expect(find.text(translate(AppLocale.en, 'archivedLabel')), findsOneWidget);
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'unarchive')), findsOneWidget);
  });

  testWidgets('archive failure: shows an error and leaves the alert in Active for retry', (tester) async {
    final controller = _FakeAlertsController([_seedAlert()], archiveShouldFail: true);
    await _pumpScreen(tester, controller);

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'archive')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text(translate(AppLocale.en, 'errorGeneric')), findsOneWidget);
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'archive')), findsOneWidget);
    expect(find.text(translate(AppLocale.en, 'archivedLabel')), findsNothing);

    await _switchToArchivedTab(tester);
    expect(find.text(translate(AppLocale.en, 'noArchivedAlertsYet')), findsOneWidget);
  });

  testWidgets('unarchive success: moves the alert back from Archived to Active', (tester) async {
    final seed = _seedAlert();
    final controller = _FakeAlertsController([
      AlertEvent(
        id: seed.id,
        category: seed.category,
        severity: seed.severity,
        note: seed.note,
        scannerLocationLabel: seed.scannerLocationLabel,
        scannerLocationExact: seed.scannerLocationExact,
        createdAt: seed.createdAt,
        acknowledgedAt: null,
        archivedAt: DateTime(2026, 1, 1),
        deliveries: seed.deliveries,
      ),
    ]);
    await _pumpScreen(tester, controller);

    await _switchToArchivedTab(tester);
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'unarchive')), findsOneWidget);

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'unarchive')));
    await tester.pumpAndSettle();

    expect(find.text(translate(AppLocale.en, 'noArchivedAlertsYet')), findsOneWidget);

    await tester.tap(find.widgetWithText(Tab, translate(AppLocale.en, 'activeAlertsTab')));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'archive')), findsOneWidget);
  });

  testWidgets('unarchive failure: shows an error and leaves the alert in Archived for retry', (tester) async {
    final seed = _seedAlert();
    final controller = _FakeAlertsController(
      [
        AlertEvent(
          id: seed.id,
          category: seed.category,
          severity: seed.severity,
          note: seed.note,
          scannerLocationLabel: seed.scannerLocationLabel,
          scannerLocationExact: seed.scannerLocationExact,
          createdAt: seed.createdAt,
          acknowledgedAt: null,
          archivedAt: DateTime(2026, 1, 1),
          deliveries: seed.deliveries,
        ),
      ],
      unarchiveShouldFail: true,
    );
    await _pumpScreen(tester, controller);
    await _switchToArchivedTab(tester);

    await tester.tap(find.widgetWithText(TextButton, translate(AppLocale.en, 'unarchive')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text(translate(AppLocale.en, 'errorGeneric')), findsOneWidget);
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'unarchive')), findsOneWidget);
  });

  test('archived state persists after a fresh refetch (simulating reopening the screen / an app restart)', () async {
    final controller = _FakeAlertsController([_seedAlert()]);
    final container = ProviderContainer(overrides: [alertsControllerProvider.overrideWith(() => controller)]);
    addTearDown(container.dispose);
    // alertsControllerProvider is `.autoDispose` — without a live listener, Riverpod can tear the
    // notifier down between the awaits below (no widget is mounted here to hold it alive
    // implicitly), which would make this test flaky rather than a reliable persistence check.
    container.listen(alertsControllerProvider, (previous, next) {}, fireImmediately: true);

    await container.read(alertsControllerProvider.future);
    await container.read(alertsControllerProvider.notifier).acknowledge('alert-1');
    expect((await container.read(alertsControllerProvider.future)).single.acknowledgedAt, isNotNull);

    await container.read(alertsControllerProvider.notifier).archive('alert-1');
    expect((await container.read(alertsControllerProvider.future)).single.archivedAt, isNotNull);

    // A brand new provider read (e.g. after re-navigating to the screen, or a full app restart)
    // must ask the "server" again rather than trusting any client-side cache — invalidating and
    // re-reading here is exactly that, and it must still see both the acknowledged AND archived
    // state, because the fake's `_alerts` field (standing in for the real database) was mutated,
    // not just some in-memory UI flag that a fresh instance wouldn't have.
    container.invalidate(alertsControllerProvider);
    final refetched = await container.read(alertsControllerProvider.future);
    expect(refetched.single.acknowledgedAt, isNotNull);
    expect(refetched.single.archivedAt, isNotNull);
  });

  testWidgets('shows the shared-location label and an Open in Maps action when the scanner opted in', (tester) async {
    final controller = _FakeAlertsController([
      _seedAlert(scannerLocationExact: const ScannerLocation(latitude: 27.7, longitude: 85.3)),
    ]);
    await _pumpScreen(tester, controller);

    expect(find.text(translate(AppLocale.en, 'locationSharedLabel')), findsOneWidget);
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'openInMaps')), findsOneWidget);
  });

  testWidgets('shows no location label or map action when the scanner did not share location', (tester) async {
    final controller = _FakeAlertsController([_seedAlert()]);
    await _pumpScreen(tester, controller);

    expect(find.text(translate(AppLocale.en, 'locationSharedLabel')), findsNothing);
    expect(find.widgetWithText(TextButton, translate(AppLocale.en, 'openInMaps')), findsNothing);
  });
}
