/// Purpose: Add-vehicle form. `displayLabel` is explicitly framed to the
/// owner as "shown to scanners" so they don't accidentally put a plate
/// number or their name into the one field that IS public.
/// Responsibilities: Only the fields Sampark's vehicle-contact use case
/// actually needs — see vehicle_display.dart for the category/fuel
/// dropdown label mapping and vehicle_validation.dart for field bounds.
/// Related: providers/vehicles_controller.dart, ../vehicle_validation.dart,
/// ../vehicle_display.dart.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/locale_provider.dart';
import '../providers/vehicles_controller.dart';
import '../vehicle_display.dart';
import '../vehicle_validation.dart';

/// Vertical rhythm shared by every field in Add/Edit Vehicle — one constant so spacing can never
/// drift between the two screens or between fields within one screen.
const _fieldGap = SizedBox(height: 16);
const _sectionGap = SizedBox(height: 28);

class AddVehicleScreen extends ConsumerStatefulWidget {
  const AddVehicleScreen({super.key});

  @override
  ConsumerState<AddVehicleScreen> createState() => _AddVehicleScreenState();
}

class _AddVehicleScreenState extends ConsumerState<AddVehicleScreen> {
  final _labelController = TextEditingController();
  final _plateController = TextEditingController();
  final _makeController = TextEditingController();
  final _modelController = TextEditingController();
  final _variantController = TextEditingController();
  final _yearController = TextEditingController();
  final _colorController = TextEditingController();
  final _vinController = TextEditingController();
  final _engineController = TextEditingController();
  String _category = vehicleCategories.first;
  String? _fuelType;
  bool _submitting = false;
  String? _error;

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
    if (!isValidPlateNumber(_plateController.text)) {
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
      await ref.read(vehiclesControllerProvider.notifier).addVehicle(
            displayLabel: _labelController.text.trim(),
            category: _category,
            plateNumber: _plateController.text.trim(),
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
    return Scaffold(
      appBar: AppBar(title: Text(translate(locale, 'addVehicle'))),
      body: ListView(
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
            child: Text(translate(locale, 'save')),
          ),
        ],
      ),
    );
  }
}
