import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/features/alerts/models/alert_event.dart';
import 'package:sampark/features/alerts/providers/alerts_controller.dart';
import 'package:sampark/features/documents/models/vault_document.dart';
import 'package:sampark/features/documents/providers/documents_controller.dart';
import 'package:sampark/features/emergency/providers/emergency_controller.dart';
import 'package:sampark/features/settings/providers/notification_preferences_controller.dart';
import 'package:sampark/features/vehicles/models/vehicle.dart';
import 'package:sampark/features/vehicles/providers/vehicles_controller.dart';
import 'package:sampark/shared/widgets/home_shell.dart';

// Fakes stand in for the real (network-backed) controllers so this test never touches Dio —
// HomeShell's IndexedStack builds every tab at once, so all five of these providers resolve on
// the very first frame regardless of which tab is selected.
class _FakeVehiclesController extends VehiclesController {
  @override
  Future<List<Vehicle>> build() async => <Vehicle>[];
}

class _FakeAlertsController extends AlertsController {
  @override
  Future<List<AlertEvent>> build() async => <AlertEvent>[];
}

class _FakeEmergencyController extends EmergencyController {
  @override
  Future<EmergencyProfileData> build() async => EmergencyProfileData.fromJson(const <String, dynamic>{});
}

class _FakeDocumentsController extends DocumentsController {
  @override
  Future<List<VaultDocument>> build() async => <VaultDocument>[];
}

class _FakeNotificationPreferencesController extends NotificationPreferencesController {
  @override
  Future<NotificationPreferencesData> build() async => NotificationPreferencesData.fromJson(const <String, dynamic>{});
}

void main() {
  testWidgets('HomeShell mounts all five tabs at once via IndexedStack without a Hero tag collision',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          vehiclesControllerProvider.overrideWith(_FakeVehiclesController.new),
          alertsControllerProvider.overrideWith(_FakeAlertsController.new),
          emergencyControllerProvider.overrideWith(_FakeEmergencyController.new),
          documentsControllerProvider.overrideWith(_FakeDocumentsController.new),
          notificationPreferencesControllerProvider.overrideWith(_FakeNotificationPreferencesController.new),
        ],
        child: const MaterialApp(home: HomeShell()),
      ),
    );
    await tester.pumpAndSettle();

    // Regression check for "There are multiple heroes that share the same tag within a subtree":
    // IndexedStack keeps every tab's Scaffold (and FAB) in the tree at once, so both
    // VehicleListScreen's and DocumentVaultScreen's FABs are mounted simultaneously here even
    // though only the first tab is painted — that's exactly what made the Hero tags collide.
    expect(tester.takeException(), isNull);
    expect(find.byType(FloatingActionButton), findsNWidgets(2));
  });
}
