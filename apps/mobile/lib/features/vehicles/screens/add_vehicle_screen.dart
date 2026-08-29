/// Purpose: Add-vehicle form. `displayLabel` is explicitly framed to the
/// owner as "shown to scanners" so they don't accidentally put a plate
/// number or their name into the one field that IS public.
/// Related: providers/vehicles_controller.dart, ../vehicle_validation.dart.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/locale_provider.dart';
import '../providers/vehicles_controller.dart';
import '../vehicle_validation.dart';

const _categories = ['car', 'bike', 'scooter', 'taxi', 'commercial', 'other'];
const _fuelTypes = ['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'other'];

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
  String _category = _categories.first;
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
          TextField(
            controller: _labelController,
            maxLength: 60,
            decoration: InputDecoration(labelText: translate(locale, 'displayLabel'), border: const OutlineInputBorder()),
          ),
          DropdownButtonFormField<String>(
            value: _category,
            decoration: InputDecoration(labelText: translate(locale, 'category'), border: const OutlineInputBorder()),
            items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
            onChanged: (value) => setState(() => _category = value ?? _category),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _plateController,
            decoration: InputDecoration(labelText: translate(locale, 'plateNumber'), border: const OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _makeController,
            decoration: InputDecoration(labelText: translate(locale, 'make'), border: const OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _modelController,
            decoration: InputDecoration(labelText: translate(locale, 'model'), border: const OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _variantController,
            decoration: InputDecoration(labelText: translate(locale, 'variant'), border: const OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _yearController,
            keyboardType: TextInputType.number,
            decoration:
                InputDecoration(labelText: translate(locale, 'manufacturingYear'), border: const OutlineInputBorder()),
          ),
          DropdownButtonFormField<String?>(
            value: _fuelType,
            decoration: InputDecoration(labelText: translate(locale, 'fuelType'), border: const OutlineInputBorder()),
            items: [
              const DropdownMenuItem<String?>(value: null, child: Text('—')),
              ..._fuelTypes.map((f) => DropdownMenuItem<String?>(value: f, child: Text(f))),
            ],
            onChanged: (value) => setState(() => _fuelType = value),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _colorController,
            decoration: InputDecoration(labelText: translate(locale, 'vehicleColor'), border: const OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _vinController,
            decoration: InputDecoration(labelText: translate(locale, 'vinNumber'), border: const OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _engineController,
            decoration: InputDecoration(labelText: translate(locale, 'engineNumber'), border: const OutlineInputBorder()),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 16),
          FilledButton(onPressed: _submitting ? null : _submit, child: Text(translate(locale, 'save'))),
        ],
      ),
    );
  }
}
