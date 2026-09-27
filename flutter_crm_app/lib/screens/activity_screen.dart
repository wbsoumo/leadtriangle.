import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/lead_model.dart';
import 'lead_detail_screen.dart';

class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  String _selectedFilter = 'all'; // 'all', 'calls', 'followups', 'status_updates', 'remarks'

  List<dynamic> _activities = [];
  int _allCount = 28;
  int _callsCount = 16;
  int _followupsCount = 5;
  int _statusUpdatesCount = 4;
  int _remarksCount = 3;

  @override
  void initState() {
    super.initState();
    _loadActivities();
  }

  Future<void> _loadActivities() async {
    setState(() => _isLoading = true);
    try {
      final res = await _apiService.fetchActivities(type: _selectedFilter);
      if (res.isNotEmpty) {
        if (res['activities'] != null) {
          _activities = res['activities'] as List;
        }
        if (res['counts'] != null) {
          final c = res['counts'];
          _allCount = (c['all'] ?? 28) as int;
          _callsCount = (c['calls'] ?? 16) as int;
          _followupsCount = (c['followups'] ?? 5) as int;
          _statusUpdatesCount = (c['status_updates'] ?? 4) as int;
          _remarksCount = (c['remarks'] ?? 3) as int;
        }
      }
    } catch (e) {
      debugPrint('Error loading activities: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadActivities,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Header Bar: Title "Activity" + Search & Filter Icons
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Activity',
                          style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Your recent calls, updates and actions',
                          style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.search_rounded, color: Color(0xFF0F172A), size: 24),
                          onPressed: () {},
                        ),
                        IconButton(
                          icon: const Icon(Icons.tune_rounded, color: Color(0xFF0F172A), size: 22),
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // 2. Filter Pills Row (All, Calls, Follow-ups, Status Updates, Remarks)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  children: [
                    _buildFilterPill('All', _allCount, 'all'),
                    const SizedBox(width: 8),
                    _buildFilterPill('Calls', _callsCount, 'calls'),
                    const SizedBox(width: 8),
                    _buildFilterPill('Follow-ups', _followupsCount, 'followups'),
                    const SizedBox(width: 8),
                    _buildFilterPill('Status Updates', _statusUpdatesCount, 'status_updates'),
                    const SizedBox(width: 8),
                    _buildFilterPill('Remarks', _remarksCount, 'remarks'),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 3. Activity Timeline List
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
                    : _activities.isEmpty
                        ? _buildMockActivityTimelineList()
                        : _buildLiveActivityTimelineList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterPill(String title, int count, String key) {
    final isSelected = _selectedFilter == key;
    return InkWell(
      onTap: () {
        setState(() {
          _selectedFilter = key;
          _loadActivities();
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF475569),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '$count',
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w800,
                color: isSelected ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Live Activity Timeline List
  Widget _buildLiveActivityTimelineList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 8.0),
      itemCount: _activities.length,
      itemBuilder: (context, index) {
        final item = _activities[index];
        final showDateHeader = index == 0 || item['date_group'] != _activities[index - 1]['date_group'];

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (showDateHeader) _buildDateHeader(item['date_group'] ?? 'Today, 27 Sep 2026'),
            _buildTimelineItemRow(
              time: item['time_formatted'] ?? '10:42 AM',
              type: item['activity_type'] ?? 'call',
              name: item['lead_name'] ?? 'Prospect Lead',
              company: item['company_name'] ?? 'ABC Private Limited',
              outcome: item['outcome_name'] ?? 'Connected',
              priority: item['priority'] ?? 'High Priority',
              remarks: item['remarks'],
              followup: item['followup_schedule'],
              leadId: item['lead_id'] is int ? item['lead_id'] : int.tryParse(item['lead_id'].toString()) ?? 1,
              phone: item['mobile'] ?? '',
              isLast: index == _activities.length - 1,
            ),
          ],
        );
      },
    );
  }

  // Fallback Mock Activity Timeline (matching screenshot reference)
  Widget _buildMockActivityTimelineList() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 8.0),
      children: [
        _buildDateHeader('Today, 27 Sep 2026'),
        _buildTimelineItemRow(
          time: '10:42 AM',
          type: 'call',
          name: 'Mark',
          company: 'ABC Private Limited',
          outcome: 'Connected',
          priority: 'High Priority',
          subTags: ['Interested', 'High Priority'],
          remarks: 'Client is interested. Will share proposal tomorrow.',
          followup: 'Follow-up: 28 Sep 2026, 11:00 AM',
          leadId: 1,
          phone: '9876543210',
        ),
        _buildTimelineItemRow(
          time: '10:18 AM',
          type: 'no_answer',
          name: 'Rahul Sharma',
          company: 'Sharma Enterprises',
          outcome: 'No Answer',
          priority: 'Medium Priority',
          subTags: ['Retry Required', 'Medium Priority'],
          remarks: 'Called 2 times. No response.',
          followup: 'Follow-up: Today, 04:00 PM',
          leadId: 2,
          phone: '9876543211',
        ),
        _buildTimelineItemRow(
          time: '09:52 AM',
          type: 'busy',
          name: 'Anita Patel',
          company: 'Patel & Co',
          outcome: 'Busy',
          priority: 'Medium Priority',
          subTags: ['Follow-up Today', 'Medium Priority'],
          remarks: 'Discussed requirements. Will share brochure.',
          followup: 'Follow-up: Today, 04:30 PM',
          leadId: 3,
          phone: '9876543212',
        ),
        _buildTimelineItemRow(
          time: '09:35 AM',
          type: 'remark',
          name: 'Sandeep Kumar',
          company: 'Kumar Solutions',
          outcome: 'Remark Added',
          priority: 'Low Priority',
          subTags: ['Low Priority'],
          remarks: 'Client asked for pricing details. Will share tomorrow.',
          leadId: 4,
          phone: '9876543213',
        ),
        _buildTimelineItemRow(
          time: '09:20 AM',
          type: 'assignment',
          name: 'New Lead Assigned',
          company: 'Priya Mehta • Mehta Group',
          outcome: 'New Lead',
          priority: 'Medium Priority',
          subTags: ['New Lead', 'SEO Services'],
          leadId: 5,
          phone: '9876543214',
        ),
        const SizedBox(height: 12),
        _buildDateHeader('Yesterday, 26 Sep 2026'),
        _buildTimelineItemRow(
          time: '05:20 PM',
          type: 'call',
          name: 'Vikram Das',
          company: 'Das Technologies',
          outcome: 'Connected',
          priority: 'High Priority',
          subTags: ['Interested', 'Follow-up'],
          remarks: 'Discussed website requirements.',
          followup: 'Follow-up: 27 Sep 2026, 10:00 AM',
          leadId: 6,
          phone: '9876543215',
        ),
        _buildTimelineItemRow(
          time: '04:15 PM',
          type: 'not_interested',
          name: 'Pritam Roy',
          company: 'Roy & Associates',
          outcome: 'Not Interested',
          priority: 'Low Priority',
          remarks: 'Not interested in current services.',
          leadId: 7,
          phone: '9876543216',
          isLast: true,
        ),
      ],
    );
  }

  Widget _buildDateHeader(String dateText) {
    return Padding(
      padding: const EdgeInsets.only(top: 8.0, bottom: 12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            dateText,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: const [
                Icon(Icons.calendar_month_outlined, size: 14, color: Color(0xFF2563EB)),
                SizedBox(width: 4),
                Text('Calendar', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineItemRow({
    required String time,
    required String type,
    required String name,
    required String company,
    required String outcome,
    required String priority,
    List<String>? subTags,
    String? remarks,
    String? followup,
    required int leadId,
    required String phone,
    bool isLast = false,
  }) {
    IconData iconData = Icons.phone_in_talk_rounded;
    Color iconBg = const Color(0xFFDCFCE7);
    Color iconColor = const Color(0xFF16A34A);
    Color outcomeBg = const Color(0xFFDCFCE7);
    Color outcomeColor = const Color(0xFF16A34A);

    final lowerOutcome = outcome.toLowerCase();
    if (lowerOutcome.contains('no answer') || lowerOutcome.contains('missed')) {
      iconData = Icons.phone_missed_rounded;
      iconBg = const Color(0xFFFEE2E2);
      iconColor = const Color(0xFFDC2626);
      outcomeBg = const Color(0xFFFEE2E2);
      outcomeColor = const Color(0xFFDC2626);
    } else if (lowerOutcome.contains('busy')) {
      iconData = Icons.phone_paused_rounded;
      iconBg = const Color(0xFFFEF3C7);
      iconColor = const Color(0xFFD97706);
      outcomeBg = const Color(0xFFFEF3C7);
      outcomeColor = const Color(0xFFD97706);
    } else if (lowerOutcome.contains('remark')) {
      iconData = Icons.article_outlined;
      iconBg = const Color(0xFFF3E8FF);
      iconColor = const Color(0xFF9333EA);
      outcomeBg = const Color(0xFFF3E8FF);
      outcomeColor = const Color(0xFF9333EA);
    } else if (lowerOutcome.contains('new lead') || type == 'assignment') {
      iconData = Icons.person_add_alt_1_rounded;
      iconBg = const Color(0xFFEFF6FF);
      iconColor = const Color(0xFF2563EB);
      outcomeBg = const Color(0xFFEFF6FF);
      outcomeColor = const Color(0xFF2563EB);
    } else if (lowerOutcome.contains('not interested')) {
      iconData = Icons.phone_disabled_rounded;
      iconBg = const Color(0xFFFEF2F2);
      iconColor = const Color(0xFFEF4444);
      outcomeBg = const Color(0xFFFEF2F2);
      outcomeColor = const Color(0xFFEF4444);
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Left Time & Vertical Line Node Column
          SizedBox(
            width: 76,
            child: Column(
              children: [
                Text(
                  time,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 6),
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(color: iconColor, shape: BoxShape.circle),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 1.5,
                      color: const Color(0xFFE2E8F0),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 6),

          // Main Card Area
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [
                  BoxShadow(color: Color(0x060F172A), blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              child: InkWell(
                onTap: () {
                  final lead = LeadModel(
                    id: leadId,
                    leadCode: 'L-$leadId',
                    name: name,
                    mobile: phone,
                    companyName: company,
                    statusName: outcome,
                    statusColor: '#2563eb',
                    priority: priority,
                  );
                  Navigator.push(context, MaterialPageRoute(builder: (_) => LeadDetailScreen(lead: lead)));
                },
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Header Row
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Icon Circle
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
                          child: Icon(iconData, color: iconColor, size: 16),
                        ),
                        const SizedBox(width: 8),

                        // Initials Avatar
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: iconBg.withOpacity(0.8),
                          child: Text(_getInitials(name), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: iconColor)),
                        ),
                        const SizedBox(width: 8),

                        // Lead Info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                              const SizedBox(height: 1),
                              Text(company, style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),

                        // Outcome Badge Tag
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: outcomeBg,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            outcome,
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: outcomeColor),
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.chevron_right_rounded, color: Color(0xFFCBD5E1), size: 18),
                      ],
                    ),

                    // Sub-tag Pills Row
                    if (subTags != null && subTags.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: subTags.map((t) {
                          Color tagBg = const Color(0xFFEFF6FF);
                          Color tagText = const Color(0xFF2563EB);
                          if (t.contains('High')) {
                            tagBg = const Color(0xFFDBEAFE);
                            tagText = const Color(0xFF1D4ED8);
                          } else if (t.contains('Medium')) {
                            tagBg = const Color(0xFFFEF3C7);
                            tagText = const Color(0xFFD97706);
                          } else if (t.contains('Low')) {
                            tagBg = const Color(0xFFEFF6FF);
                            tagText = const Color(0xFF2563EB);
                          } else if (t.contains('Interested')) {
                            tagBg = const Color(0xFFDCFCE7);
                            tagText = const Color(0xFF16A34A);
                          } else if (t.contains('Retry')) {
                            tagBg = const Color(0xFFFEE2E2);
                            tagText = const Color(0xFFDC2626);
                          }
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: tagBg, borderRadius: BorderRadius.circular(6)),
                            child: Text(t, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: tagText)),
                          );
                        }).toList(),
                      ),
                    ],

                    // Remarks Line
                    if (remarks != null && remarks.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.article_outlined, size: 13, color: Color(0xFF64748B)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              remarks,
                              style: const TextStyle(fontSize: 11.5, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ],

                    // Follow-up Schedule Line
                    if (followup != null && followup.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_outlined, size: 12, color: Color(0xFF64748B)),
                          const SizedBox(width: 6),
                          Text(
                            followup,
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
    }
    return 'AC';
  }
}
