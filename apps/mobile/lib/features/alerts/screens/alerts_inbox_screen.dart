/// Purpose: Owner alert inbox — Active/Archived tabs, category, time,
/// delivery status, a coarse location label, and (only when the scanner
/// explicitly opted in) the scanner's exact shared location. Never shows
/// a scanner phone number, which this app never receives for anonymous
/// alerts.
/// Responsibilities: Acknowledge/Archive/Unarchive are never optimistic
/// — each button shows a spinner while its mutation is in flight, a
/// failure is surfaced via a SnackBar with the button left untouched (so
/// it can be retried), and the state shown afterward (which tab an alert
/// appears under, the "Acknowledged" badge) comes only from the real,
/// refetched server response (see AlertsController.acknowledge/
/// archive/unarchive, which each await their POST and then re-fetch the
/// whole list before returning) — an alert moves from Active to Archived
/// purely because a fresh GET now returns a non-null archivedAt for it,
/// never a local-only flag. Reopening the screen or restarting the app
/// always re-fetches from the server (AutoDisposeAsyncNotifier has no
/// local cache to go stale), so the Active/Archived split is correct
/// immediately, not just within one session.
/// Debugging: every mutation's outcome (success or failure) also goes
/// through logApiError (visible in `flutter run`/DevTools) AND, in debug
/// builds only, an on-page diagnostics line on the card — this screen
/// used to `catch (_) { ... }` and discard the real error entirely,
/// exactly the class of bug api_error_logger.dart's header comment
/// describes for the OTP flow, which made a physical-device failure here
/// impossible to diagnose remotely. Never shown in release builds; never
/// includes a phone number, token, or other PII (see redactForLog).
library;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/i18n/locale_provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error_logger.dart';
import '../../auth/providers/auth_controller.dart';
import '../models/alert_event.dart';
import '../providers/alerts_controller.dart';

class AlertsInboxScreen extends ConsumerWidget {
  const AlertsInboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final alertsAsync = ref.watch(alertsControllerProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(translate(locale, 'alerts')),
          bottom: TabBar(
            tabs: [
              Tab(text: translate(locale, 'activeAlertsTab')),
              Tab(text: translate(locale, 'archivedAlertsTab')),
            ],
          ),
        ),
        body: alertsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text(translate(locale, 'errorGeneric'))),
          data: (alerts) {
            final active = alerts.where((a) => a.archivedAt == null).toList();
            final archived = alerts.where((a) => a.archivedAt != null).toList();
            return TabBarView(
              children: [
                _AlertList(ref: ref, alerts: active, emptyLabel: translate(locale, 'noAlertsYet')),
                _AlertList(ref: ref, alerts: archived, emptyLabel: translate(locale, 'noArchivedAlertsYet')),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _AlertList extends StatelessWidget {
  const _AlertList({required this.ref, required this.alerts, required this.emptyLabel});
  final WidgetRef ref;
  final List<AlertEvent> alerts;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    if (alerts.isEmpty) {
      return Center(child: Text(emptyLabel));
    }
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(alertsControllerProvider),
      child: ListView.builder(
        itemCount: alerts.length,
        itemBuilder: (context, index) => _AlertCard(alert: alerts[index]),
      ),
    );
  }
}

/// A coarse, non-PII classification of why a mutation (acknowledge/archive/unarchive) failed —
/// mirrors apps/scanner-portal/lib/api-client.ts's ApiErrorKind: the point is that "the server
/// said no" (a real 4xx), "the server is broken" (5xx), "the session expired", and "the request
/// never reached any server at all" (network/connection failure) are different, actionable
/// situations that a bare "Something went wrong" collapses into one indistinguishable message.
String _classifyMutationError(Object error) {
  if (error is ForcedLogoutException) return 'session_expired';
  // An if-else chain rather than a switch on DioExceptionType deliberately avoids relying on
  // enum-exhaustiveness checking — a future Dio version adding a new DioExceptionType member
  // (this app's pubspec pins `dio: ^5.4.3+1`, so a newer 5.x can resolve on `flutter pub get`)
  // can't turn this into a missing-return compile error; it just falls through to 'unknown'.
  if (error is DioException) {
    const networkTypes = {
      DioExceptionType.connectionError,
      DioExceptionType.connectionTimeout,
      DioExceptionType.sendTimeout,
      DioExceptionType.receiveTimeout,
    };
    if (networkTypes.contains(error.type)) return 'network_error';
    if (error.type == DioExceptionType.badResponse) {
      final status = error.response?.statusCode;
      if (status == 401 || status == 403) return 'unauthorized';
      if (status != null && status >= 500) return 'server_error';
      if (status != null && status >= 400) return 'client_error';
    }
  }
  return 'unknown';
}

/// A safe-to-display (never PII) one-line description of a caught mutation error — reuses
/// api_error_logger.dart's redactForLog for the response body, same redaction guarantee as the
/// console log this mirrors.
String _describeMutationError(Object error) {
  if (error is ForcedLogoutException) return 'Session expired — sign in again';
  if (error is DioException) {
    final status = error.response?.statusCode;
    final body = error.response?.data;
    return 'DioException(${error.type.name}'
        '${status != null ? ', status=$status' : ''})'
        '${body != null ? ': ${redactForLog(body)}' : ''}';
  }
  return error.runtimeType.toString();
}

/// The outcome of the most recent acknowledge/archive/unarchive attempt on one card — shown only
/// in debug builds (see _AlertCardState.build), never in release. No alert content (category,
/// note, location) is ever part of this — only the request shape and outcome.
class _MutationDiagnostics {
  const _MutationDiagnostics({
    required this.action,
    required this.method,
    required this.url,
    this.submissionStarted = false,
    this.responseStatus,
    this.exception,
    this.classification,
  });

  final String action;
  final String method;
  final String url;
  final bool submissionStarted;
  final int? responseStatus;
  final String? exception;
  final String? classification;
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
  bool _unarchiving = false;
  _MutationDiagnostics? _lastMutation;

  String _urlFor(String action) {
    final baseUrl = ref.read(apiClientProvider).raw.options.baseUrl;
    return '$baseUrl/owner/alerts/${widget.alert.id}/$action';
  }

  Future<void> _runMutation({
    required String action,
    required void Function(bool) setBusy,
    required Future<void> Function() call,
  }) async {
    setBusy(true);
    setState(() {
      _lastMutation = _MutationDiagnostics(action: action, method: 'POST', url: _urlFor(action), submissionStarted: true);
    });
    try {
      await call();
      if (mounted) {
        setState(() {
          _lastMutation = _MutationDiagnostics(
            action: action,
            method: 'POST',
            url: _urlFor(action),
            submissionStarted: true,
            responseStatus: 201,
            classification: 'success',
          );
        });
      }
    } catch (error, stackTrace) {
      // Restores exactly the visibility api_error_logger.dart's header comment describes fixing
      // for the OTP flow — this screen's `catch (_) { ... }` previously discarded the real error
      // entirely, so a physical-device failure had no trace anywhere.
      logApiError('AlertsInboxScreen.$action', error, stackTrace);
      final classification = _classifyMutationError(error);
      if (mounted) {
        setState(() {
          _lastMutation = _MutationDiagnostics(
            action: action,
            method: 'POST',
            url: _urlFor(action),
            submissionStarted: true,
            responseStatus: error is DioException ? error.response?.statusCode : null,
            exception: _describeMutationError(error),
            classification: classification,
          );
        });
      }
      _showError(classification);
    } finally {
      if (mounted) setBusy(false);
    }
  }

  Future<void> _handleAcknowledge() => _runMutation(
        action: 'acknowledge',
        setBusy: (busy) => setState(() => _acknowledging = busy),
        call: () => ref.read(alertsControllerProvider.notifier).acknowledge(widget.alert.id),
      );

  Future<void> _handleArchive() => _runMutation(
        action: 'archive',
        setBusy: (busy) => setState(() => _archiving = busy),
        call: () => ref.read(alertsControllerProvider.notifier).archive(widget.alert.id),
      );

  Future<void> _handleUnarchive() => _runMutation(
        action: 'unarchive',
        setBusy: (busy) => setState(() => _unarchiving = busy),
        call: () => ref.read(alertsControllerProvider.notifier).unarchive(widget.alert.id),
      );

  void _showError([String? classification]) {
    if (!mounted) return;
    final locale = ref.read(localeProvider);
    final message = classification == 'session_expired'
        ? translate(locale, 'errorSessionExpired')
        : classification == 'network_error'
            ? translate(locale, 'errorNetwork')
            : translate(locale, 'errorGeneric');
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _openInMaps(ScannerLocation location) async {
    final uri = mapsUriFor(location);
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
                      Text(
                        translate(locale, 'archivedLabel'),
                        key: Key('archived-status-badge-${alert.id}'),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(width: 8),
                      TextButton(
                        onPressed: _unarchiving ? null : _handleUnarchive,
                        child: _unarchiving
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                            : Text(translate(locale, 'unarchive')),
                      ),
                    ],
                  ),
              ],
            ),
            if (kDebugMode && _lastMutation != null) _MutationDiagnosticsPanel(data: _lastMutation!),
          ],
        ),
      ),
    );
  }
}

/// Dev-only (never in a release build — gated by kDebugMode in _AlertCardState.build) on-card
/// diagnostics for the most recent acknowledge/archive/unarchive attempt. No alert content is
/// rendered here — only the request shape and its outcome, and the exception text already went
/// through redactForLog before reaching this widget.
class _MutationDiagnosticsPanel extends StatelessWidget {
  const _MutationDiagnosticsPanel({required this.data});
  final _MutationDiagnostics data;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: Key('mutation-diagnostics-${data.action}'),
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade400), borderRadius: BorderRadius.circular(4)),
      child: DefaultTextStyle(
        style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Colors.black87),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Dev diagnostics (debug builds only)', style: TextStyle(fontWeight: FontWeight.bold)),
            Text('action: ${data.action}'),
            Text('method: ${data.method}'),
            Text('url: ${data.url}'),
            Text('submissionStarted: ${data.submissionStarted}'),
            Text('responseStatus: ${data.responseStatus ?? '(none)'}'),
            Text('exception: ${data.exception ?? '(none)'}'),
            Text('classification: ${data.classification ?? '(pending)'}'),
          ],
        ),
      ),
    );
  }
}
