/// Purpose: Owner tag lifecycle actions (activate/pause/resume/report-lost).
/// Security: Activation requires both a signed QR/NFC-scanned opaque ID
/// AND a physical activation PIN — possession of the URL alone never
/// activates a tag (docs/THREAT_MODEL.md §3.2). This controller does not
/// parse the signature itself; the backend re-verifies it server-side.
/// Related: core/network/api_client.dart.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/locale_provider.dart';
import '../../auth/providers/auth_controller.dart';

class TagsController {
  TagsController(this._ref);
  final Ref _ref;

  Future<void> activate({required String opaqueId, required String activationPin, required String vehicleId}) async {
    final api = _ref.read(apiClientProvider);
    await api.raw.post<void>('/owner/tags/activate', data: {
      'opaqueId': opaqueId,
      'activationPin': activationPin,
      'vehicleId': vehicleId,
    });
  }

  Future<void> pause(String tagId) => _ref.read(apiClientProvider).raw.post<void>('/owner/tags/$tagId/pause');
  Future<void> resume(String tagId) => _ref.read(apiClientProvider).raw.post<void>('/owner/tags/$tagId/resume');
  Future<void> reportLost(String tagId) => _ref.read(apiClientProvider).raw.post<void>('/owner/tags/$tagId/report-lost');
}

final tagsControllerProvider = Provider<TagsController>((ref) => TagsController(ref));

/// Extracts the opaque tag ID from a scanned "https://scan.../t/{id}.{sig}"
/// URL (or a bare "{id}.{sig}" payload from NFC), matching the parsing
/// logic in packages/shared-security/tag-signature.ts#parseTagPath.
String? extractOpaqueIdFromScan(String raw) {
  final withoutScheme = raw.contains('/t/') ? raw.split('/t/').last : raw;
  final dotIndex = withoutScheme.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex == withoutScheme.length - 1) return null;
  return withoutScheme.substring(0, dotIndex);
}

/// Maps a Vehicle.tagStatus (packages/api-contracts/src/enums.ts#TAG_STATUSES, or null
/// when no tag is associated yet) to a localized label for VehicleDetailsScreen. Pure/no
/// BuildContext so it's unit-testable without pumping a widget.
String tagStatusLabel(AppLocale locale, String? tagStatus) {
  if (tagStatus == null) return translate(locale, 'noTagAssociated');
  const knownStatuses = {
    'active',
    'paused',
    'reported_lost',
    'replaced',
    'revoked',
    'pending_activation',
    'issued',
    'manufactured',
  };
  if (!knownStatuses.contains(tagStatus)) return tagStatus;
  return translate(locale, 'tagStatus_$tagStatus');
}

/// A tag can be activated onto this vehicle only while it has no tag at all, or has one that
/// was issued but never completed activation — everything else (active/paused/lost/etc.) is a
/// real, already-bound tag and must go through pause/report-lost/reassign instead.
bool canActivateTag(String? tagStatus) => tagStatus == null || tagStatus == 'issued' || tagStatus == 'pending_activation';
