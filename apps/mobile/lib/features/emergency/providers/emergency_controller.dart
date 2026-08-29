/// Purpose: Owner emergency profile + contacts read/write.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_controller.dart';

class EmergencyProfileData {
  const EmergencyProfileData({
    required this.bloodGroup,
    required this.allergiesNote,
    required this.safeInstructions,
    required this.shareBloodGroup,
    required this.shareAllergies,
    required this.shareSafeInstructions,
  });

  factory EmergencyProfileData.fromJson(Map<String, dynamic> json) => EmergencyProfileData(
        bloodGroup: json['bloodGroup'] as String? ?? 'unknown',
        allergiesNote: json['allergiesNote'] as String?,
        safeInstructions: json['safeInstructions'] as String?,
        shareBloodGroup: json['shareBloodGroup'] as bool? ?? false,
        shareAllergies: json['shareAllergies'] as bool? ?? false,
        shareSafeInstructions: json['shareSafeInstructions'] as bool? ?? false,
      );

  final String bloodGroup;
  final String? allergiesNote;
  final String? safeInstructions;
  final bool shareBloodGroup;
  final bool shareAllergies;
  final bool shareSafeInstructions;

  Map<String, dynamic> toJson() => {
        'bloodGroup': bloodGroup,
        'allergiesNote': allergiesNote,
        'safeInstructions': safeInstructions,
        'shareBloodGroup': shareBloodGroup,
        'shareAllergies': shareAllergies,
        'shareSafeInstructions': shareSafeInstructions,
        'shareContactsWithResponders': true,
      };
}

class EmergencyController extends AutoDisposeAsyncNotifier<EmergencyProfileData> {
  @override
  Future<EmergencyProfileData> build() async {
    final response = await ref.read(apiClientProvider).raw.get<Map<String, dynamic>>('/owner/emergency-profile');
    return EmergencyProfileData.fromJson(response.data ?? {});
  }

  Future<void> save(EmergencyProfileData data) async {
    await ref.read(apiClientProvider).raw.put<void>('/owner/emergency-profile', data: data.toJson());
    ref.invalidateSelf();
    await future;
  }
}

final emergencyControllerProvider =
    AsyncNotifierProvider.autoDispose<EmergencyController, EmergencyProfileData>(EmergencyController.new);
