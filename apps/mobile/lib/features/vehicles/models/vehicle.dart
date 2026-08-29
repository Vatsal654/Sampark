/// Purpose: Owner-facing vehicle view model, mirroring
/// packages/api-contracts/src/vehicle.ts#vehicleViewSchema.
/// Security: The backend now returns the full `plateNumber` alongside
/// `plateNumberMasked` — safe because this model is only ever populated
/// from an authenticated, ownership-checked owner endpoint
/// (GET/POST/PATCH /owner/vehicles*). Never send `plateNumber` anywhere
/// scanner-facing; the public scanner API has no plate field at all.
library;

class Vehicle {
  const Vehicle({
    required this.id,
    required this.displayLabel,
    required this.category,
    required this.plateNumber,
    required this.plateNumberMasked,
    required this.make,
    required this.model,
    required this.variant,
    required this.manufacturingYear,
    required this.fuelType,
    required this.color,
    required this.vinNumber,
    required this.engineNumber,
    required this.tagId,
    required this.tagStatus,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) => Vehicle(
        id: json['id'] as String,
        displayLabel: json['displayLabel'] as String,
        category: json['category'] as String,
        plateNumber: json['plateNumber'] as String,
        plateNumberMasked: json['plateNumberMasked'] as String,
        make: json['make'] as String?,
        model: json['model'] as String?,
        variant: json['variant'] as String?,
        manufacturingYear: json['manufacturingYear'] as int?,
        fuelType: json['fuelType'] as String?,
        color: json['color'] as String?,
        vinNumber: json['vinNumber'] as String?,
        engineNumber: json['engineNumber'] as String?,
        tagId: json['tagId'] as String?,
        tagStatus: json['tagStatus'] as String?,
      );

  final String id;
  final String displayLabel;
  final String category;
  final String plateNumber;
  final String plateNumberMasked;
  final String? make;
  final String? model;
  final String? variant;
  final int? manufacturingYear;
  final String? fuelType;
  final String? color;
  final String? vinNumber;
  final String? engineNumber;
  final String? tagId;
  final String? tagStatus;
}
