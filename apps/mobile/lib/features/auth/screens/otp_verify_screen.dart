/// Purpose: Second onboarding screen — verifies the OTP code and, on
/// success, the router's redirect guard sends the user into the app.
/// Related: features/auth/providers/auth_controller.dart.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/locale_provider.dart';
import '../../../core/network/api_error_logger.dart';
import '../providers/auth_controller.dart';

class OtpVerifyScreen extends ConsumerStatefulWidget {
  const OtpVerifyScreen({required this.phoneE164, super.key});
  final String phoneE164;

  @override
  ConsumerState<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends ConsumerState<OtpVerifyScreen> {
  final _controller = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final locale = ref.read(localeProvider);
    if (_controller.text.length != 6) {
      setState(() => _error = translate(locale, 'invalidCode'));
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).verifyOtp(widget.phoneE164, _controller.text);
      // On success, the app's top-level router redirect (driven by authControllerProvider's
      // state) takes the user to the home shell — no explicit navigation needed here.
    } catch (error, stackTrace) {
      logApiError('verifyOtp', error, stackTrace);
      if (mounted) setState(() => _error = translate(locale, 'errorGeneric'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(translate(locale, 'enterCode'), style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextField(
                controller: _controller,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, letterSpacing: 8),
                decoration: const InputDecoration(counterText: ''),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                child: Text(translate(locale, 'verify')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
