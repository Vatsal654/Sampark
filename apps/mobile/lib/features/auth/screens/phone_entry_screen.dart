/// Purpose: First onboarding screen — collects and normalizes a Nepali
/// phone number, then requests an OTP.
/// Related: features/auth/providers/auth_controller.dart,
/// features/auth/screens/otp_verify_screen.dart.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/locale_provider.dart';
import '../providers/auth_controller.dart';

String? normalizeNepaliPhone(String raw) {
  final stripped = raw.replaceAll(RegExp(r'[\s-]'), '');
  String candidate;
  if (stripped.startsWith('+977')) {
    candidate = stripped;
  } else if (stripped.startsWith('977')) {
    candidate = '+$stripped';
  } else if (stripped.startsWith('0')) {
    candidate = '+977${stripped.substring(1)}';
  } else if (RegExp(r'^9\d{9}$').hasMatch(stripped)) {
    candidate = '+977$stripped';
  } else {
    return null;
  }
  return RegExp(r'^\+9779\d{9}$').hasMatch(candidate) ? candidate : null;
}

class PhoneEntryScreen extends ConsumerStatefulWidget {
  const PhoneEntryScreen({super.key});

  @override
  ConsumerState<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends ConsumerState<PhoneEntryScreen> {
  final _controller = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final normalized = normalizeNepaliPhone(_controller.text);
    if (normalized == null) {
      setState(() => _error = translate(ref.read(localeProvider), 'invalidPhone'));
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).requestOtp(normalized);
      if (mounted) context.push('/onboarding/verify', extra: normalized);
    } catch (_) {
      if (mounted) setState(() => _error = translate(ref.read(localeProvider), 'errorGeneric'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.watch(localeProvider);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Sampark', style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text(translate(t, 'onboardingTitle'), style: Theme.of(context).textTheme.bodyLarge),
              const SizedBox(height: 32),
              TextField(
                controller: _controller,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: translate(t, 'phoneNumberLabel'),
                  prefixText: '+977 ',
                  border: const OutlineInputBorder(),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                child: Text(translate(t, 'sendCode')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
