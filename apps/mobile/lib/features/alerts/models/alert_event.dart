/// Purpose: Owner-facing alert view model, mirroring
/// packages/api-contracts/src/alert.ts#alertEventViewSchema.
library;

class AlertDelivery {
  const AlertDelivery({required this.channel, required this.status});
  factory AlertDelivery.fromJson(Map<String, dynamic> json) =>
      AlertDelivery(channel: json['channel'] as String, status: json['status'] as String);
  final String channel;
  final String status;
}

class AlertEvent {
  const AlertEvent({
    required this.id,
    required this.category,
    required this.severity,
    required this.note,
    required this.scannerLocationLabel,
    required this.createdAt,
    required this.acknowledgedAt,
    required this.archivedAt,
    required this.deliveries,
  });

  factory AlertEvent.fromJson(Map<String, dynamic> json) => AlertEvent(
        id: json['id'] as String,
        category: json['category'] as String,
        severity: json['severity'] as String,
        note: json['note'] as String?,
        scannerLocationLabel: json['scannerLocationLabel'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        acknowledgedAt: json['acknowledgedAt'] != null ? DateTime.parse(json['acknowledgedAt'] as String) : null,
        archivedAt: json['archivedAt'] != null ? DateTime.parse(json['archivedAt'] as String) : null,
        deliveries: ((json['deliveries'] as List<dynamic>?) ?? [])
            .map((e) => AlertDelivery.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  final String id;
  final String category;
  final String severity;
  final String? note;
  final String? scannerLocationLabel;
  final DateTime createdAt;
  final DateTime? acknowledgedAt;
  final DateTime? archivedAt;
  final List<AlertDelivery> deliveries;
}
