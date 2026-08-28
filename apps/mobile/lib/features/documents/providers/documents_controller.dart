/// Purpose: Owner document vault operations — list, upload, delete, and
/// fetch a short-lived signed view URL.
/// Security: This controller never persists a document's signed URL; it
/// is fetched fresh on demand and expected to be used immediately (see
/// docs/PRIVACY_DATA_MAP.md — signed URLs are ≤5 minutes).
library;

import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_controller.dart';
import '../models/vault_document.dart';

class DocumentsController extends AsyncNotifier<List<VaultDocument>> {
  @override
  Future<List<VaultDocument>> build() async {
    final response = await ref.read(apiClientProvider).raw.get<List<dynamic>>('/owner/documents');
    return (response.data ?? []).map((e) => VaultDocument.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> upload({required File file, required String documentType}) async {
    final formData = FormData.fromMap({
      'documentType': documentType,
      'file': await MultipartFile.fromFile(file.path),
    });
    await ref.read(apiClientProvider).raw.post<void>('/owner/documents', data: formData);
    ref.invalidateSelf();
    await future;
  }

  Future<void> delete(String documentId) async {
    await ref.read(apiClientProvider).raw.delete<void>('/owner/documents/$documentId');
    ref.invalidateSelf();
    await future;
  }

  Future<String> getSignedUrl(String documentId) async {
    final response = await ref.read(apiClientProvider).raw.get<Map<String, dynamic>>('/owner/documents/$documentId/url');
    return response.data!['url'] as String;
  }
}

final documentsControllerProvider = AsyncNotifierProvider<DocumentsController, List<VaultDocument>>(DocumentsController.new);
