import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:sampark/core/i18n/translations.dart';
import 'package:sampark/features/tags/screens/tag_activation_screen.dart';

void main() {
  group('scannerErrorMessage', () {
    test('gives an actionable, camera-specific message when the permission was denied', () {
      final message = scannerErrorMessage(AppLocale.en, MobileScannerErrorCode.permissionDenied);
      expect(message, translate(AppLocale.en, 'cameraPermissionDenied'));
      expect(message, isNot(translate(AppLocale.en, 'errorGeneric')));
    });

    for (final code in [
      MobileScannerErrorCode.unsupported,
      MobileScannerErrorCode.genericError,
      MobileScannerErrorCode.controllerAlreadyInitialized,
      MobileScannerErrorCode.controllerUninitialized,
      MobileScannerErrorCode.controllerDisposed,
    ]) {
      test('falls back to the generic error message for $code', () {
        expect(scannerErrorMessage(AppLocale.en, code), translate(AppLocale.en, 'errorGeneric'));
      });
    }
  });
}
