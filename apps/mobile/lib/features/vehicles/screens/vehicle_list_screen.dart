/// Purpose: Owner's vehicle list — entry point to add a vehicle, activate
/// a tag, or drill into a vehicle's tag controls.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/locale_provider.dart';
import '../../tags/providers/tags_controller.dart';
import '../providers/vehicles_controller.dart';

class VehicleListScreen extends ConsumerWidget {
  const VehicleListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final vehiclesAsync = ref.watch(vehiclesControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(translate(locale, 'vehicles'))),
      floatingActionButton: FloatingActionButton.extended(
        // Explicit, unique heroTag: HomeShell keeps every tab (including DocumentVaultScreen,
        // which also has its own FAB) mounted simultaneously via IndexedStack, so without this
        // both FABs share Flutter's implicit default tag and any navigation within this subtree
        // throws "There are multiple heroes that share the same tag".
        heroTag: 'vehicleListFab',
        onPressed: () => context.push('/vehicles/add'),
        icon: const Icon(Icons.add),
        label: Text(translate(locale, 'addVehicle')),
      ),
      body: vehiclesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(translate(locale, 'errorGeneric'))),
        data: (vehicles) {
          if (vehicles.isEmpty) {
            return Center(child: Text(translate(locale, 'addVehicle')));
          }
          return ListView.builder(
            itemCount: vehicles.length,
            itemBuilder: (context, index) {
              final vehicle = vehicles[index];
              final makeModel = [vehicle.make, vehicle.model].whereType<String>().join(' ');
              final subtitleParts = [
                vehicle.plateNumberMasked,
                if (makeModel.isNotEmpty) makeModel,
                tagStatusLabel(locale, vehicle.tagStatus),
              ];
              return ListTile(
                leading: const Icon(Icons.directions_car),
                title: Text(vehicle.displayLabel),
                subtitle: Text(subtitleParts.join(' · ')),
                trailing: canActivateTag(vehicle.tagStatus)
                    ? OutlinedButton(
                        onPressed: () => context.push('/tags/activate', extra: vehicle.id),
                        child: Text(translate(locale, 'activateTag')),
                      )
                    // A green check only means "active" — paused/reported-lost/replaced/revoked
                    // still can't be (re)activated from here, but they are not a good state, so
                    // they get no icon; the subtitle above already spells out the actual status.
                    : vehicle.tagStatus == 'active'
                        ? const Icon(Icons.verified, color: Colors.green)
                        : null,
                onTap: () => context.push('/vehicles/details', extra: vehicle.id),
              );
            },
          );
        },
      ),
    );
  }
}
