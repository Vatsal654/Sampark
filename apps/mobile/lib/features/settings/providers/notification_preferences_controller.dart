/// Purpose: Owner notification/privacy preferences read-modify-write.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_controller.dart';

class NotificationPreferencesData {
  const NotificationPreferencesData({
    required this.channelOrder,
    required this.maskedCallsEnabled,
    required this.emergencyBypassQuietHours,
  });

  factory NotificationPreferencesData.fromJson(Map<String, dynamic> json) => NotificationPreferencesData(
        channelOrder: ((json['channelOrder'] as List<dynamic>?) ?? ['push', 'whatsapp', 'sms']).cast<String>(),
        maskedCallsEnabled: json['maskedCallsEnabled'] as bool? ?? true,
        emergencyBypassQuietHours: json['emergencyBypassQuietHours'] as bool? ?? true,
      );

  final List<String> channelOrder;
  final bool maskedCallsEnabled;
  final bool emergencyBypassQuietHours;

  Map<String, dynamic> toJson() => {
        'channelOrder': channelOrder,
        'maskedCallsEnabled': maskedCallsEnabled,
        'quietHoursStart': null,
        'quietHoursEnd': null,
        'emergencyBypassQuietHours': emergencyBypassQuietHours,
        'tagPaused': false,
        'geoEventRetentionDays': 90,
      };

  NotificationPreferencesData copyWith({bool? maskedCallsEnabled, bool? emergencyBypassQuietHours}) =>
      NotificationPreferencesData(
        channelOrder: channelOrder,
        maskedCallsEnabled: maskedCallsEnabled ?? this.maskedCallsEnabled,
        emergencyBypassQuietHours: emergencyBypassQuietHours ?? this.emergencyBypassQuietHours,
      );
}

class NotificationPreferencesController extends AutoDisposeAsyncNotifier<NotificationPreferencesData> {
  @override
  Future<NotificationPreferencesData> build() async {
    final response = await ref.read(apiClientProvider).raw.get<Map<String, dynamic>>('/owner/notification-preferences');
    return NotificationPreferencesData.fromJson(response.data ?? {});
  }

  Future<void> save(NotificationPreferencesData data) async {
    await ref.read(apiClientProvider).raw.put<void>('/owner/notification-preferences', data: data.toJson());
    state = AsyncData(data);
  }
}

final notificationPreferencesControllerProvider =
    AsyncNotifierProvider.autoDispose<NotificationPreferencesController, NotificationPreferencesData>(
  NotificationPreferencesController.new,
);
