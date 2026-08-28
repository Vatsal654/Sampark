/// Purpose: Top-level navigation graph and the auth redirect guard.
/// Responsibilities: Routes onboarding (unauthenticated) vs. the home
/// shell (authenticated) based on AuthController's status, so a signed-
/// out user can never navigate into an owner-only screen even via a deep
/// link.
/// Related: features/auth/providers/auth_controller.dart, shared/widgets/home_shell.dart.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_controller.dart';
import '../../features/auth/screens/otp_verify_screen.dart';
import '../../features/auth/screens/phone_entry_screen.dart';
import '../../features/documents/screens/document_vault_screen.dart';
import '../../features/emergency/screens/emergency_profile_screen.dart';
import '../../features/tags/screens/tag_activation_screen.dart';
import '../../features/vehicles/screens/add_vehicle_screen.dart';
import '../../shared/widgets/home_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: '/home',
    redirect: (context, state) {
      final isOnboardingRoute = state.matchedLocation.startsWith('/onboarding');
      if (authState.status == AuthStatus.unknown) return null;
      if (authState.status == AuthStatus.signedOut && !isOnboardingRoute) return '/onboarding';
      if (authState.status == AuthStatus.signedIn && isOnboardingRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/onboarding', builder: (context, state) => const PhoneEntryScreen()),
      GoRoute(
        path: '/onboarding/verify',
        builder: (context, state) => OtpVerifyScreen(phoneE164: state.extra! as String),
      ),
      GoRoute(path: '/home', builder: (context, state) => const HomeShell()),
      GoRoute(path: '/vehicles/add', builder: (context, state) => const AddVehicleScreen()),
      GoRoute(
        path: '/tags/activate',
        builder: (context, state) => TagActivationScreen(vehicleId: state.extra! as String),
      ),
      GoRoute(path: '/emergency-profile', builder: (context, state) => const EmergencyProfileScreen()),
      GoRoute(path: '/documents', builder: (context, state) => const DocumentVaultScreen()),
    ],
  );
});
