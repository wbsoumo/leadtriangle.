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
  bool _isSearching = false;
  String _searchQuery = '';
  String _selectedFilter = 'all'; // 'all', 'calls', 'followups', 'status_updates', 'remarks'
  DateTime? _selectedDate;

  // Additional Filter Modal States
  String _selectedPriority = 'All';
  String _selectedOutcome = 'All';

  List<dynamic> _rawActivities = [];
  List<dynamic> _displayActivities = [];

  int _allCount = 0;
  int _callsCount = 0;
  int _followupsCount = 0;
  int _statusUpdatesCount = 0;
  int _remarksCount = 0;

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
          _rawActivities = res['activities'] as List;
        }
        if (res['counts'] != null) {
          final c = res['counts'];
          _allCount = (c['all'] ?? 0) as int;
          _callsCount = (c['calls'] ?? 0) as int;
          _followupsCount = (c['followups'] ?? 0) as int;
          _statusUpdatesCount = (c['status_updates'] ?? 0) as int;
          _remarksCount = (c['remarks'] ?? 0) as int;
        }
      }
    } catch (e) {
      debugPrint('Error loading activities: $e');
    } finally {
      if (mounted) {
        _applyLocalFilters();
        setState(() => _isLoading = false);
      }
    }
  }

  void _applyLocalFilters() {
    List<dynamic> temp = List.from(_rawActivities);

    // Search query filter
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      temp = temp.where((item) {
        final name = (item['lead_name'] ?? '').toString().toLowerCase();
        final company = (item['company_name'] ?? '').toString().toLowerCase();
        final mobile = (item['mobile'] ?? '').toString().toLowerCase();
        final remarks = (item['remarks'] ?? '').toString().toLowerCase();
        final outcome = (item['outcome_name'] ?? '').toString().toLowerCase();
        return name.contains(q) || company.contains(q) || mobile.contains(q) || remarks.contains(q) || outcome.contains(q);
      }).toList();
    }

    // Date Picker Filter
    if (_selectedDate != null) {
      final dateStr = "${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}";
      temp = temp.where((item) => (item['date_key'] ?? '').toString() == dateStr).toList();
    }

    // Priority Filter
    if (_selectedPriority != 'All') {
      temp = temp.where((item) => (item['priority'] ?? '').toString().toLowerCase() == _selectedPriority.toLowerCase()).toList();
    }

    // Outcome Filter
    if (_selectedOutcome != 'All') {
      temp = temp.where((item) => (item['outcome_name'] ?? '').toString().toLowerCase().contains(_selectedOutcome.toLowerCase())).toList();
    }

    setState(() {
      _displayActivities = temp;
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2025),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: ThemeData.light().copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF2563EB),
              onPrimary: Colors.white,
              surface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedDate = picked;
        _applyLocalFilters();
      });
    }
  }

  void _openFilterBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.6,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Filter Activities', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                      IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Priority
                  const Text('Priority Level', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: ['All', 'High', 'Medium', 'Low'].map((pr) {
                      final sel = _selectedPriority == pr;
                      return ChoiceChip(
                        label: Text(pr),
                        selected: sel,
                        selectedColor: const Color(0xFFEFF6FF),
                        labelStyle: TextStyle(color: sel ? const Color(0xFF2563EB) : const Color(0xFF475569), fontWeight: FontWeight.w700),
                        onSelected: (val) {
                          setModalState(() => _selectedPriority = pr);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // Call Outcome
                  const Text('Call Outcome / Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: ['All', 'Connected', 'No Answer', 'Busy', 'Follow-up', 'New Lead'].map((oc) {
                      final sel = _selectedOutcome == oc;
                      return ChoiceChip(
                        label: Text(oc),
                        selected: sel,
                        selectedColor: const Color(0xFFEFF6FF),
                        labelStyle: TextStyle(color: sel ? const Color(0xFF2563EB) : const Color(0xFF475569), fontWeight: FontWeight.w700),
                        onSelected: (val) {
                          setModalState(() => _selectedOutcome = oc);
                        },
                      );
                    }).toList(),
                  ),
                  const Spacer(),

                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            setModalState(() {
                              _selectedPriority = 'All';
                              _selectedOutcome = 'All';
                            });
                            setState(() {
                              _selectedPriority = 'All';
                              _selectedOutcome = 'All';
                              _applyLocalFilters();
                            });
                            Navigator.pop(ctx);
                          },
                          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                          child: const Text('Reset', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _applyLocalFilters();
                            });
                            Navigator.pop(ctx);
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), padding: const EdgeInsets.symmetric(vertical: 14)),
                          child: const Text('Apply', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
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
                    if (!_isSearching)
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
                      )
                    else
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: TextField(
                            autofocus: true,
                            onChanged: (val) {
                              _searchQuery = val;
                              _applyLocalFilters();
                            },
                            decoration: const InputDecoration(
                              hintText: 'Search activity, lead name, remarks...',
                              hintStyle: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                              border: InputBorder.none,
                              prefixIcon: Icon(Icons.search_rounded, size: 20, color: Color(0xFF94A3B8)),
                              contentPadding: EdgeInsets.symmetric(vertical: 10),
                            ),
                          ),
                        ),
                      ),

                    Row(
                      children: [
                        IconButton(
                          icon: Icon(_isSearching ? Icons.close_rounded : Icons.search_rounded, color: const Color(0xFF0F172A), size: 24),
                          onPressed: () {
                            setState(() {
                              _isSearching = !_isSearching;
                              if (!_isSearching) {
                                _searchQuery = '';
                                _applyLocalFilters();
                              }
                            });
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.tune_rounded, color: Color(0xFF0F172A), size: 22),
                          onPressed: _openFilterBottomSheet,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),

              // Active Date Filter Badge if selected
              if (_selectedDate != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 4.0),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Date: ${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                            ),
                            const SizedBox(width: 4),
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _selectedDate = null;
                                  _applyLocalFilters();
                                });
                              },
                              child: const Icon(Icons.cancel_rounded, size: 16, color: Color(0xFF2563EB)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

              // 2. Filter Pills Row (All, Calls, Follow-ups, Status Updates, Remarks)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  children: [
                    _buildFilterPill('All', _allCount > 0 ? _allCount : _rawActivities.length, 'all'),
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
              const SizedBox(height: 14),

              // 3. Activity Timeline List
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
                    : _displayActivities.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(Icons.history_rounded, size: 48, color: Color(0xFFCBD5E1)),
                                SizedBox(height: 10),
                                Text(
                                  'No activities found matching filters',
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 8.0),
                            itemCount: _displayActivities.length,
                            itemBuilder: (context, index) {
                              final item = _displayActivities[index];
                              final showDateHeader = index == 0 || item['date_group'] != _displayActivities[index - 1]['date_group'];

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
                                    isLast: index == _displayActivities.length - 1,
                                  ),
                                ],
                              );
                            },
                          ),
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
          InkWell(
            onTap: _pickDate,
            borderRadius: BorderRadius.circular(10),
            child: Container(
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
    } else if (lowerOutcome.contains('remark') || type == 'followup') {
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
                    // Top Header Row: Icon, Avatar, Lead Name & Company, Chevron Arrow
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
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
                          radius: 14,
                          backgroundColor: iconBg.withOpacity(0.8),
                          child: Text(_getInitials(name), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: iconColor)),
                        ),
                        const SizedBox(width: 10),

                        // Lead Name & Company (Fully Expanded without being squished)
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (company.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  company,
                                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(Icons.chevron_right_rounded, color: Color(0xFFCBD5E1), size: 20),
                      ],
                    ),

                    // Badges Row: Outcome Status Badge + Priority Tag Pill
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        // Outcome Status Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: outcomeBg,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            outcome,
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: outcomeColor),
                          ),
                        ),

                        // Priority Tag
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: priority.toLowerCase().contains('high')
                                ? const Color(0xFFDBEAFE)
                                : (priority.toLowerCase().contains('medium') ? const Color(0xFFFEF3C7) : const Color(0xFFEFF6FF)),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '$priority Priority',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: priority.toLowerCase().contains('high')
                                  ? const Color(0xFF1D4ED8)
                                  : (priority.toLowerCase().contains('medium') ? const Color(0xFFD97706) : const Color(0xFF2563EB)),
                            ),
                          ),
                        ),
                      ],
                    ),

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
                            'Follow-up: $followup',
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
