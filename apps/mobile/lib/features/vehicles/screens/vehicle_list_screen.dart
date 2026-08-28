/// Purpose: Owner's vehicle list — entry point to add a vehicle, activate
/// a tag, or drill into a vehicle's tag controls.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/locale_provider.dart';
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
              return ListTile(
                leading: const Icon(Icons.directions_car),
                title: Text(vehicle.displayLabel),
                subtitle: Text('${vehicle.category} · ${vehicle.plateNumberMasked}'),
                trailing: vehicle.tagId == null
                    ? OutlinedButton(
                        onPressed: () => context.push('/tags/activate', extra: vehicle.id),
                        child: Text(translate(locale, 'activateTag')),
                      )
                    : const Icon(Icons.verified, color: Colors.green),
              );
            },
          );
        },
      ),
    );
  }
}
