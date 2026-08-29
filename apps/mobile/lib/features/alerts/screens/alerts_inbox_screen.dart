/// Purpose: Owner alert inbox — shows category, time, delivery status,
/// a coarse location label, and (only when the scanner explicitly opted
/// in) the scanner's exact shared location. Never shows a scanner phone
/// number, which this app never receives for anonymous alerts.
/// Responsibilities: Acknowledge/Archive are never optimistic — the
/// button shows a spinner while the mutation is in flight, a failure is
/// surfaced via a SnackBar with the button left untouched (so it can be
/// retried), and the "Acknowledged"/"Archived" state shown afterward
/// comes only from the real, refetched server response (see
/// AlertsController.acknowledge/archive, which await the POST and then
/// re-fetch the whole list before returning).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/i18n/locale_provider.dart';
import '../models/alert_event.dart';
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
              itemBuilder: (context, index) => _AlertCard(alert: alerts[index]),
            ),
          );
        },
      ),
    );
  }
}

class _AlertCard extends ConsumerStatefulWidget {
  const _AlertCard({required this.alert});
  final AlertEvent alert;

  @override
  ConsumerState<_AlertCard> createState() => _AlertCardState();
}

class _AlertCardState extends ConsumerState<_AlertCard> {
  bool _acknowledging = false;
  bool _archiving = false;

  Future<void> _handleAcknowledge() async {
    setState(() => _acknowledging = true);
    try {
      await ref.read(alertsControllerProvider.notifier).acknowledge(widget.alert.id);
    } catch (_) {
      _showError();
    } finally {
      if (mounted) setState(() => _acknowledging = false);
    }
  }

  Future<void> _handleArchive() async {
    setState(() => _archiving = true);
    try {
      await ref.read(alertsControllerProvider.notifier).archive(widget.alert.id);
    } catch (_) {
      _showError();
    } finally {
      if (mounted) setState(() => _archiving = false);
    }
  }

  void _showError() {
    if (!mounted) return;
    final locale = ref.read(localeProvider);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(translate(locale, 'errorGeneric'))));
  }

  Future<void> _openInMaps(ScannerLocation location) async {
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      _showError();
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final alert = widget.alert;
    final isEmergency = alert.severity == 'emergency';
    final exactLocation = alert.scannerLocationExact;

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
            if (exactLocation != null) ...[
              const SizedBox(height: 4),
              Text(translate(locale, 'locationSharedLabel'), style: Theme.of(context).textTheme.bodySmall),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () => _openInMaps(exactLocation),
                  icon: const Icon(Icons.map_outlined, size: 18),
                  label: Text(translate(locale, 'openInMaps')),
                ),
              ),
            ],
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
                    onPressed: _acknowledging ? null : _handleAcknowledge,
                    child: _acknowledging
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(translate(locale, 'acknowledge')),
                  )
                else
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle, size: 16, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 4),
                      Text(translate(locale, 'acknowledgedLabel'), style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                const SizedBox(width: 12),
                if (alert.archivedAt == null)
                  TextButton(
                    onPressed: _archiving ? null : _handleArchive,
                    child: _archiving
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(translate(locale, 'archive')),
                  )
                else
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.archive, size: 16, color: Theme.of(context).colorScheme.secondary),
                      const SizedBox(width: 4),
                      Text(translate(locale, 'archivedLabel'), style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
