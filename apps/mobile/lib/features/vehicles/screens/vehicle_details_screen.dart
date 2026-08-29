/// Purpose: Read-only view of one vehicle's full record plus its tag
/// status — the "manage the vehicle and its tag from one place" screen.
/// Responsibilities: Looks the vehicle up by id in the already-loaded
/// vehiclesControllerProvider list (GET /owner/vehicles already returns
/// every field this screen shows, including the full plate — see
/// VehiclesService.toView) and exposes Edit / Delete / the tag lifecycle
/// actions appropriate to its current status.
/// Related: providers/vehicles_controller.dart, features/tags/providers/tags_controller.dart,
/// screens/edit_vehicle_screen.dart, features/tags/screens/tag_activation_screen.dart.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/locale_provider.dart';
import '../../tags/providers/tags_controller.dart';
import '../models/vehicle.dart';
import '../providers/vehicles_controller.dart';
import '../vehicle_display.dart';

class VehicleDetailsScreen extends ConsumerStatefulWidget {
  const VehicleDetailsScreen({required this.vehicleId, super.key});
  final String vehicleId;

  @override
  ConsumerState<VehicleDetailsScreen> createState() => _VehicleDetailsScreenState();
}

class _VehicleDetailsScreenState extends ConsumerState<VehicleDetailsScreen> {
  bool _deleting = false;
  bool _tagActionInProgress = false;
  String? _error;

  Future<bool> _confirm(AppLocale locale, {required String title, required String body, required String confirmLabel}) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(translate(locale, 'cancel'))),
          TextButton(onPressed: () => Navigator.pop(context, true), child: Text(confirmLabel)),
        ],
      ),
    );
    return confirmed == true;
  }

  Future<void> _confirmDelete(AppLocale locale) async {
    final confirmed = await _confirm(
      locale,
      title: translate(locale, 'deleteVehicle'),
      body: translate(locale, 'deleteVehicleConfirm'),
      confirmLabel: translate(locale, 'delete'),
    );
    if (!confirmed) return;
    setState(() {
      _deleting = true;
      _error = null;
    });
    try {
      await ref.read(vehiclesControllerProvider.notifier).deleteVehicle(widget.vehicleId);
      if (mounted) context.pop();
    } catch (_) {
      if (mounted) setState(() => _error = translate(locale, 'errorGeneric'));
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  Future<void> _pauseTag(AppLocale locale, String tagId) async {
    final confirmed = await _confirm(
      locale,
      title: translate(locale, 'pauseTagConfirmTitle'),
      body: translate(locale, 'pauseTagConfirmBody'),
      confirmLabel: translate(locale, 'pause'),
    );
    if (!confirmed) return;
    await _runTagAction(locale, () => ref.read(tagsControllerProvider).pause(tagId));
  }

  Future<void> _reactivateTag(String tagId) async {
    final locale = ref.read(localeProvider);
    await _runTagAction(locale, () => ref.read(tagsControllerProvider).resume(tagId));
  }

  Future<void> _reportTagLost(AppLocale locale, String tagId) async {
    final confirmed = await _confirm(
      locale,
      title: translate(locale, 'reportTagLostConfirmTitle'),
      body: translate(locale, 'reportTagLostConfirmBody'),
      confirmLabel: translate(locale, 'reportLostAction'),
    );
    if (!confirmed) return;
    await _runTagAction(locale, () => ref.read(tagsControllerProvider).reportLost(tagId));
  }

  Future<void> _runTagAction(AppLocale locale, Future<void> Function() action) async {
    setState(() {
      _tagActionInProgress = true;
      _error = null;
    });
    try {
      await action();
      // The vehicle list/details screen holds this vehicle's tagStatus in
      // vehiclesControllerProvider's state; invalidating it here is what makes this screen
      // reflect the new status immediately instead of showing stale state until some unrelated
      // refresh.
      ref.invalidate(vehiclesControllerProvider);
    } catch (_) {
      if (mounted) setState(() => _error = translate(locale, 'errorGeneric'));
    } finally {
      if (mounted) setState(() => _tagActionInProgress = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final vehiclesAsync = ref.watch(vehiclesControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(translate(locale, 'vehicleDetails'))),
      body: vehiclesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(translate(locale, 'errorGeneric'))),
        data: (vehicles) {
          Vehicle? vehicle;
          for (final candidate in vehicles) {
            if (candidate.id == widget.vehicleId) {
              vehicle = candidate;
              break;
            }
          }
          if (vehicle == null) {
            // The vehicle was deleted (by this screen or elsewhere) and the list already
            // refreshed — nothing left to show here.
            return Center(child: Text(translate(locale, 'errorGeneric')));
          }
          final v = vehicle;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(v.displayLabel, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text(v.plateNumber, style: Theme.of(context).textTheme.bodyLarge),
              const SizedBox(height: 16),
              _DetailRow(label: translate(locale, 'category'), value: categoryDisplayLabel(locale, v.category)),
              if (v.make != null) _DetailRow(label: translate(locale, 'make'), value: v.make!),
              if (v.model != null) _DetailRow(label: translate(locale, 'model'), value: v.model!),
              if (v.variant != null) _DetailRow(label: translate(locale, 'variant'), value: v.variant!),
              if (v.manufacturingYear != null)
                _DetailRow(label: translate(locale, 'manufacturingYear'), value: '${v.manufacturingYear}'),
              if (v.fuelType != null) _DetailRow(label: translate(locale, 'fuelType'), value: fuelTypeDisplayLabel(locale, v.fuelType)),
              if (v.color != null) _DetailRow(label: translate(locale, 'vehicleColor'), value: v.color!),
              if (v.vinNumber != null) _DetailRow(label: translate(locale, 'vinNumber'), value: v.vinNumber!),
              if (v.engineNumber != null) _DetailRow(label: translate(locale, 'engineNumber'), value: v.engineNumber!),
              const Divider(height: 32),
              Text(translate(locale, 'tagSectionTitle'), style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Row(
                children: [
                  // A green check only ever means "active" — paused/reported-lost/replaced/revoked
                  // are all "cannot activate" too, but they are not a good state, so they get no
                  // icon here; the text below is what actually names the status.
                  if (v.tagStatus == 'active') ...[
                    const Icon(Icons.verified, color: Colors.green),
                    const SizedBox(width: 8),
                  ],
                  Text(tagStatusLabel(locale, v.tagStatus), style: Theme.of(context).textTheme.bodyLarge),
                ],
              ),
              const SizedBox(height: 12),
              if (canActivateTag(v.tagStatus))
                OutlinedButton.icon(
                  onPressed: () => context.push('/tags/activate', extra: v.id),
                  icon: const Icon(Icons.nfc),
                  label: Text(translate(locale, 'activateTag')),
                )
              else if (v.tagStatus == 'active' || v.tagStatus == 'paused') ...[
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _tagActionInProgress
                            ? null
                            : () => v.tagStatus == 'active' ? _pauseTag(locale, v.tagId!) : _reactivateTag(v.tagId!),
                        child: Text(translate(locale, v.tagStatus == 'active' ? 'pauseTag' : 'resumeTag')),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _tagActionInProgress ? null : () => _reportTagLost(locale, v.tagId!),
                        style: OutlinedButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
                        child: Text(translate(locale, 'reportLostAction')),
                      ),
                    ),
                  ],
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 28),
              FilledButton.icon(
                onPressed: () => context.push('/vehicles/edit', extra: v.id),
                icon: const Icon(Icons.edit_outlined),
                label: Text(translate(locale, 'editVehicle')),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _deleting ? null : () => _confirmDelete(locale),
                style: OutlinedButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
                icon: const Icon(Icons.delete_outline),
                label: Text(translate(locale, 'deleteVehicle')),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 140, child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
          Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}
