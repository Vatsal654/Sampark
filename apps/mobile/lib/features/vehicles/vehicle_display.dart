/// Purpose: Human-friendly display labels for the vehicle enum dropdowns
/// (category/fuel type). The underlying values sent to/from the backend
/// stay exactly as packages/api-contracts/src/enums.ts defines them
/// (lowercase, e.g. 'car', 'petrol') — only what the user reads changes.
/// Pure functions (no BuildContext) so they're unit-testable directly.
library;

import '../../core/i18n/locale_provider.dart';

const vehicleCategories = ['car', 'bike', 'scooter', 'taxi', 'commercial', 'other'];
const fuelTypes = ['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'other'];

/// Maps a raw category value (e.g. 'car') to its display label (e.g. 'Car'). Falls back to the
/// raw value, capitalized, for any value not in the known set — never shows a blank label.
String categoryDisplayLabel(AppLocale locale, String category) {
  if (!vehicleCategories.contains(category)) return _capitalize(category);
  return translate(locale, 'category_$category');
}

/// Maps a raw fuel type value (e.g. 'petrol') to its display label (e.g. 'Petrol'). Null means
/// "not set" — distinct from an unrecognized value, which still shows something readable.
String fuelTypeDisplayLabel(AppLocale locale, String? fuelType) {
  if (fuelType == null) return translate(locale, 'fuelTypeNotSet');
  if (!fuelTypes.contains(fuelType)) return _capitalize(fuelType);
  return translate(locale, 'fuel_$fuelType');
}

String _capitalize(String value) => value.isEmpty ? value : '${value[0].toUpperCase()}${value.substring(1)}';
