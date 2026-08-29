/// Purpose: Top-level navigation graph and the auth redirect guard.
/// Responsibilities: Routes onboarding (unauthenticated) vs. the home
/// shell (authenticated) based on AuthController's status, so a signed-
/// out user can never navigate into an owner-only screen even via a deep
/// link.
/// Related: features/auth/providers/auth_controller.dart, shared/widgets/home_shell.dart.
library;

import 'dart:developer' as developer;

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
import '../../features/vehicles/screens/edit_vehicle_screen.dart';
import '../../features/vehicles/screens/vehicle_details_screen.dart';
import '../../shared/widgets/home_shell.dart';

/// The redirect decision itself, pulled out as a pure function (no BuildContext/GoRouterState)
/// so it's unit-testable directly rather than only indirectly through a full GoRouter + widget
/// pump. AuthStatus.unknown is the state between app start and AuthController._bootstrap()
/// resolving (an async secure-storage read) — treating it as "no redirect needed", like
/// signedOut wasn't, used to let initialLocation (/home) through with no session at all, mounting
/// every owner-only provider before a token had even been read. Folding unknown into the same
/// check as signedOut closes that: only a *confirmed* signedIn status may reach a non-onboarding
/// route.
String? resolveAuthRedirect(AuthStatus status, String matchedLocation) {
  final isOnboardingRoute = matchedLocation.startsWith('/onboarding');
  if (status != AuthStatus.signedIn && !isOnboardingRoute) return '/onboarding';
  if (status == AuthStatus.signedIn && isOnboardingRoute) return '/home';
  return null;
}

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: '/home',
    redirect: (context, state) {
      final redirectTo = resolveAuthRedirect(authState.status, state.matchedLocation);
      developer.log(
        'router redirect: status=${authState.status} matchedLocation=${state.matchedLocation} -> ${redirectTo ?? '(none)'}',
        name: 'sampark.auth',
      );
      return redirectTo;
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
        path: '/vehicles/details',
        builder: (context, state) => VehicleDetailsScreen(vehicleId: state.extra! as String),
      ),
      GoRoute(
        path: '/vehicles/edit',
        builder: (context, state) => EditVehicleScreen(vehicleId: state.extra! as String),
      ),
      GoRoute(
        path: '/tags/activate',
        builder: (context, state) => TagActivationScreen(vehicleId: state.extra! as String),
      ),
      GoRoute(path: '/emergency-profile', builder: (context, state) => const EmergencyProfileScreen()),
      GoRoute(path: '/documents', builder: (context, state) => const DocumentVaultScreen()),
    ],
  );
});
