/// Purpose: Fetches and acts on the owner's alert inbox.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_controller.dart';
import '../models/alert_event.dart';

class AlertsController extends AsyncNotifier<List<AlertEvent>> {
  @override
  Future<List<AlertEvent>> build() async {
    final response = await ref.read(apiClientProvider).raw.get<List<dynamic>>('/owner/alerts');
    return (response.data ?? []).map((e) => AlertEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> acknowledge(String alertId) async {
    await ref.read(apiClientProvider).raw.post<void>('/owner/alerts/$alertId/acknowledge');
    ref.invalidateSelf();
    await future;
  }

  Future<void> archive(String alertId) async {
    await ref.read(apiClientProvider).raw.post<void>('/owner/alerts/$alertId/archive');
    ref.invalidateSelf();
    await future;
  }
}

final alertsControllerProvider = AsyncNotifierProvider<AlertsController, List<AlertEvent>>(AlertsController.new);
