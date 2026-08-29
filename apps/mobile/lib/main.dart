/// Purpose: App entry point — wires Riverpod, the router, and theming.
library;

import 'dart:developer' as developer;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

/// Temporary diagnostic only (see the "Something went wrong on every tab" investigation) — logs
/// which provider failed and with what error *type*, never the provider's data (so no token/PII
/// risk). This is what actually shows *when* an AsyncNotifier's build() throws, since a non-
/// autoDispose provider's error state is otherwise silent: it's cached and never retried, so
/// nothing prints again even though every tab keeps showing the stale error.
class _DiagnosticProviderObserver extends ProviderObserver {
  @override
  void providerDidFail(ProviderBase<Object?> provider, Object error, StackTrace stackTrace, ProviderContainer container) {
    developer.log(
      'provider FAILED: ${provider.name ?? provider.runtimeType} -> ${error.runtimeType}: $error',
      name: 'sampark.provider',
    );
  }
}

void main() {
  runApp(ProviderScope(observers: [_DiagnosticProviderObserver()], child: const SamparkApp()));
}

class SamparkApp extends ConsumerWidget {
  const SamparkApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Sampark',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      routerConfig: router,
    );
  }
}
