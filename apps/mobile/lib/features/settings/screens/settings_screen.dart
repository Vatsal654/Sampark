/// Purpose: Owner settings — notification preferences, biometric app
/// lock, language, session management, and privacy actions (data export,
/// account deletion).
/// Security: Biometric lock here only gates local app access; it is
/// explicitly not the sole account-recovery path — phone-OTP sign-in
/// always remains available (docs/SECURITY.md "Mobile-specific").
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';

import '../../../core/i18n/locale_provider.dart';
import '../../auth/providers/auth_controller.dart';
import '../providers/notification_preferences_controller.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _biometricEnabled = false;

  Future<void> _toggleBiometricLock(bool enable) async {
    if (enable) {
      final auth = LocalAuthentication();
      final canCheck = await auth.canCheckBiometrics || await auth.isDeviceSupported();
      if (!canCheck) return;
      final authenticated = await auth.authenticate(
        localizedReason: 'Confirm to enable app lock',
        options: const AuthenticationOptions(biometricOnly: false),
      );
      if (!authenticated) return;
    }
    setState(() => _biometricEnabled = enable);
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final prefsAsync = ref.watch(notificationPreferencesControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(translate(locale, 'settings'))),
      body: ListView(
        children: [
          ListTile(
            title: const Text('Language'),
            trailing: DropdownButton<AppLocale>(
              value: locale,
              items: const [
                DropdownMenuItem(value: AppLocale.en, child: Text('English')),
                DropdownMenuItem(value: AppLocale.ne, child: Text('नेपाली')),
              ],
              onChanged: (value) {
                if (value != null) ref.read(localeProvider.notifier).state = value;
              },
            ),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Text(translate(locale, 'notificationPreferences'), style: Theme.of(context).textTheme.titleSmall),
          ),
          prefsAsync.when(
            loading: () => const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
            error: (error, _) => Padding(padding: const EdgeInsets.all(16), child: Text(translate(locale, 'errorGeneric'))),
            data: (prefs) => Column(
              children: [
                SwitchListTile(
                  title: Text(translate(locale, 'maskedCallsEnabled')),
                  value: prefs.maskedCallsEnabled,
                  onChanged: (v) => ref
                      .read(notificationPreferencesControllerProvider.notifier)
                      .save(prefs.copyWith(maskedCallsEnabled: v)),
                ),
                SwitchListTile(
                  title: Text(translate(locale, 'emergencyBypass')),
                  value: prefs.emergencyBypassQuietHours,
                  onChanged: (v) => ref
                      .read(notificationPreferencesControllerProvider.notifier)
                      .save(prefs.copyWith(emergencyBypassQuietHours: v)),
                ),
              ],
            ),
          ),
          const Divider(),
          SwitchListTile(
            title: Text(translate(locale, 'biometricLock')),
            value: _biometricEnabled,
            onChanged: _toggleBiometricLock,
          ),
          const Divider(),
          ListTile(
            title: Text(translate(locale, 'exportMyData')),
            leading: const Icon(Icons.download_outlined),
            onTap: () => ref.read(apiClientProvider).raw.get<void>('/owner/privacy/export'),
          ),
          ListTile(
            title: Text(translate(locale, 'signOut')),
            leading: const Icon(Icons.logout),
            onTap: () => ref.read(authControllerProvider.notifier).signOut(),
          ),
          ListTile(
            title: Text(translate(locale, 'signOutAllDevices')),
            leading: const Icon(Icons.devices_other_outlined),
            onTap: () => ref.read(authControllerProvider.notifier).signOutAllDevices(),
          ),
          ListTile(
            title: Text(translate(locale, 'deleteAccount'), style: TextStyle(color: Theme.of(context).colorScheme.error)),
            leading: Icon(Icons.delete_forever_outlined, color: Theme.of(context).colorScheme.error),
            onTap: () => _confirmDeleteAccount(context, ref),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDeleteAccount(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete account?'),
        content: const Text('Your account enters a grace period before permanent deletion. This cannot be undone after that.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(apiClientProvider).raw.post<void>('/owner/privacy/delete-account', data: {'confirm': true});
    }
  }
}
