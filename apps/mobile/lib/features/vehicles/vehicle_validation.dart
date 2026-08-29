/// Purpose: Client-side field validation for the Add/Edit vehicle forms.
/// Responsibilities: Each check mirrors the corresponding zod constraint
/// in packages/api-contracts/src/vehicle.ts#createVehicleSchema exactly
/// (same bounds), so a value that passes here is never rejected by the
/// backend for length/range reasons — a mismatch would show a confusing
/// generic error after submit instead of an inline one before it.
/// Pure functions (no BuildContext) so they're unit-testable directly.
library;

bool isValidPlateNumber(String value) {
  final trimmed = value.trim();
  return trimmed.length >= 4 && trimmed.length <= 12;
}

bool isValidManufacturingYear(int year) {
  final maxYear = DateTime.now().year + 1;
  return year >= 1980 && year <= maxYear;
}

bool isValidVinNumber(String value) {
  final trimmed = value.trim();
  return trimmed.length >= 4 && trimmed.length <= 32;
}

bool isValidEngineNumber(String value) {
  final trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 32;
}
