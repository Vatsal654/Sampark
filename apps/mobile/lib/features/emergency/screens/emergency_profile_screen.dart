/// Purpose: Emergency profile editor — every scanner-visible field has
/// its own explicit share toggle, defaulting OFF, per product spec §4F.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/locale_provider.dart';
import '../providers/emergency_controller.dart';

class EmergencyProfileScreen extends ConsumerStatefulWidget {
  const EmergencyProfileScreen({super.key});

  @override
  ConsumerState<EmergencyProfileScreen> createState() => _EmergencyProfileScreenState();
}

class _EmergencyProfileScreenState extends ConsumerState<EmergencyProfileScreen> {
  bool _initialized = false;
  late String _bloodGroup;
  final _allergiesController = TextEditingController();
  final _instructionsController = TextEditingController();
  bool _shareBloodGroup = false;
  bool _shareAllergies = false;
  bool _shareInstructions = false;
  bool _saving = false;

  void _hydrate(EmergencyProfileData data) {
    if (_initialized) return;
    _bloodGroup = data.bloodGroup;
    _allergiesController.text = data.allergiesNote ?? '';
    _instructionsController.text = data.safeInstructions ?? '';
    _shareBloodGroup = data.shareBloodGroup;
    _shareAllergies = data.shareAllergies;
    _shareInstructions = data.shareSafeInstructions;
    _initialized = true;
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(emergencyControllerProvider.notifier).save(
            EmergencyProfileData(
              bloodGroup: _bloodGroup,
              allergiesNote: _allergiesController.text.trim().isEmpty ? null : _allergiesController.text.trim(),
              safeInstructions: _instructionsController.text.trim().isEmpty ? null : _instructionsController.text.trim(),
              shareBloodGroup: _shareBloodGroup,
              shareAllergies: _shareAllergies,
              shareSafeInstructions: _shareInstructions,
            ),
          );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final profileAsync = ref.watch(emergencyControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(translate(locale, 'emergencyProfile'))),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(translate(locale, 'errorGeneric'))),
        data: (data) {
          _hydrate(data);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              DropdownButtonFormField<String>(
                value: _bloodGroup,
                decoration: InputDecoration(labelText: translate(locale, 'bloodGroup'), border: const OutlineInputBorder()),
                items: const ['unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
                    .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                    .toList(),
                onChanged: (value) => setState(() => _bloodGroup = value ?? _bloodGroup),
              ),
              SwitchListTile(
                title: const Text('Share with scanner in an emergency'),
                value: _shareBloodGroup,
                onChanged: (v) => setState(() => _shareBloodGroup = v),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _allergiesController,
                maxLength: 280,
                decoration: InputDecoration(labelText: translate(locale, 'allergiesNote'), border: const OutlineInputBorder()),
              ),
              SwitchListTile(
                title: const Text('Share with scanner in an emergency'),
                value: _shareAllergies,
                onChanged: (v) => setState(() => _shareAllergies = v),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _instructionsController,
                maxLength: 280,
                decoration: InputDecoration(labelText: translate(locale, 'safeInstructions'), border: const OutlineInputBorder()),
              ),
              SwitchListTile(
                title: const Text('Share with scanner in an emergency'),
                value: _shareInstructions,
                onChanged: (v) => setState(() => _shareInstructions = v),
              ),
              const SizedBox(height: 16),
              FilledButton(onPressed: _saving ? null : _save, child: Text(translate(locale, 'save'))),
            ],
          );
        },
      ),
    );
  }
}
