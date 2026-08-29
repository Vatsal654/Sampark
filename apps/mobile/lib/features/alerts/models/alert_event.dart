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

/// The scanner's exact coordinates for one alert — present only when the scanner explicitly
/// opted in to sharing location on that specific alert (see AlertFlow.tsx's "Share my location"
/// checkbox). Never derived from anything else, and never present on a public/anonymous read —
/// this type only exists on the owner-authenticated AlertEvent view.
class ScannerLocation {
  const ScannerLocation({required this.latitude, required this.longitude});
  factory ScannerLocation.fromJson(Map<String, dynamic> json) => ScannerLocation(
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
      );
  final double latitude;
  final double longitude;
}

/// Builds the "Open in Maps" target for a shared location — pure and independent of
/// url_launcher so it's directly unit-testable without mocking a platform channel; the screen
/// only wires this to launchUrl(), never constructs the URL itself.
Uri mapsUriFor(ScannerLocation location) =>
    Uri.parse('https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}');

class AlertEvent {
  const AlertEvent({
    required this.id,
    required this.category,
    required this.severity,
    required this.note,
    required this.scannerLocationLabel,
    required this.scannerLocationExact,
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
        scannerLocationExact: json['scannerLocationExact'] != null
            ? ScannerLocation.fromJson(json['scannerLocationExact'] as Map<String, dynamic>)
            : null,
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
  final ScannerLocation? scannerLocationExact;
  final DateTime createdAt;
  final DateTime? acknowledgedAt;
  final DateTime? archivedAt;
  final List<AlertDelivery> deliveries;
}
