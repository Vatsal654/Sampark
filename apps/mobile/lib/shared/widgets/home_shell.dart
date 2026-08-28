/// Purpose: Authenticated home shell — bottom navigation between the
/// app's core sections.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/i18n/locale_provider.dart';
import '../../features/alerts/screens/alerts_inbox_screen.dart';
import '../../features/documents/screens/document_vault_screen.dart';
import '../../features/emergency/screens/emergency_profile_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/vehicles/screens/vehicle_list_screen.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  static const _screens = [
    VehicleListScreen(),
    AlertsInboxScreen(),
    EmergencyProfileScreen(),
    DocumentVaultScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.directions_car_outlined), label: translate(locale, 'vehicles')),
          NavigationDestination(icon: const Icon(Icons.notifications_outlined), label: translate(locale, 'alerts')),
          NavigationDestination(icon: const Icon(Icons.emergency_outlined), label: translate(locale, 'emergency')),
          NavigationDestination(icon: const Icon(Icons.folder_outlined), label: translate(locale, 'documents')),
          NavigationDestination(icon: const Icon(Icons.settings_outlined), label: translate(locale, 'settings')),
        ],
      ),
    );
  }
}
