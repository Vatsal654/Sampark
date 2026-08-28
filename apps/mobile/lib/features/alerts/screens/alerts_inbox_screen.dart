/// Purpose: Owner alert inbox — shows category, time, delivery status,
/// and only a coarse location label (never a scanner phone number, which
/// this app never receives for anonymous alerts).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/locale_provider.dart';
import '../providers/alerts_controller.dart';

class AlertsInboxScreen extends ConsumerWidget {
  const AlertsInboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final alertsAsync = ref.watch(alertsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(translate(locale, 'alerts'))),
      body: alertsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(translate(locale, 'errorGeneric'))),
        data: (alerts) {
          if (alerts.isEmpty) {
            return Center(child: Text(translate(locale, 'noAlertsYet')));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(alertsControllerProvider),
            child: ListView.builder(
              itemCount: alerts.length,
              itemBuilder: (context, index) {
                final alert = alerts[index];
                final isEmergency = alert.severity == 'emergency';
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            if (isEmergency)
                              Icon(Icons.warning_amber_rounded, color: Theme.of(context).colorScheme.error, size: 18),
                            if (isEmergency) const SizedBox(width: 4),
                            Text(alert.category.replaceAll('_', ' '), style: Theme.of(context).textTheme.titleSmall),
                          ],
                        ),
                        Text(alert.createdAt.toLocal().toString(), style: Theme.of(context).textTheme.bodySmall),
                        if (alert.scannerLocationLabel != null) Text(alert.scannerLocationLabel!),
                        if (alert.note != null) Text(alert.note!),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: alert.deliveries
                              .map((d) => Chip(label: Text('${d.channel}: ${d.status}'), visualDensity: VisualDensity.compact))
                              .toList(),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            if (alert.acknowledgedAt == null)
                              TextButton(
                                onPressed: () => ref.read(alertsControllerProvider.notifier).acknowledge(alert.id),
                                child: Text(translate(locale, 'acknowledge')),
                              ),
                            if (alert.archivedAt == null)
                              TextButton(
                                onPressed: () => ref.read(alertsControllerProvider.notifier).archive(alert.id),
                                child: Text(translate(locale, 'archive')),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
