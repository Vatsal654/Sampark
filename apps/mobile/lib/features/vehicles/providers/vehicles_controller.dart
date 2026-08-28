/// Purpose: Fetches and mutates the owner's vehicle list.
/// Related: core/network/api_client.dart, models/vehicle.dart.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../auth/providers/auth_controller.dart';
import '../models/vehicle.dart';

class VehiclesController extends AsyncNotifier<List<Vehicle>> {
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Future<List<Vehicle>> build() async {
    final response = await _api.raw.get<List<dynamic>>('/owner/vehicles');
    return (response.data ?? []).map((e) => Vehicle.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> addVehicle({
    required String displayLabel,
    required String category,
    required String plateNumber,
  }) async {
    await _api.raw.post<void>('/owner/vehicles', data: {
      'displayLabel': displayLabel,
      'category': category,
      'plateNumber': plateNumber,
    });
    ref.invalidateSelf();
    await future;
  }
}

final vehiclesControllerProvider = AsyncNotifierProvider<VehiclesController, List<Vehicle>>(VehiclesController.new);
