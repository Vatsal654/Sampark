/// Purpose: Read-only view of one vehicle's full record plus its tag
/// status — the "manage the vehicle and its tag from one place" screen.
/// Responsibilities: Looks the vehicle up by id in the already-loaded
/// vehiclesControllerProvider list (GET /owner/vehicles already returns
/// every field this screen shows, so a second network round-trip isn't
/// needed) and exposes Edit / Delete / Activate Tag from here.
/// Related: providers/vehicles_controller.dart, screens/edit_vehicle_screen.dart,
/// features/tags/screens/tag_activation_screen.dart.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/locale_provider.dart';
import '../../tags/providers/tags_controller.dart';
import '../models/vehicle.dart';
import '../providers/vehicles_controller.dart';

class VehicleDetailsScreen extends ConsumerStatefulWidget {
  const VehicleDetailsScreen({required this.vehicleId, super.key});
  final String vehicleId;

  @override
  ConsumerState<VehicleDetailsScreen> createState() => _VehicleDetailsScreenState();
}

class _VehicleDetailsScreenState extends ConsumerState<VehicleDetailsScreen> {
  bool _deleting = false;
  String? _error;

  Future<void> _confirmDelete(AppLocale locale) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(translate(locale, 'deleteVehicle')),
        content: Text(translate(locale, 'deleteVehicleConfirm')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(translate(locale, 'cancel'))),
          TextButton(onPressed: () => Navigator.pop(context, true), child: Text(translate(locale, 'delete'))),
        ],
      ),
    );
    if (confirmed != true) return;
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
              Text(v.plateNumberMasked, style: Theme.of(context).textTheme.bodyLarge),
              const SizedBox(height: 16),
              _DetailRow(label: translate(locale, 'category'), value: v.category),
              if (v.make != null) _DetailRow(label: translate(locale, 'make'), value: v.make!),
              if (v.model != null) _DetailRow(label: translate(locale, 'model'), value: v.model!),
              if (v.variant != null) _DetailRow(label: translate(locale, 'variant'), value: v.variant!),
              if (v.manufacturingYear != null)
                _DetailRow(label: translate(locale, 'manufacturingYear'), value: '${v.manufacturingYear}'),
              if (v.fuelType != null) _DetailRow(label: translate(locale, 'fuelType'), value: v.fuelType!),
              if (v.color != null) _DetailRow(label: translate(locale, 'vehicleColor'), value: v.color!),
              if (v.vinNumber != null) _DetailRow(label: translate(locale, 'vinNumber'), value: v.vinNumber!),
              if (v.engineNumber != null) _DetailRow(label: translate(locale, 'engineNumber'), value: v.engineNumber!),
              const Divider(height: 32),
              Row(
                children: [
                  // A green check only ever means "active" — paused/reported-lost/replaced/revoked
                  // are all "cannot activate" too, but they are not a good state, so they get no
                  // icon here; the row's own text (below) is what actually names the status.
                  if (v.tagStatus == 'active') ...[
                    const Icon(Icons.verified, color: Colors.green),
                    const SizedBox(width: 8),
                  ],
                  Expanded(child: _DetailRow(label: translate(locale, 'tagStatusLabel'), value: tagStatusLabel(locale, v.tagStatus))),
                ],
              ),
              const SizedBox(height: 16),
              if (canActivateTag(v.tagStatus))
                OutlinedButton.icon(
                  onPressed: () => context.push('/tags/activate', extra: v.id),
                  icon: const Icon(Icons.nfc),
                  label: Text(translate(locale, 'activateTag')),
                ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => context.push('/vehicles/edit', extra: v.id),
                icon: const Icon(Icons.edit_outlined),
                label: Text(translate(locale, 'editVehicle')),
              ),
              const SizedBox(height: 8),
              if (_error != null) ...[
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                const SizedBox(height: 8),
              ],
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
      padding: const EdgeInsets.symmetric(vertical: 4),
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
