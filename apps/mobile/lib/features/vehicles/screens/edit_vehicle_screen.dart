/// Purpose: Edit an existing vehicle's details.
/// Responsibilities: Prefills every field the backend returns on read
/// from the already-loaded vehiclesControllerProvider list — including
/// the full plate number, which the owner-authenticated GET/vehicle
/// response now includes (see VehiclesService.toView). Same field order,
/// spacing, and dropdown labels as AddVehicleScreen.
/// Related: providers/vehicles_controller.dart, ../vehicle_validation.dart,
/// ../vehicle_display.dart, screens/vehicle_details_screen.dart.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/locale_provider.dart';
import '../models/vehicle.dart';
import '../providers/vehicles_controller.dart';
import '../vehicle_display.dart';
import '../vehicle_validation.dart';

const _fieldGap = SizedBox(height: 16);
const _sectionGap = SizedBox(height: 28);

class EditVehicleScreen extends ConsumerStatefulWidget {
  const EditVehicleScreen({required this.vehicleId, super.key});
  final String vehicleId;

  @override
  ConsumerState<EditVehicleScreen> createState() => _EditVehicleScreenState();
}

class _EditVehicleScreenState extends ConsumerState<EditVehicleScreen> {
  bool _initialized = false;
  final _labelController = TextEditingController();
  final _plateController = TextEditingController();
  final _makeController = TextEditingController();
  final _modelController = TextEditingController();
  final _variantController = TextEditingController();
  final _yearController = TextEditingController();
  final _colorController = TextEditingController();
  final _vinController = TextEditingController();
  final _engineController = TextEditingController();
  late String _category;
  String? _fuelType;
  bool _submitting = false;
  String? _error;

  void _hydrate(Vehicle vehicle) {
    if (_initialized) return;
    _labelController.text = vehicle.displayLabel;
    _plateController.text = vehicle.plateNumber;
    _makeController.text = vehicle.make ?? '';
    _modelController.text = vehicle.model ?? '';
    _variantController.text = vehicle.variant ?? '';
    _yearController.text = vehicle.manufacturingYear?.toString() ?? '';
    _colorController.text = vehicle.color ?? '';
    _vinController.text = vehicle.vinNumber ?? '';
    _engineController.text = vehicle.engineNumber ?? '';
    _category = vehicle.category;
    _fuelType = vehicle.fuelType;
    _initialized = true;
  }

  @override
  void dispose() {
    _labelController.dispose();
    _plateController.dispose();
    _makeController.dispose();
    _modelController.dispose();
    _variantController.dispose();
    _yearController.dispose();
    _colorController.dispose();
    _vinController.dispose();
    _engineController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final locale = ref.read(localeProvider);
    if (_labelController.text.trim().isEmpty) return;
    final plate = _plateController.text.trim();
    if (!isValidPlateNumber(plate)) {
      setState(() => _error = translate(locale, 'invalidPlateNumber'));
      return;
    }
    final yearText = _yearController.text.trim();
    int? year;
    if (yearText.isNotEmpty) {
      year = int.tryParse(yearText);
      if (year == null || !isValidManufacturingYear(year)) {
        setState(() => _error = translate(locale, 'invalidManufacturingYear'));
        return;
      }
    }
    final vin = _vinController.text.trim();
    if (vin.isNotEmpty && !isValidVinNumber(vin)) {
      setState(() => _error = translate(locale, 'invalidVinNumber'));
      return;
    }
    final engine = _engineController.text.trim();
    if (engine.isNotEmpty && !isValidEngineNumber(engine)) {
      setState(() => _error = translate(locale, 'invalidEngineNumber'));
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(vehiclesControllerProvider.notifier).updateVehicle(
            vehicleId: widget.vehicleId,
            displayLabel: _labelController.text.trim(),
            category: _category,
            plateNumber: plate,
            make: _makeController.text.trim().isEmpty ? null : _makeController.text.trim(),
            model: _modelController.text.trim().isEmpty ? null : _modelController.text.trim(),
            variant: _variantController.text.trim().isEmpty ? null : _variantController.text.trim(),
            manufacturingYear: year,
            fuelType: _fuelType,
            color: _colorController.text.trim().isEmpty ? null : _colorController.text.trim(),
            vinNumber: vin.isEmpty ? null : vin,
            engineNumber: engine.isEmpty ? null : engine,
          );
      if (mounted) context.pop();
    } catch (_) {
      if (mounted) setState(() => _error = translate(locale, 'errorGeneric'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final vehiclesAsync = ref.watch(vehiclesControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(translate(locale, 'editVehicle'))),
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
          if (vehicle == null) return Center(child: Text(translate(locale, 'errorGeneric')));
          _hydrate(vehicle);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(translate(locale, 'vehicleInformationSection'), style: Theme.of(context).textTheme.titleMedium),
              _fieldGap,
              DropdownButtonFormField<String>(
                value: _category,
                decoration: InputDecoration(labelText: translate(locale, 'category'), border: const OutlineInputBorder()),
                items: vehicleCategories
                    .map((c) => DropdownMenuItem(value: c, child: Text(categoryDisplayLabel(locale, c))))
                    .toList(),
                onChanged: (value) => setState(() => _category = value ?? _category),
              ),
              _fieldGap,
              TextField(
                controller: _labelController,
                maxLength: 60,
                decoration: InputDecoration(labelText: translate(locale, 'displayLabel'), border: const OutlineInputBorder()),
              ),
              _fieldGap,
              TextField(
                controller: _plateController,
                decoration: InputDecoration(labelText: translate(locale, 'plateNumber'), border: const OutlineInputBorder()),
              ),
              _fieldGap,
              TextField(
                controller: _makeController,
                decoration: InputDecoration(
                  labelText: translate(locale, 'make'),
                  helperText: translate(locale, 'makeHelper'),
                  helperMaxLines: 2,
                  border: const OutlineInputBorder(),
                ),
              ),
              _fieldGap,
              TextField(
                controller: _modelController,
                decoration: InputDecoration(
                  labelText: translate(locale, 'model'),
                  helperText: translate(locale, 'modelHelper'),
                  helperMaxLines: 2,
                  border: const OutlineInputBorder(),
                ),
              ),
              _fieldGap,
              TextField(
                controller: _variantController,
                decoration: InputDecoration(
                  labelText: translate(locale, 'variant'),
                  helperText: translate(locale, 'variantHelper'),
                  helperMaxLines: 2,
                  border: const OutlineInputBorder(),
                ),
              ),
              _fieldGap,
              TextField(
                controller: _yearController,
                keyboardType: TextInputType.number,
                decoration:
                    InputDecoration(labelText: translate(locale, 'manufacturingYear'), border: const OutlineInputBorder()),
              ),
              _fieldGap,
              DropdownButtonFormField<String?>(
                value: _fuelType,
                decoration: InputDecoration(labelText: translate(locale, 'fuelType'), border: const OutlineInputBorder()),
                items: [
                  DropdownMenuItem<String?>(value: null, child: Text(translate(locale, 'fuelTypeNotSet'))),
                  ...fuelTypes.map((f) => DropdownMenuItem<String?>(value: f, child: Text(fuelTypeDisplayLabel(locale, f)))),
                ],
                onChanged: (value) => setState(() => _fuelType = value),
              ),
              _fieldGap,
              TextField(
                controller: _colorController,
                decoration: InputDecoration(labelText: translate(locale, 'vehicleColor'), border: const OutlineInputBorder()),
              ),
              _sectionGap,
              Text(translate(locale, 'identificationSection'), style: Theme.of(context).textTheme.titleMedium),
              _fieldGap,
              TextField(
                controller: _vinController,
                decoration: InputDecoration(labelText: translate(locale, 'vinNumber'), border: const OutlineInputBorder()),
              ),
              _fieldGap,
              TextField(
                controller: _engineController,
                decoration: InputDecoration(labelText: translate(locale, 'engineNumber'), border: const OutlineInputBorder()),
              ),
              if (_error != null) ...[
                _fieldGap,
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              _sectionGap,
              FilledButton(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                child: Text(translate(locale, 'saveChanges')),
              ),
            ],
          );
        },
      ),
    );
  }
}
