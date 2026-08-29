/// Purpose: Secure document vault UI — list, upload (via camera/gallery),
/// and delete. Never renders a permanent URL; view/download always goes
/// through a freshly fetched short-lived signed URL.
library;

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/i18n/locale_provider.dart';
import '../providers/documents_controller.dart';

const _documentTypes = ['rc', 'driving_licence', 'insurance', 'puc_emissions', 'other'];

class DocumentVaultScreen extends ConsumerWidget {
  const DocumentVaultScreen({super.key});

  Future<void> _pickAndUpload(BuildContext context, WidgetRef ref) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.camera);
    if (picked == null) return;
    final documentType = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Document type'),
        children: _documentTypes
            .map((type) => SimpleDialogOption(onPressed: () => Navigator.pop(context, type), child: Text(type)))
            .toList(),
      ),
    );
    if (documentType == null) return;
    await ref.read(documentsControllerProvider.notifier).upload(file: File(picked.path), documentType: documentType);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final documentsAsync = ref.watch(documentsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(translate(locale, 'documents'))),
      floatingActionButton: FloatingActionButton.extended(
        // Explicit, unique heroTag — see the matching comment in vehicle_list_screen.dart.
        heroTag: 'documentVaultFab',
        onPressed: () => _pickAndUpload(context, ref),
        icon: const Icon(Icons.upload_file),
        label: Text(translate(locale, 'uploadDocument')),
      ),
      body: documentsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(translate(locale, 'errorGeneric'))),
        data: (documents) => ListView.builder(
          itemCount: documents.length,
          itemBuilder: (context, index) {
            final doc = documents[index];
            return ListTile(
              leading: const Icon(Icons.description_outlined),
              title: Text(doc.documentType),
              subtitle: Text('${doc.status}${doc.expiresOn != null ? ' · expires ${doc.expiresOn}' : ''}'),
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline),
                onPressed: () => ref.read(documentsControllerProvider.notifier).delete(doc.id),
              ),
            );
          },
        ),
      ),
    );
  }
}
