/// Purpose: Owner-facing vehicle view model, mirroring
/// packages/api-contracts/src/vehicle.ts#vehicleViewSchema.
library;

class Vehicle {
  const Vehicle({
    required this.id,
    required this.displayLabel,
    required this.category,
    required this.plateNumberMasked,
    required this.tagId,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) => Vehicle(
        id: json['id'] as String,
        displayLabel: json['displayLabel'] as String,
        category: json['category'] as String,
        plateNumberMasked: json['plateNumberMasked'] as String,
        tagId: json['tagId'] as String?,
      );

  final String id;
  final String displayLabel;
  final String category;
  final String plateNumberMasked;
  final String? tagId;
}
