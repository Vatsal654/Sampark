import 'package:flutter_test/flutter_test.dart';
import 'package:sampark/core/router/app_router.dart';
import 'package:sampark/features/auth/providers/auth_controller.dart';

void main() {
  group('resolveAuthRedirect', () {
    test('AuthStatus.unknown at /home redirects to /onboarding', () {
      expect(resolveAuthRedirect(AuthStatus.unknown, '/home'), '/onboarding');
    });

    test('AuthStatus.signedOut at /home redirects to /onboarding', () {
      expect(resolveAuthRedirect(AuthStatus.signedOut, '/home'), '/onboarding');
    });

    test('AuthStatus.signedIn at /home stays at /home (no redirect)', () {
      expect(resolveAuthRedirect(AuthStatus.signedIn, '/home'), isNull);
    });

    test('AuthStatus.unknown at /onboarding stays put (no redirect loop)', () {
      expect(resolveAuthRedirect(AuthStatus.unknown, '/onboarding'), isNull);
    });

    test('AuthStatus.signedOut at /onboarding/verify stays put — onboarding sub-routes are not locked out', () {
      expect(resolveAuthRedirect(AuthStatus.signedOut, '/onboarding/verify'), isNull);
    });

    test('AuthStatus.signedIn at /onboarding is sent to /home', () {
      expect(resolveAuthRedirect(AuthStatus.signedIn, '/onboarding'), '/home');
    });

    test('AuthStatus.unknown at a deep-linked owner-only route redirects to /onboarding, not just /home', () {
      expect(resolveAuthRedirect(AuthStatus.unknown, '/vehicles/add'), '/onboarding');
    });
  });
}
