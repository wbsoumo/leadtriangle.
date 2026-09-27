class CallLogModel {
  final int id;
  final int leadId;
  final String leadName;
  final String leadMobile;
  final String outcomeName;
  final String outcomeColor;
  final int durationSeconds;
  final String remarks;
  final String calledAt;

  CallLogModel({
    required this.id,
    required this.leadId,
    required this.leadName,
    required this.leadMobile,
    required this.outcomeName,
    required this.outcomeColor,
    required this.durationSeconds,
    required this.remarks,
    required this.calledAt,
  });

  factory CallLogModel.fromJson(Map<String, dynamic> json) {
    return CallLogModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      leadId: json['lead_id'] is int ? json['lead_id'] : int.parse(json['lead_id'].toString()),
      leadName: json['lead_name'] ?? 'Client',
      leadMobile: json['lead_mobile'] ?? '',
      outcomeName: json['outcome_name'] ?? 'Connected',
      outcomeColor: json['outcome_color'] ?? '#2563eb',
      durationSeconds: json['call_duration_seconds'] is int
          ? json['call_duration_seconds']
          : int.parse(json['call_duration_seconds']?.toString() ?? '0'),
      remarks: json['remarks'] ?? '',
      calledAt: json['called_at'] ?? '',
    );
  }

  String get formattedDuration {
    final minutes = durationSeconds ~/ 60;
    final seconds = durationSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
}
