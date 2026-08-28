/// Purpose: Owner document view model, mirroring
/// packages/api-contracts/src/document.ts#documentViewSchema.
library;

class VaultDocument {
  const VaultDocument({required this.id, required this.documentType, required this.status, required this.expiresOn});

  factory VaultDocument.fromJson(Map<String, dynamic> json) => VaultDocument(
        id: json['id'] as String,
        documentType: json['documentType'] as String,
        status: json['status'] as String,
        expiresOn: json['expiresOn'] as String?,
      );

  final String id;
  final String documentType;
  final String status;
  final String? expiresOn;
}
