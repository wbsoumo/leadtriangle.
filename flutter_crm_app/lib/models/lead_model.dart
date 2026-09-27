class LeadModel {
  final int id;
  final String leadCode;
  final String name;
  final String mobile;
  final String? email;
  final String? companyName;
  final String? city;
  final String? serviceName;
  final String statusName;
  final String statusColor;
  final String priority;
  final String? lastContactedAt;
  final String? nextFollowupAt;
  final String? initialRemark;

  final String? latestCallOutcome;
  final int callCount;

  LeadModel({
    required this.id,
    required this.leadCode,
    required this.name,
    required this.mobile,
    this.email,
    this.companyName,
    this.city,
    this.serviceName,
    required this.statusName,
    required this.statusColor,
    required this.priority,
    this.lastContactedAt,
    this.nextFollowupAt,
    this.initialRemark,
    this.latestCallOutcome,
    this.callCount = 0,
  });

  factory LeadModel.fromJson(Map<String, dynamic> json) {
    return LeadModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      leadCode: json['lead_code'] ?? 'L-100',
      name: json['name'] ?? 'Prospect Lead',
      mobile: json['mobile'] ?? '',
      email: json['email'],
      companyName: json['company_name'],
      city: json['city'],
      serviceName: json['service_name'] ?? 'BPO Telecalling',
      statusName: json['status_name'] ?? 'Pending',
      statusColor: json['status_color'] ?? '#64748b',
      priority: json['priority'] ?? 'Medium',
      lastContactedAt: json['last_contacted_at'] ?? json['latest_call_at'],
      nextFollowupAt: json['next_followup_at'],
      initialRemark: json['initial_remark'],
      latestCallOutcome: json['latest_call_outcome'],
      callCount: json['call_count'] != null ? (json['call_count'] as num).toInt() : 0,
    );
  }
}
