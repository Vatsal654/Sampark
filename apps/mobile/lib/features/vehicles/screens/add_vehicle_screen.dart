/// Purpose: Add-vehicle form. `displayLabel` is explicitly framed to the
/// owner as "shown to scanners" so they don't accidentally put a plate
/// number or their name into the one field that IS public.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/locale_provider.dart';
import '../providers/vehicles_controller.dart';

const _categories = ['car', 'bike', 'scooter', 'taxi', 'commercial', 'other'];

class AddVehicleScreen extends ConsumerStatefulWidget {
  const AddVehicleScreen({super.key});

  @override
  ConsumerState<AddVehicleScreen> createState() => _AddVehicleScreenState();
}

class _AddVehicleScreenState extends ConsumerState<AddVehicleScreen> {
  final _labelController = TextEditingController();
  final _plateController = TextEditingController();
  String _category = _categories.first;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _labelController.dispose();
    _plateController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_labelController.text.trim().isEmpty || _plateController.text.trim().isEmpty) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(vehiclesControllerProvider.notifier).addVehicle(
            displayLabel: _labelController.text.trim(),
            category: _category,
            plateNumber: _plateController.text.trim(),
          );
      if (mounted) context.pop();
    } catch (_) {
      if (mounted) setState(() => _error = translate(ref.read(localeProvider), 'errorGeneric'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    return Scaffold(
      appBar: AppBar(title: Text(translate(locale, 'addVehicle'))),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
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
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(onPressed: _submitting ? null : _submit, child: Text(translate(locale, 'save'))),
          ],
        ),
      ),
    );
  }
}
