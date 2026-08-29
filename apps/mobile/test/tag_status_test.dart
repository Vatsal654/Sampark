import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/i18n/translations.dart';
import 'package:sampark/features/tags/providers/tags_controller.dart';

void main() {
  group('tagStatusLabel', () {
    test('says no tag associated when tagStatus is null', () {
      expect(tagStatusLabel(AppLocale.en, null), translate(AppLocale.en, 'noTagAssociated'));
    });

    test('gives every known TagStatus (packages/api-contracts/src/enums.ts#TAG_STATUSES) its own label', () {
      const statuses = [
        'active',
        'paused',
        'reported_lost',
        'replaced',
        'revoked',
        'pending_activation',
        'issued',
        'manufactured',
      ];
      for (final status in statuses) {
        final label = tagStatusLabel(AppLocale.en, status);
        expect(label, isNot(status), reason: '$status should resolve to a real label, not fall through unlocalized');
        expect(label, translate(AppLocale.en, 'tagStatus_$status'));
      }
    });

    test('falls back to the raw status string for an unrecognized value rather than a translation key', () {
      expect(tagStatusLabel(AppLocale.en, 'some_future_status'), 'some_future_status');
    });
  });

  group('canActivateTag', () {
    test('allows activation when there is no tag yet', () {
      expect(canActivateTag(null), isTrue);
    });

    test('allows activation for a tag that was issued but never completed activation', () {
      expect(canActivateTag('issued'), isTrue);
      expect(canActivateTag('pending_activation'), isTrue);
    });

    test('blocks activation for a tag that is already bound to a vehicle in some way', () {
      for (final status in ['active', 'paused', 'reported_lost', 'replaced', 'revoked']) {
        expect(canActivateTag(status), isFalse, reason: '$status should not offer Activate Tag');
      }
    });
  });
}
