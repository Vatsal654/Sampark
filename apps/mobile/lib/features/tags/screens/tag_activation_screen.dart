/// Purpose: Tag activation screen — scan the QR sticker or tap the NFC
/// tag to capture its opaque ID, then require the physical activation PIN
/// before binding it to a vehicle.
/// Security: The scanned QR/NFC payload only ever supplies the opaque ID
/// for display/logging; it is never treated as proof of ownership on its
/// own (docs/THREAT_MODEL.md §3.2) — the PIN and an authenticated session
/// are both required server-side.
/// Related: providers/tags_controller.dart.
library;

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:nfc_manager/nfc_manager.dart';

import '../../../core/i18n/locale_provider.dart';
import '../providers/tags_controller.dart';

class TagActivationScreen extends ConsumerStatefulWidget {
  const TagActivationScreen({required this.vehicleId, super.key});
  final String vehicleId;

  @override
  ConsumerState<TagActivationScreen> createState() => _TagActivationScreenState();
}

class _TagActivationScreenState extends ConsumerState<TagActivationScreen> {
  String? _opaqueId;
  final _pinController = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  void _onQrDetect(BarcodeCapture capture) {
    if (_opaqueId != null) return;
    if (capture.barcodes.isEmpty) return;
    final raw = capture.barcodes.first.rawValue;
    if (raw == null) return;
    final opaqueId = extractOpaqueIdFromScan(raw);
    if (opaqueId != null) setState(() => _opaqueId = opaqueId);
  }

  Future<void> _startNfcScan() async {
    final available = await NfcManager.instance.isAvailable();
    if (!available) {
      setState(() => _error = 'NFC is not available on this device.');
      return;
    }
    await NfcManager.instance.startSession(
      onDiscovered: (NfcTag tag) async {
        final ndef = Ndef.from(tag);
        final records = ndef?.cachedMessage?.records ?? const [];
        final record = records.isNotEmpty ? records.first : null;
        if (record != null) {
          final text = utf8.decode(record.payload, allowMalformed: true);
          final opaqueId = extractOpaqueIdFromScan(text);
          if (opaqueId != null && mounted) setState(() => _opaqueId = opaqueId);
        }
        await NfcManager.instance.stopSession();
      },
    );
  }

  Future<void> _submit() async {
    if (_opaqueId == null || _pinController.text.trim().isEmpty) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(tagsControllerProvider).activate(
            opaqueId: _opaqueId!,
            activationPin: _pinController.text.trim(),
            vehicleId: widget.vehicleId,
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
      appBar: AppBar(title: Text(translate(locale, 'activateTag'))),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_opaqueId == null) ...[
              SizedBox(
                height: 260,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: MobileScanner(onDetect: _onQrDetect),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _startNfcScan,
                icon: const Icon(Icons.nfc),
                label: Text(translate(locale, 'tapNfcTag')),
              ),
            ] else ...[
              Text('Tag ID: $_opaqueId', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 16),
              TextField(
                controller: _pinController,
                decoration: InputDecoration(labelText: translate(locale, 'activationPin'), border: const OutlineInputBorder()),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 16),
              FilledButton(onPressed: _submitting ? null : _submit, child: Text(translate(locale, 'save'))),
              TextButton(onPressed: () => setState(() => _opaqueId = null), child: const Text('Scan again')),
            ],
          ],
        ),
      ),
    );
  }
}
