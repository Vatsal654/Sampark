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
    String? make,
    String? model,
    String? variant,
    int? manufacturingYear,
    String? fuelType,
    String? color,
    String? vinNumber,
    String? engineNumber,
  }) async {
    await _api.raw.post<void>('/owner/vehicles', data: {
      'displayLabel': displayLabel,
      'category': category,
      'plateNumber': plateNumber,
      if (make != null) 'make': make,
      if (model != null) 'model': model,
      if (variant != null) 'variant': variant,
      if (manufacturingYear != null) 'manufacturingYear': manufacturingYear,
      if (fuelType != null) 'fuelType': fuelType,
      if (color != null) 'color': color,
      if (vinNumber != null) 'vinNumber': vinNumber,
      if (engineNumber != null) 'engineNumber': engineNumber,
    });
    ref.invalidateSelf();
    await future;
  }

  /// Updates only the fields that are non-null, matching the backend's PATCH
  /// semantics (packages/api-contracts/src/vehicle.ts#updateVehicleSchema is
  /// createVehicleSchema.partial() — an omitted field is left unchanged
  /// server-side, it is never cleared). `plateNumber` is optional here for
  /// the same reason the edit form leaves it blank by default: the backend
  /// never returns the full plate on read (only plateNumberMasked), so there
  /// is nothing to prefill and no way to "re-send the same value" — omitting
  /// it is the only correct way to leave it unchanged.
  Future<void> updateVehicle({
    required String vehicleId,
    String? displayLabel,
    String? category,
    String? plateNumber,
    String? make,
    String? model,
    String? variant,
    int? manufacturingYear,
    String? fuelType,
    String? color,
    String? vinNumber,
    String? engineNumber,
  }) async {
    await _api.raw.patch<void>('/owner/vehicles/$vehicleId', data: {
      if (displayLabel != null) 'displayLabel': displayLabel,
      if (category != null) 'category': category,
      if (plateNumber != null) 'plateNumber': plateNumber,
      if (make != null) 'make': make,
      if (model != null) 'model': model,
      if (variant != null) 'variant': variant,
      if (manufacturingYear != null) 'manufacturingYear': manufacturingYear,
      if (fuelType != null) 'fuelType': fuelType,
      if (color != null) 'color': color,
      if (vinNumber != null) 'vinNumber': vinNumber,
      if (engineNumber != null) 'engineNumber': engineNumber,
    });
    ref.invalidateSelf();
    await future;
  }

  Future<void> deleteVehicle(String vehicleId) async {
    await _api.raw.delete<void>('/owner/vehicles/$vehicleId');
    ref.invalidateSelf();
    await future;
  }
}

final vehiclesControllerProvider = AsyncNotifierProvider<VehiclesController, List<Vehicle>>(VehiclesController.new);
