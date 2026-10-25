class LeadModel {
  final int id;
  final String leadCode;
  final String name;
  final String mobile;
  final String? email;
  final String? companyName;
  final String? city;
  final String? sourceName;
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
    this.sourceName,
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

  LeadModel copyWith({
    int? id,
    String? leadCode,
    String? name,
    String? mobile,
    String? email,
    String? companyName,
    String? city,
    String? sourceName,
    String? serviceName,
    String? statusName,
    String? statusColor,
    String? priority,
    String? lastContactedAt,
    String? nextFollowupAt,
    String? initialRemark,
    String? latestCallOutcome,
    int? callCount,
  }) {
    return LeadModel(
      id: id ?? this.id,
      leadCode: leadCode ?? this.leadCode,
      name: name ?? this.name,
      mobile: mobile ?? this.mobile,
      email: email ?? this.email,
      companyName: companyName ?? this.companyName,
      city: city ?? this.city,
      sourceName: sourceName ?? this.sourceName,
      serviceName: serviceName ?? this.serviceName,
      statusName: statusName ?? this.statusName,
      statusColor: statusColor ?? this.statusColor,
      priority: priority ?? this.priority,
      lastContactedAt: lastContactedAt ?? this.lastContactedAt,
      nextFollowupAt: nextFollowupAt ?? this.nextFollowupAt,
      initialRemark: initialRemark ?? this.initialRemark,
      latestCallOutcome: latestCallOutcome ?? this.latestCallOutcome,
      callCount: callCount ?? this.callCount,
    );
  }

  factory LeadModel.fromJson(Map<String, dynamic> json) {
    return LeadModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      leadCode: json['lead_code'] ?? 'L-100',
      name: json['name'] ?? 'Prospect Lead',
      mobile: json['mobile'] ?? '',
      email: json['email'],
      companyName: json['company_name'],
      city: json['city'],
      sourceName: json['source_name'] ?? 'Direct',
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
